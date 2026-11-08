import { type Bot, type BotLevel, type BotProfileName, botThink, createBot } from './bot/bot';
import { createMatch, step } from './rules';
import type { Command, GameEvent, GameState, PlayerId, SeatKind, World } from './types';

export type SeatSetup = { kind: 'empty' } | { kind: 'human' } | { kind: 'bot'; level: BotLevel | BotProfileName };

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
    const humans = seats.flatMap((x, i) => (x.kind === 'human' ? [i as PlayerId] : []));
    this.bots = seats.flatMap((x, i) => (x.kind === 'bot' ? [createBot(i as PlayerId, x.level, seed, humans)] : []));
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

/**
 * Run a bots-only match to completion. Seats listed in `asHuman` are still played by bots (e.g. a `novice`
 * stand-in) but the other bots treat them as human, so the start-of-match grace period applies.
 */
export function runBotMatch(
  world: World,
  levels: readonly (BotProfileName | null)[],
  seed: number,
  asHuman: readonly PlayerId[] = [],
): GameState {
  const m = new LocalMatch(
    world,
    levels.map((l) => (l ? { kind: 'bot', level: l } : { kind: 'empty' })),
    seed,
  );
  for (const b of m.bots) b.humans = asHuman.filter((h) => h !== b.player);
  while (!m.ended) m.tick();
  return m.state;
}
