import { color, icon, motion, outline, type Painter, primitive as p, type TeamId, team } from '@ot/design';
import type { GameEvent, World } from '@ot/sim';
import type { Settings } from './settings';

type Cue =
  | 'send'
  | 'arrive'
  | 'capture'
  | 'lose'
  | 'skill_deadline'
  | 'skill_coffee'
  | 'countdown'
  | 'win'
  | 'lose_match'
  | 'click';
type Burst = { tower: number; team: TeamId; start: number; lost: boolean };

/** Presentation consumes confirmed sim events, never predicts success or writes game state. */
export class MatchFeedback {
  readonly sent = new Map<number, number>();
  readonly arrived = new Map<number, number>();
  private bursts: Burst[] = [];
  private skill: { name: 'skillDeadline' | 'skillCoffee'; start: number } | null = null;

  constructor(
    private world: World,
    private play: (cue: Cue) => void,
    private shake: () => void,
  ) {}

  consume(events: GameEvent[], now: number, settings: Settings, owned: Set<number>) {
    const cues = new Set<Cue>();
    for (const event of events) {
      if (event.t === 'squadSpawned') {
        this.sent.set(event.from, now);
        if (event.owner === 0) cues.add('send');
      } else if (event.t === 'squadArrived') {
        this.arrived.set(event.to, now);
        if (event.owner === 0 || owned.has(event.to)) cues.add('arrive');
      } else if (event.t === 'captured') {
        this.bursts.push({
          tower: event.tower,
          team: `p${event.to + 1}` as TeamId,
          start: now,
          lost: event.from === 0,
        });
        if (event.to === 0) {
          cues.add('capture');
          if (settings.screenShake && !settings.reducedMotion) this.shake();
        }
        if (event.from === 0) cues.add('lose');
      } else if (event.t === 'skillUsed' && event.player === 0) {
        cues.add(event.skill === 'deadline' ? 'skill_deadline' : 'skill_coffee');
        this.skill = { name: event.skill === 'deadline' ? 'skillDeadline' : 'skillCoffee', start: now };
      } else if (event.t === 'upgraded' && owned.has(event.tower)) {
        this.arrived.set(event.tower, now);
        cues.add('click');
      } else if (event.t === 'matchEnded') {
        cues.add(event.result.winner === 0 ? 'win' : 'lose_match');
      }
    }
    // Captures/losses replace the arrival tick so the important cue is audible.
    if (cues.has('capture') || cues.has('lose')) cues.delete('arrive');
    for (const cue of cues) this.play(cue);
  }

  draw(g: Painter, now: number, settings: Settings) {
    this.bursts = this.bursts.filter((b) => now - b.start < motion.slow);
    for (const [tower, start] of this.sent) if (now - start >= motion.base) this.sent.delete(tower);
    for (const [tower, start] of this.arrived) if (now - start >= motion.fast) this.arrived.delete(tower);
    for (const burst of this.bursts) {
      const [x, y, w, h] = this.world.map.towers[burst.tower]?.rect ?? [0, 0, 0, 0];
      const phase = Math.floor((now - burst.start) / motion.fast);
      if (burst.lost) {
        if (settings.reducedMotion || phase % 2 === 0) outline(g, x - 2, y - 2, w + 4, h + 4, color.danger, 2);
      } else if (settings.reducedMotion) {
        outline(g, x - 2, y - 2, w + 4, h + 4, team[burst.team].main);
      }
      if (!settings.reducedMotion) {
        for (const [dx, dy] of [
          [-1, -1],
          [0, -1],
          [1, -1],
          [-1, 0],
          [1, 0],
          [-1, 1],
          [0, 1],
          [1, 1],
        ]) {
          const px = x + w - 16 + (dx ?? 0) * (4 + phase * 4);
          const py = y + (dy ?? 0) * (4 + phase * 4);
          if (!g.sprite?.(`particle_${burst.team}`, px, py)) g.rect(px, py, 2, 2, team[burst.team].main);
        }
      }
    }
    if (this.skill && now - this.skill.start < motion.slow) {
      g.rect(307, 166, 26, 26, p.white);
      outline(g, 307, 166, 26, 26, color.accent);
      icon(g, this.skill.name, 312, 171);
    }
  }
}
