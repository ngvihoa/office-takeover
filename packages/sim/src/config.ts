// Every rule number from docs/02-game-design.md lives here. Units: ticks (100 ms) and logical pixels.

export const TICKS_PER_SECOND = 10;

export interface Config {
  /** Match length for free-for-all (6 minutes). */
  matchTicks: number;
  /** Ticks between +1 troop, indexed by level - 1. */
  productionInterval: readonly [number, number, number];
  /** Production stops at this many troops, indexed by level - 1. */
  capacity: readonly [number, number, number];
  /** Troop cost to go from level n to n + 1, indexed by current level - 1. */
  upgradeCost: readonly [number, number];
  /** Squad speed along corridors, px per tick. */
  squadSpeed: number;
  /** Ticks before skills can be used for the first time. */
  skillWarmup: number;
  deadline: { durationTicks: number; cooldownTicks: number; speedMultiplier: number };
  coffee: { troops: number; cooldownTicks: number };
}

export const DEFAULT_CONFIG: Config = {
  matchTicks: 3600,
  productionInterval: [10, 8, 6],
  capacity: [30, 50, 80],
  upgradeCost: [10, 20],
  squadSpeed: 5,
  skillWarmup: 300,
  deadline: { durationTicks: 50, cooldownTicks: 400, speedMultiplier: 2 },
  coffee: { troops: 15, cooldownTicks: 600 },
};

export const SEND_PCTS = [25, 50, 75, 100] as const;
export type SendPct = (typeof SEND_PCTS)[number];

export const MAX_LEVEL = 3;
