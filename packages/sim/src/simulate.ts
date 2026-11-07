import { type Bot, type BotLevel, botThink, createBot } from './bot/bot';
import { createMatch, step } from './rules';
import type { Command, GameEvent, GameState, PlayerId, SeatKind, World } from './types';

export type SeatSetup = { kind: 'empty' } | { kind: 'human' } | { kind: 'bot'; level: BotLevel };

/** Offline match host: owns the state, asks bots for commands, steps the sim. Used by the client and by tests. */
export class LocalMatch {
  readonly state: GameState;
  readonly bots: Bot[];
  private pending: Command[] = [];

  constructor(
    readonly world: World,
    seats: readonly SeatSetup[],
    seed: number,
  ) {
    this.state = createMatch(
      world,
      seats.map((x) => x.kind as SeatKind),
      seed,
    );
    this.bots = seats.flatMap((x, i) => (x.kind === 'bot' ? [createBot(i as PlayerId, x.level, seed)] : []));
  }

  /** Queue a human command for the next tick. */
  submit(cmd: Command): void {
    this.pending.push(cmd);
  }

  tick(): GameEvent[] {
    const cmds = this.pending;
    this.pending = [];
    for (const b of this.bots) cmds.push(...botThink(this.world, this.state, b));
    return step(this.world, this.state, cmds);
  }

  get ended(): boolean {
    return this.state.result !== null;
  }
}

/** Run a bots-only match to completion. */
export function runBotMatch(world: World, levels: readonly (BotLevel | null)[], seed: number): GameState {
  const m = new LocalMatch(
    world,
    levels.map((l) => (l ? { kind: 'bot', level: l } : { kind: 'empty' })),
    seed,
  );
  while (!m.ended) m.tick();
  return m.state;
}
