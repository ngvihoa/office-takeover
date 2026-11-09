import { buildWorld, createMatch, DEFAULT_CONFIG, hashState, MAPS, type MapDef } from '@ot/sim';
import { describe, expect, it, vi } from 'vitest';
import { RemoteMatch } from '../src/net/remoteMatch';
import type { RoomClient } from '../src/net/roomClient';

describe('RemoteMatch', () => {
  const map = MAPS['office-01'] as MapDef;
  const world = buildWorld(map, DEFAULT_CONFIG);
  const seed = 42;

  it('initializes state and buffers server ticks', () => {
    const mockClient = {
      sendCommand: vi.fn(),
      requestResync: vi.fn(),
    } as unknown as RoomClient;

    const match = new RemoteMatch(world, seed, 0, mockClient);
    expect(match.state.tick).toBe(0);
    expect(match.ended).toBe(false);

    // When tickBuffer is empty, tick() does not advance
    const events0 = match.tick();
    expect(events0).toEqual([]);
    expect(match.state.tick).toBe(0);

    // Provide server tick 0
    match.onServerTick(0, []);
    expect(match.bufferSize).toBe(1);

    const events1 = match.tick();
    expect(events1).toBeDefined();
    expect(match.state.tick).toBe(1);
    expect(match.bufferSize).toBe(0);
  });

  it('submits command through client', () => {
    const mockClient = {
      sendCommand: vi.fn(),
      requestResync: vi.fn(),
    } as unknown as RoomClient;

    const match = new RemoteMatch(world, seed, 0, mockClient);
    match.submit({ t: 'upgrade', player: 0, tower: 1 });
    expect(mockClient.sendCommand).toHaveBeenCalledWith({ t: 'upgrade', player: 0, tower: 1 });
  });

  it('applies snapshot on sync if provided', () => {
    const mockClient = {
      sendCommand: vi.fn(),
      requestResync: vi.fn(),
    } as unknown as RoomClient;

    const match = new RemoteMatch(world, seed, 0, mockClient);
    const customState = createMatch(world, ['human', 'human', 'human', 'human'], 999);
    customState.tick = 50;

    match.onServerSync(50, hashState(customState), customState);
    expect(match.state.tick).toBe(50);
  });
});
