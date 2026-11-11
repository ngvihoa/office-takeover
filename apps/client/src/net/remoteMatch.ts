import {
  type Command,
  cloneState,
  createMatch,
  type GameEvent,
  type GameState,
  hashState,
  type PlayerId,
  step,
  type World,
} from '@ot/sim';
import type { RoomClient } from './roomClient';

export class RemoteMatch {
  readonly state: GameState;
  private tickBuffer = new Map<number, Command[]>();
  private pendingResync = false;

  constructor(
    readonly world: World,
    readonly seed: number,
    readonly yourSeat: PlayerId,
    private readonly client: RoomClient,
    initialState?: GameState,
  ) {
    this.state = initialState
      ? cloneState(initialState)
      : createMatch(world, ['human', 'human', 'human', 'human'], seed);
  }

  onServerTick(tick: number, cmds: Command[]): void {
    this.tickBuffer.set(tick, cmds);
  }

  onServerSync(tick: number, hash: number, snapshot?: GameState): void {
    if (snapshot) {
      Object.assign(this.state, cloneState(snapshot));
      this.pendingResync = false;
      return;
    }

    if (this.state.tick === tick) {
      const localHash = hashState(this.state);
      if (localHash !== hash && !this.pendingResync) {
        this.pendingResync = true;
        this.client.requestResync();
      }
    }
  }

  submit(cmd: Command): void {
    this.client.sendCommand(cmd);
  }

  sendEmote(id: number): void {
    this.client.sendEmote(id);
  }

  tick(): GameEvent[] {
    const nextTick = this.state.tick;
    const cmds = this.tickBuffer.get(nextTick);
    if (!cmds) {
      return [];
    }
    this.tickBuffer.delete(nextTick);
    return step(this.world, this.state, cmds);
  }

  get ended(): boolean {
    return this.state.result !== null;
  }

  get bufferSize(): number {
    return this.tickBuffer.size;
  }
}
