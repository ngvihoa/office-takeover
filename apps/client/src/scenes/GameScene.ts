import {
  color,
  corridor,
  countPlate,
  dashedOutline,
  flag,
  graceNotice,
  homeRoomMarker,
  introCountdown,
  map as mapTokens,
  notchedBox,
  outline,
  type Painter,
  primitive as p,
  path,
  playerChip,
  type RoomView,
  room,
  scaleFor,
  sendMeter,
  skillButton,
  squad,
  type TeamId,
  team,
  timerChip,
} from '@ot/design';
import {
  type Command,
  HUMAN_GRACE_TICKS,
  LocalMatch,
  SEND_PCTS,
  type SeatSetup,
  type SendPct,
  type SkillId,
  TICKS_PER_SECOND,
  validate,
} from '@ot/sim';
import Phaser from 'phaser';
import { logicalPoint, newMatchSeed, wheelRatio } from '../game/controls';
import { MatchFeedback } from '../game/feedback';
import { canvasPainter } from '../game/painter';
import { DEFAULT_BOTS, matchLayout, type OfflineOptions, PLAYER_NAMES } from '../game/session';
import { readSettings, type Settings, saveSettings, toggleMute } from '../game/settings';
import { MatchTelemetry } from '../game/telemetry';

import type { RemoteMatch } from '../net/remoteMatch';

const TEAMS: TeamId[] = ['p1', 'p2', 'p3', 'p4'];
const NAMES = PLAYER_NAMES;
const tickMs = 1000 / TICKS_PER_SECOND;

export class GameScene extends Phaser.Scene {
  private match!: LocalMatch | RemoteMatch;
  private layout!: ReturnType<typeof matchLayout>;
  private selected = new Set<number>();
  private pct: SendPct = 50;
  private aiming: SkillId | null = null;
  private paused = false;
  private elapsed = 0;
  private introMs = 0;
  private startFlashMs = 0;
  private dragging = false;
  private origin: [number, number] | null = null;
  private lastClick = { id: -1, time: -1000 };
  private texture!: Phaser.Textures.CanvasTexture;
  private background!: HTMLCanvasElement;
  private g!: Painter;
  private renderScale = 1;
  private status = 'Kéo từ phòng của bạn đến phòng khác để điều nhân viên.';
  private roomCache = '';
  private settings: Settings = readSettings();
  private feedback!: MatchFeedback;
  private lastSound = new Map<string, number>();
  private cursors: Record<string, string> = {};
  private sent = [0, 0, 0, 0];
  private captured = [0, 0, 0, 0];
  private commands = 0;
  private telemetry?: MatchTelemetry;

  constructor(private options: OfflineOptions = {}) {
    super('Game');
  }

  private point(pointer: Phaser.Input.Pointer) {
    return logicalPoint(pointer.x, pointer.y, this.renderScale);
  }

  preload() {
    this.load.once('loaderror', () => this.options.onLoadError?.());
    if (!this.textures.exists('office')) this.load.atlas('office', '/art/atlas.png', '/art/atlas.json');
    if (!this.cache.audio.exists('sfx'))
      this.load.audioSprite('sfx', '/art/sfx.json', ['/art/sfx.ogg', '/art/sfx.m4a']);
  }

