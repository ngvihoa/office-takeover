import {
  color,
  corridor,
  countPlate,
  dashedOutline,
  flag,
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
  buildWorld,
  type Command,
  LocalMatch,
  MAPS,
  type MapDef,
  SEND_PCTS,
  type SendPct,
  type SkillId,
  TICKS_PER_SECOND,
  validate,
} from '@ot/sim';
import Phaser from 'phaser';
import { logicalPoint, newMatchSeed, wheelRatio } from '../game/controls';
import { canvasPainter } from '../game/painter';

const TEAMS: TeamId[] = ['p1', 'p2', 'p3', 'p4'];
const NAMES = ['Bạn', 'Bot An', 'Bot Bình', 'Bot Chi'];
const world = buildWorld(MAPS['office-01'] as MapDef);
const tickMs = 1000 / TICKS_PER_SECOND;

export class GameScene extends Phaser.Scene {
  private match!: LocalMatch;
  private selected = new Set<number>();
  private pct: SendPct = 50;
  private aiming: SkillId | null = null;
  private paused = false;
  private elapsed = 0;
  private dragging = false;
  private origin: [number, number] | null = null;
  private lastClick = { id: -1, time: -1000 };
  private texture!: Phaser.Textures.CanvasTexture;
  private background!: HTMLCanvasElement;
  private g!: Painter;
  private renderScale = 1;
  private status = 'Kéo từ phòng của bạn đến phòng khác để điều nhân viên.';
  private roomCache = '';

  constructor() {
    super('Game');
  }

  private point(pointer: Phaser.Input.Pointer) {
    return logicalPoint(pointer.x, pointer.y, this.renderScale);
  }

  create() {
    this.match = new LocalMatch(
      world,
      [
        { kind: 'human' },
        { kind: 'bot', level: 'easy' },
        { kind: 'bot', level: 'normal' },
        { kind: 'bot', level: 'easy' },
      ],
      newMatchSeed(this.match?.state.seed),
    );
    this.selected.clear();
    this.paused = false;
    this.elapsed = 0;
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
    this.g = canvasPainter(this.texture.context, this.renderScale);
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
      this.g = canvasPainter(this.texture.context, scale);
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
      if (!this.paused && !this.match.ended) this.pct = wheelRatio(this.pct, dy);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.key(event));
    const blur = () => {
      if (!this.match.ended) {
        this.paused = true;
        this.elapsed = 0;
        this.origin = null;
      }
    };
    window.addEventListener('blur', blur);
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', blur);
      this.textures.remove('match');
    });
  }

  private hit(x: number, y: number) {
    return world.map.towers.find(
      (t) => x >= t.rect[0] && y >= t.rect[1] && x < t.rect[0] + t.rect[2] && y < t.rect[1] + t.rect[3],
    )?.id;
  }

  private submit(command: Command) {
    if (!validate(world, this.match.state, command)) {
      this.status = 'Chưa thể thực hiện. Kiểm tra nhân viên hoặc thời gian hồi.';
      return;
    }
    this.match.submit(command);
    this.status =
      command.t === 'send'
        ? 'Đã điều nhân viên theo hành lang.'
        : command.t === 'upgrade'
          ? 'Đã yêu cầu mở rộng phòng.'
          : 'Đã dùng kỹ năng.';
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
    const { x, y } = this.point(pointer);
    if (this.match.ended) {
      if (x >= 240 && x <= 400 && y >= 252 && y <= 280) this.scene.restart();
      return;
    }
    if (this.paused) {
      if (x >= 240 && x <= 400 && y >= 190 && y <= 218) {
        this.paused = false;
        this.elapsed = 0;
      }
      return;
    }
    if (y < 20 && x > 540 && x < 580) {
      this.paused = true;
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
        this.paused = !this.paused;
        this.elapsed = 0;
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
    if (!this.paused && !this.match.ended) {
      this.elapsed += Math.min(delta, 250);
      while (this.elapsed >= tickMs && !this.match.ended) {
        this.match.tick();
        this.elapsed -= tickMs;
      }
    }
    const state = this.match.state;
    for (const id of this.selected) if (state.towers[id]?.owner !== 0) this.selected.delete(id);
    const key = state.towers.map((t) => `${t.owner}:${t.level}`).join(',');
    if (key !== this.roomCache) {
      const ctx = this.background.getContext('2d') as CanvasRenderingContext2D;
      const g = canvasPainter(ctx, this.renderScale);
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
        flag(g, tower.owner === null ? 'neutral' : (TEAMS[tower.owner] as TeamId), def.rect[0] + 5, def.rect[1] + 15);
      }
      this.roomCache = key;
    }
    this.texture.context.drawImage(this.background, 0, 0);
    const g = this.g;
    const pointer = this.input.activePointer;
    const target = this.hit(this.point(pointer).x, this.point(pointer).y);
    for (const t of state.towers) {
      const def = world.map.towers[t.id];
      if (!def) continue;
      const [x, y, w, h] = def.rect;
      const tid = t.owner === null ? 'neutral' : (TEAMS[t.owner] as TeamId);
      if (this.selected.has(t.id))
        dashedOutline(g, x - 3, y - 3, w + 6, h + 6, team[tid].main, Math.floor(this.time.now / 160) % 4);
      if (target === t.id && t.owner === 0) outline(g, x + 3, y + 12, w - 6, h - 15, p.white);
      if (target === t.id && this.dragging) outline(g, x - 2, y - 2, w + 4, h + 4, color.accent);
      countPlate(g, x + w - 4, y - 5, t.troops, tid, {
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
      for (let i = 1; i < route.points.length; i++) {
        const next = route.points[i] as [number, number];
        const len = Math.abs(next[0] - point[0]) + Math.abs(next[1] - point[1]);
        if (distance <= len) {
          point = [
            Math.round(point[0] + Math.sign(next[0] - point[0]) * distance),
            Math.round(point[1] + Math.sign(next[1] - point[1]) * distance),
          ];
          break;
        }
        distance -= len;
        point = next;
      }
      squad(g, ...point, TEAMS[s.owner] as TeamId, s.count, Math.floor(this.time.now / 160) % 2);
    }
    g.rect(0, 0, 640, 20, p.gray100);
    g.rect(0, 340, 640, 20, p.gray100);
    state.players.forEach((player, i) => {
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
    g.text(68, 353, this.aiming ? 'Chọn phòng để uống cà phê' : 'Q Deadline · W Coffee Break', {
      size: 11,
      color: p.ink,
    });
    sendMeter(g, 288, 343, this.pct);
    g.text(466, 353, 'Mở rộng E', { size: 11, color: p.ink });
    g.text(548, 353, 'Chọn hết', { size: 11, color: p.ink });
    if (this.paused || state.result) this.overlay();
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
      g.text(320, 248, 'Esc để tiếp tục · Cuộn hoặc 1–4 đổi tỉ lệ', { size: 11, color: p.ink, align: 'center' });
    }
  }
}