  create() {
    const benchmark = this.options.benchmark ?? false;
    this.settings = readSettings();
    this.pct = this.settings.sendPct;
    this.sound.volume = this.settings.volume / 100;
    this.lastSound.clear();
    for (const name of ['default', 'drag', 'target', 'no', 'pointer']) {
      const hotspot = name === 'default' ? '0 0' : name === 'pointer' ? '4 0' : '5 5';
      this.cursors[name] = `url(${this.textures.getBase64('office', `cursor_${name}`)}) ${hotspot}, auto`;
    }
    if (this.options.remoteMatch) {
      this.match = this.options.remoteMatch;
      const seed = this.match.state.seed;
      this.layout = matchLayout(seed);
    } else {
      const seed = benchmark ? 7 : newMatchSeed(this.match?.state.seed);
      this.layout = matchLayout(seed, benchmark);
      this.match = new LocalMatch(
        this.layout.world,
        [
          benchmark ? { kind: 'bot', level: 'normal' } : { kind: 'human' },
          ...(benchmark ? DEFAULT_BOTS : (this.options.bots ?? DEFAULT_BOTS)).map(
            (level): SeatSetup => (level ? { kind: 'bot', level } : { kind: 'empty' }),
          ),
        ],
        seed,
      );
    }
    this.feedback = new MatchFeedback(this.layout.world, (cue) => this.play(cue));
    this.selected.clear();
    this.sent.fill(0);
    this.captured.fill(0);
    this.commands = 0;
    this.paused = false;
    this.elapsed = 0;
    this.introMs = benchmark ? 0 : 3000;
    this.startFlashMs = 0;
    this.aiming = null;
    this.origin = null;
    this.dragging = false;
    this.lastClick = { id: -1, time: -1000 };
    this.renderScale = scaleFor(window.innerWidth, window.innerHeight);
    this.texture = this.textures.createCanvas(
      'match',
      640 * this.renderScale,
      360 * this.renderScale,
    ) as Phaser.Textures.CanvasTexture;
    this.g = canvasPainter(this.texture.context, this.renderScale, this.textures.get('office'));
    const surface = this.add
      .image(0, 0, 'match')
      .setOrigin(0)
      .setDisplaySize(640 * this.renderScale, 360 * this.renderScale);
    this.background = document.createElement('canvas');
    this.background.width = this.texture.width;
    this.background.height = this.texture.height;
    this.roomCache = '';
    const resize = () => {
      const scale = scaleFor(window.innerWidth, window.innerHeight);
      if (scale === this.renderScale) return;
      this.renderScale = scale;
      this.texture.setSize(640 * scale, 360 * scale);
      surface.setDisplaySize(640 * this.renderScale, 360 * this.renderScale);
      this.background.width = 640 * scale;
      this.background.height = 360 * scale;
      this.g = canvasPainter(this.texture.context, scale, this.textures.get('office'));
      this.roomCache = '';
    };
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.down, this);
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.up, this);
    this.input.on('pointerupoutside', () => {
      this.origin = null;
      this.dragging = false;
    });
    this.input.on('wheel', (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      if (!this.introMs && !this.paused && !this.match.ended) this.pct = wheelRatio(this.pct, dy);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.key(event));
    const resume = () => {
      this.paused = false;
      this.elapsed = 0;
    };
    const changeSettings = (settings: Settings) => {
      this.settings = { ...settings };
      this.sound.volume = settings.volume / 100;
      if (settings.volume === 0) this.sound.removeByKey('sfx');
      this.roomCache = '';
    };
    this.game.events.on('resume-match', resume);
    this.game.events.on('settings-change', changeSettings);
    const blur = () => this.pauseMatch();
    window.addEventListener('blur', blur);
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', blur);
      this.game.events.off('resume-match', resume);
      this.game.events.off('settings-change', changeSettings);
      this.sound.removeByKey('sfx');
      this.textures.remove('match');
    });
    this.telemetry = new MatchTelemetry({
      bots: benchmark ? DEFAULT_BOTS : (this.options.bots ?? DEFAULT_BOTS),
      startRoom: this.layout.startRoom.id,
      controlled: benchmark,
      settings: () => this.settings,
      state: () => ({
        matchTicks: this.match.state.tick,
        humanCommands: this.commands,
        humanCaptured: benchmark ? 0 : (this.captured[0] ?? 0),
      }),
      cpuP95: () => this.registry.get('cpuP95')?.() ?? null,
    });
    this.registry.set('telemetry', this.telemetry);
    const sample = () =>
      this.telemetry?.frame(
        performance.now(),
        !this.introMs && !this.paused && !this.match.ended,
        this.match.state.squads.length,
      );
    this.game.events.on('prestep', sample);
    const stopTelemetry = () => {
      this.telemetry?.finish('left');
      this.game.events.off('prestep', sample);
      this.registry.remove('telemetry');
      this.events.off('shutdown', stopTelemetry);
      this.events.off('destroy', stopTelemetry);
    };
    this.events.once('shutdown', stopTelemetry);
    this.events.once('destroy', stopTelemetry);
    if (!benchmark) this.play('countdown');
    this.options.onReady?.();
  }

  private finishIntro() {
    this.introMs = 0;
    this.startFlashMs = 650;
    this.elapsed = 0;
    this.origin = null;
    this.dragging = false;
    this.selected.clear();
    this.aiming = null;
    this.play('countdown');
  }

  private pauseMatch() {
    if (this.paused || this.match.ended) return;
    this.paused = true;
    this.telemetry?.frame(performance.now(), false, 0);
    this.elapsed = 0;
    this.origin = null;
    this.dragging = false;
    this.aiming = null;
    this.options.onPause?.();
  }

  private hit(x: number, y: number) {
    return this.layout.world.map.towers.find(
      (t) => x >= t.rect[0] && y >= t.rect[1] && x < t.rect[0] + t.rect[2] && y < t.rect[1] + t.rect[3],
    )?.id;
  }

  private submit(command: Command) {
    if (this.options.benchmark || this.introMs) return;
    if (!validate(this.layout.world, this.match.state, command)) {
      this.status = 'Chưa thể thực hiện. Kiểm tra nhân viên hoặc thời gian hồi.';
      return;
    }
    this.match.submit(command);
    this.commands++;
    this.status =
      command.t === 'send'
        ? 'Đã điều nhân viên theo hành lang.'
        : command.t === 'upgrade'
          ? 'Đã yêu cầu mở rộng phòng.'
          : 'Đã dùng kỹ năng.';
  }

  private play(cue: string) {
    if (this.sound.locked || !this.cache.audio.exists('sfx') || this.settings.volume === 0) return;
    if (this.time.now - (this.lastSound.get(cue) ?? -1000) < 80) return;
    this.lastSound.set(cue, this.time.now);
    this.sound.playAudioSprite('sfx', cue);
  }

  private toggleSound() {
    this.settings = toggleMute(this.settings);
    this.sound.volume = this.settings.volume / 100;
    if (!this.settings.volume) this.sound.removeByKey('sfx');
    saveSettings(this.settings);
    this.options.onSettings?.({ ...this.settings });
    this.play('click');
  }

  private skill(skill: SkillId) {
    if (skill === 'deadline') {
      this.submit({ t: 'skill', player: 0, skill });
      this.aiming = null;
    } else {
      this.aiming = this.aiming === skill ? null : skill;
      this.status = 'Coffee Break: chọn một phòng của bạn.';
    }
  }

  private down(pointer: Phaser.Input.Pointer) {
    if ((this.paused && this.options.onPause) || (this.match.ended && this.options.onEnd)) return;
    if (this.introMs) {
      this.finishIntro();
      return;
    }
    const { x, y } = this.point(pointer);
    if (y < 20 && x >= 466 && x < 536) {
      this.toggleSound();
      return;
    }
    if (this.match.ended) {
      if (x >= 240 && x <= 400 && y >= 252 && y <= 280) this.scene.restart();
      return;
    }
    if (this.paused) {
      if (x >= 240 && x <= 400 && y >= 190 && y <= 218) {
        this.paused = false;
        this.elapsed = 0;
      }
      if (x >= 200 && x <= 440 && y >= 222 && y <= 240) {
        this.settings.reducedMotion = !this.settings.reducedMotion;
        saveSettings(this.settings);
      }
      return;
    }
    if (y < 20 && x > 540 && x < 580) {
      this.pauseMatch();
      return;
    }
    if (y >= 340) {
      if (x < 32) this.skill('deadline');
      else if (x < 60) this.skill('coffee');
      else if (x >= 280 && x < 400) this.pct = SEND_PCTS[(SEND_PCTS.indexOf(this.pct) + 1) % 4] as SendPct;
      else if (x >= 466 && x < 540) this.upgrade();
      else if (x >= 540) this.selected = new Set(this.match.state.towers.filter((t) => t.owner === 0).map((t) => t.id));
      return;
    }
    const id = this.hit(x, y);
    if (pointer.rightButtonDown()) {
      if (this.aiming) this.aiming = null;
      else if (id !== undefined) this.submit({ t: 'send', player: 0, from: [...this.selected], to: id, pct: this.pct });
      return;
    }
    if (this.aiming) {
      if (id !== undefined) {
        this.submit({ t: 'skill', player: 0, skill: this.aiming, target: id });
        this.aiming = null;
      }
      return;
    }
    if (id === undefined || this.match.state.towers[id]?.owner !== 0) {
      this.selected.clear();
      return;
    }
    const ctrl = pointer.event.ctrlKey;
    if (!ctrl) this.selected.clear();
    if (ctrl && this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    if (this.time.now - this.lastClick.time < 300 && this.lastClick.id === id)
      this.submit({ t: 'upgrade', player: 0, tower: id });
    this.lastClick = { id, time: this.time.now };
    this.origin = [x, y];
    this.dragging = false;
  }

  private move(pointer: Phaser.Input.Pointer) {
    if (!this.origin || this.paused || this.match.ended) return;
    const { x, y } = this.point(pointer);
    if (Math.hypot(x - this.origin[0], y - this.origin[1]) >= 6) this.dragging = true;
    if (this.dragging) {
      const id = this.hit(this.point(pointer).x, this.point(pointer).y);
      if (id !== undefined && this.match.state.towers[id]?.owner === 0) this.selected.add(id);
    }
  }

  private up(pointer: Phaser.Input.Pointer) {
    if (this.origin && this.dragging && !this.paused && !this.match.ended) {
      const id = this.hit(this.point(pointer).x, this.point(pointer).y);
      if (id !== undefined)
        this.submit({ t: 'send', player: 0, from: [...this.selected].filter((n) => n !== id), to: id, pct: this.pct });
    }
    this.origin = null;
    this.dragging = false;
  }

  private upgrade() {
    for (const tower of this.selected) this.submit({ t: 'upgrade', player: 0, tower });
  }

  private key(event: KeyboardEvent) {
    if ((this.paused && this.options.onPause) || (this.match.ended && this.options.onEnd)) return;
    if (this.introMs) {
      event.preventDefault();
      if (!event.repeat && ['Space', 'Enter'].includes(event.code)) this.finishIntro();
      return;
    }
    if (['Space', 'Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyW', 'KeyE'].includes(event.code))
      event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'Escape') {
      if (this.aiming || this.origin) {
        this.aiming = null;
        this.origin = null;
        this.dragging = false;
      } else if (this.selected.size) this.selected.clear();
      else {
        if (this.paused) {
          this.paused = false;
          this.elapsed = 0;
        } else this.pauseMatch();
      }
      return;
    }
    if (this.paused || this.match.ended) return;
    const n = Number(event.key);
    if (n >= 1 && n <= 4) this.pct = SEND_PCTS[n - 1] as SendPct;
    if (event.code === 'Space')
      this.selected = new Set(this.match.state.towers.filter((t) => t.owner === 0).map((t) => t.id));
    if (event.code === 'KeyE') this.upgrade();
    if (event.code === 'KeyQ') this.skill('deadline');
    if (event.code === 'KeyW') this.skill('coffee');
  }

  update(_time: number, delta: number) {
    if (!this.texture) return;
    const { world, startRoom, order } = this.layout;
    const introducing = this.introMs > 0;
    if (!this.paused && introducing) {
      const previous = Math.ceil(this.introMs / 1000);
      this.introMs = Math.max(0, this.introMs - delta);
      if (!this.introMs) this.finishIntro();
      else if (Math.ceil(this.introMs / 1000) !== previous) this.play('countdown');
    } else if (!this.paused) this.startFlashMs = Math.max(0, this.startFlashMs - delta);
    if (!introducing && !this.paused && !this.match.ended) {
      this.elapsed += Math.min(delta, 250);
      while (this.elapsed >= tickMs && !this.match.ended) {
        const owned = new Set(this.match.state.towers.filter((t) => t.owner === 0).map((t) => t.id));
        const events = this.match.tick();
        this.feedback.consume(events, this.time.now, owned);
        for (const event of events) {
          if (event.t === 'squadSpawned') this.sent[event.owner] = (this.sent[event.owner] ?? 0) + event.count;
          if (event.t === 'captured') this.captured[event.to] = (this.captured[event.to] ?? 0) + 1;
          if (event.t === 'matchEnded') {
            this.telemetry?.finish(
              event.result.reason === 'last-standing' ? 'elimination' : 'timeout',
              this.options.benchmark ? null : event.result.ranking.indexOf(0) + 1,
            );
            this.options.onEnd?.({
              seed: this.match.state.seed,
              seatOrder: [...order],
              startRoom: startRoom.id,
              bots: [...(this.options.benchmark ? DEFAULT_BOTS : (this.options.bots ?? DEFAULT_BOTS))],
              result: event.result,
              players: event.result.ranking.map((id) => ({
                id,
                name: NAMES[id],
                rooms: this.match.state.towers.filter((t) => t.owner === id).length,
                sent: this.sent[id] ?? 0,
                captured: this.captured[id] ?? 0,
              })),
            });
          }
        }
        const remaining = world.config.matchTicks - this.match.state.tick;
        if (remaining > 0 && remaining <= 100 && remaining % TICKS_PER_SECOND === 0) this.play('countdown');
        this.elapsed -= tickMs;
      }
    }
    const state = this.match.state;
    this.registry.set('squads', state.squads.length);
    this.registry.set('matchActive', !this.introMs && !this.paused && !this.match.ended);
    for (const id of this.selected) if (state.towers[id]?.owner !== 0) this.selected.delete(id);
    const key = state.towers.map((t) => `${t.owner}:${t.level}`).join(',');
    if (key !== this.roomCache) {
      const ctx = this.background.getContext('2d') as CanvasRenderingContext2D;
      const g = canvasPainter(ctx, this.renderScale, this.textures.get('office'));
      corridor(g, world.map.building);
      for (const def of world.map.towers) {
        const tower = state.towers[def.id];
        if (!tower) continue;
        room(g, {
          name: def.name,
          rect: def.rect,
          doors: def.doors.map((d) => d.side).join(''),
          team: tower.owner === null ? 'neutral' : (TEAMS[tower.owner] as TeamId),
          troops: 0,
          dept: def.dept as RoomView['dept'],
          level: tower.level,
        });
        if (this.settings.symbols)
          flag(g, tower.owner === null ? 'neutral' : (TEAMS[tower.owner] as TeamId), def.rect[0] + 5, def.rect[1] + 15);
      }
      this.roomCache = key;
    }
    this.texture.context.drawImage(this.background, 0, 0);
    const g = this.g;
    if (!this.settings.reducedMotion) {
      for (const id of this.feedback.sent.keys()) {
        const rect = world.map.towers[id]?.rect;
        if (!rect) continue;
        const [x, y, w, h] = rect;
        g.rect(x, y, w, h, mapTokens.corridor);
        const s = this.renderScale;
        this.texture.context.drawImage(
          this.background,
          x * s,
          y * s,
          w * s,
          h * s,
          (x + 1) * s,
          (y + 1) * s,
          (w - 2) * s,
          (h - 2) * s,
        );
      }
    }
    const pointer = this.input.activePointer;
    const target = this.hit(this.point(pointer).x, this.point(pointer).y);
    const cursor =
      this.paused || state.result
        ? 'pointer'
        : this.aiming
          ? target !== undefined && state.towers[target]?.owner === 0
            ? 'target'
            : 'no'
          : this.dragging
            ? target === undefined
              ? 'no'
              : 'drag'
            : 'default';
    this.game.canvas.style.cursor = this.cursors[cursor] ?? 'auto';
    for (const t of state.towers) {
      const def = world.map.towers[t.id];
      if (!def) continue;
      const [x, y, w, h] = def.rect;
      const tid = t.owner === null ? 'neutral' : (TEAMS[t.owner] as TeamId);
      if (t.id === startRoom.id && !this.options.benchmark && (this.introMs || state.tick < 10 * TICKS_PER_SECOND))
        homeRoomMarker(g, startRoom.rect, this.introMs > 0, 3000 - this.introMs, this.settings.reducedMotion);
      if (this.selected.has(t.id))
        dashedOutline(
          g,
          x - 3,
          y - 3,
          w + 6,
          h + 6,
          team[tid].main,
          this.settings.reducedMotion ? 0 : Math.floor(this.time.now / 160) % 4,
        );
      if (target === t.id && t.owner === 0) outline(g, x + 3, y + 12, w - 6, h - 15, p.white);
      if (target === t.id && this.dragging) outline(g, x - 2, y - 2, w + 4, h + 4, color.accent);
      const bounce = !this.settings.reducedMotion && this.feedback.arrived.has(t.id) ? 1 : 0;
      countPlate(g, x + w - 4, y - 5 - bounce, t.troops, tid, {
        underAttack: state.squads.some((s) => t.owner !== null && s.to === t.id && s.owner !== t.owner),
      });
    }
    if (this.dragging && target !== undefined) {
      let count = 0;
      for (const id of this.selected) {
        const route = world.paths[id]?.[target];
        if (route) {
          path(g, route.points, 'p1');
          count += Math.floor(((state.towers[id]?.troops ?? 0) * this.pct) / 100);
        }
      }
      g.text(
        Math.min(550, this.point(pointer).x + 8),
        Math.max(32, this.point(pointer).y - 8),
        `Điều ${count} nhân viên`,
        {
          size: 11,
          color: p.ink,
        },
      );
    }
    for (const s of state.squads) {
      const route = world.paths[s.from]?.[s.to];
      if (!route) continue;
      if (s.owner === 0 || state.towers[s.to]?.owner === 0) path(g, route.points, TEAMS[s.owner] as TeamId);
      const boost =
        state.tick < (state.players[s.owner]?.deadlineUntil ?? 0) ? world.config.deadline.speedMultiplier : 1;
      let distance = Math.max(0, s.traveled - world.config.squadSpeed * boost * (1 - this.elapsed / tickMs));
      let point = route.points[0] as [number, number];
      let direction = 'down';
      for (let i = 1; i < route.points.length; i++) {
        const next = route.points[i] as [number, number];
        const len = Math.abs(next[0] - point[0]) + Math.abs(next[1] - point[1]);
        if (distance <= len) {
          direction = next[0] > point[0] ? 'right' : next[0] < point[0] ? 'left' : next[1] < point[1] ? 'up' : 'down';
          point = [
            Math.round(point[0] + Math.sign(next[0] - point[0]) * distance),
            Math.round(point[1] + Math.sign(next[1] - point[1]) * distance),
          ];
          break;
        }
        distance -= len;
        point = next;
      }
      squad(
        g,
        ...point,
        TEAMS[s.owner] as TeamId,
        s.count,
        this.settings.reducedMotion ? 0 : Math.floor(this.time.now / 160) % 2,
        direction,
        this.settings.symbols,
      );
    }
    this.feedback.draw(g, this.time.now, this.settings);
    if (this.introMs) {
      for (const def of world.map.towers) {
        if (def.seat === null || def.seat === 0 || !state.players[def.seat]?.active) continue;
        const [x, y, w, h] = def.rect;
        notchedBox(g, x + Math.floor(w / 2) - 36, y + h - 19, 72, 15, color.surfacePanel);
        g.text(x + Math.floor(w / 2), y + h - 8, NAMES[def.seat], {
          size: 11,
          color: color.textPrimary,
          align: 'center',
        });
      }
    }
    if (this.introMs || this.startFlashMs) introCountdown(g, Math.ceil(this.introMs / 1000));
    g.rect(0, 0, 640, 20, p.gray100);
    g.rect(0, 340, 640, 20, p.gray100);
    state.players.forEach((player, i) => {
      if (!player.active) return;
      playerChip(
        g,
        6 + i * 112,
        3,
        106,
        TEAMS[i] as TeamId,
        NAMES[i] as string,
        state.towers.filter((t) => t.owner === i).length,
        { you: i === 0, eliminated: player.eliminatedAt !== null },
      );
    });
    notchedBox(g, 466, 3, 70, 14, p.white);
    g.text(501, 14, this.settings.volume ? 'Âm: bật' : 'Âm: tắt', { size: 11, color: p.ink, align: 'center' });
    g.text(546, 14, 'Menu', { size: 11, color: p.ink });
    timerChip(g, 582, 3, Math.max(0, Math.ceil((world.config.matchTicks - state.tick) / TICKS_PER_SECOND)));
    for (const [i, skill] of (['deadline', 'coffee'] as const).entries()) {
      const remaining = Math.max(0, (state.players[0]?.skillReadyAt[skill] ?? 0) - state.tick);
      skillButton(
        g,
        8 + i * 28,
        340,
        skill === 'deadline' ? 'skillDeadline' : 'skillCoffee',
        i === 0 ? 'Q' : 'W',
        remaining ? 'cooldown' : this.aiming === skill ? 'aiming' : 'ready',
        { secs: Math.ceil(remaining / TICKS_PER_SECOND), cooldownFrac: remaining / world.config[skill].cooldownTicks },
      );
    }
    const graceSeconds = this.options.benchmark
      ? 0
      : Math.max(0, Math.ceil((HUMAN_GRACE_TICKS - state.tick) / TICKS_PER_SECOND));
    if (graceSeconds) graceNotice(g, 68, 353, graceSeconds);
    else
      g.text(68, 353, this.aiming ? 'Chọn phòng để uống cà phê' : 'Q Deadline · W Coffee Break', {
        size: 11,
        color: p.ink,
      });
    sendMeter(g, 288, 343, this.pct);
    g.text(466, 353, 'Mở rộng E', { size: 11, color: p.ink });
    g.text(548, 353, 'Chọn hết', { size: 11, color: p.ink });
    if ((this.paused && !this.options.onPause) || (state.result && !this.options.onEnd)) this.overlay();
    this.game.canvas.setAttribute('role', 'img');
    this.game.canvas.setAttribute(
      'aria-label',
      this.introMs
        ? `Giới thiệu trận: ${Math.ceil(this.introMs / 1000)}. Phòng của bạn: ${startRoom.name}. Click hoặc Space/Enter để bỏ qua.`
        : `Trận đang chơi. Phòng xuất phát: ${startRoom.name}.`,
    );
    this.game.canvas.title = this.status;
    this.texture.refresh();
  }

  private overlay() {
    const g = this.g;
    notchedBox(g, 160, 94, 320, 194, p.white);
    g.text(320, 120, this.match.ended ? 'KẾT QUẢ' : 'TẠM DỪNG', { size: 18, color: p.ink, align: 'center' });
    if (this.match.state.result) {
      this.match.state.result.ranking.forEach((id, i) => {
        flag(g, TEAMS[id] as TeamId, 190, 135 + i * 25);
        g.text(
          210,
          144 + i * 25,
          `${i + 1}. ${NAMES[id]} · ${this.match.state.towers.filter((t) => t.owner === id).length} phòng`,
          { size: 13, color: p.ink },
        );
      });
      notchedBox(g, 240, 252, 160, 28, color.accent);
      g.text(320, 271, 'CHƠI LẠI', { size: 13, color: p.white, align: 'center' });
    } else {
      g.text(320, 150, 'Trận offline đã dừng thời gian.', { size: 13, color: p.ink, align: 'center' });
      notchedBox(g, 240, 190, 160, 28, color.accent);
      g.text(320, 209, 'TIẾP TỤC', { size: 13, color: p.white, align: 'center' });
      g.text(320, 235, `Giảm chuyển động: ${this.settings.reducedMotion ? 'bật' : 'tắt'}`, {
        size: 11,
        color: p.ink,
        align: 'center',
      });
      g.text(320, 248, 'Esc để tiếp tục · Cuộn hoặc 1–4 đổi tỉ lệ', { size: 11, color: p.ink, align: 'center' });
    }
  }
}
