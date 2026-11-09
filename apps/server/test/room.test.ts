import { fileURLToPath } from 'node:url';
import { isValidRoomCode } from '@ot/sim';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
let worker: Miniflare;

beforeAll(async () => {
  const bundle = await build({
    entryPoints: [`${root}src/index.ts`],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    external: ['cloudflare:workers'],
  });
  const output = bundle.outputFiles[0];
  if (!output) throw new Error('Worker bundling produced no output');

  worker = new Miniflare({
    modules: true,
    script: output.text,
    compatibilityDate: '2026-07-30',
    durableObjects: {
      ROOM: 'RoomDO',
    },
    assets: {
      directory: `${root}test/fixtures/assets`,
      binding: 'ASSETS',
      routerConfig: { invoke_user_worker_ahead_of_assets: true, has_user_worker: true },
      assetConfig: { not_found_handling: 'single-page-application' },
    },
  });
}, 30000);

afterAll(async () => {
  await worker?.dispose();
});

describe('multiplayer room api and durable object', () => {
  it('creates valid room codes via POST /api/room/create', async () => {
    const res = await worker.dispatchFetch('https://game.example/api/room/create', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBeDefined();
    expect(body.code.length).toBe(4);
    expect(isValidRoomCode(body.code)).toBe(true);
  });

  it('rejects GET on /api/room/create with 405', async () => {
    const res = await worker.dispatchFetch('https://game.example/api/room/create', {
      method: 'GET',
    });
    expect(res.status).toBe(405);
  });

  it('connects via websocket to /ws/room/:code and joins lobby', async () => {
    const codeRes = await worker.dispatchFetch('https://game.example/api/room/create', {
      method: 'POST',
    });
    const { code } = (await codeRes.json()) as { code: string };

    const wsResponse = await worker.dispatchFetch(`https://game.example/ws/room/${code}`, {
      headers: { Upgrade: 'websocket' },
    });
    expect(wsResponse.status).toBe(101);
    const ws = wsResponse.webSocket;
    expect(ws).toBeDefined();
    if (!ws) throw new Error('No websocket returned');

    ws.accept();

    const messages: unknown[] = [];
    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data as string));
    });

    // Send join message
    ws.send(JSON.stringify({ k: 'join', name: 'Alice' }));

    // Wait for lobby message
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(messages.length).toBeGreaterThanOrEqual(1);
    const lobbyMsg = messages[0] as {
      k: string;
      code: string;
      seats: { seat: number; kind: string; name: string }[];
    };
    expect(lobbyMsg.k).toBe('lobby');
    expect(lobbyMsg.code).toBe(code);
    expect(lobbyMsg.seats[0]?.kind).toBe('human');
    expect(lobbyMsg.seats[0]?.name).toBe('Alice');

    // Test seat selection
    ws.send(JSON.stringify({ k: 'seat', seat: 2 }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const lastMsg = messages[messages.length - 1] as {
      k: string;
      seats: { seat: number; kind: string; name: string }[];
    };
    expect(lastMsg.k).toBe('lobby');
    expect(lastMsg.seats[2]?.kind).toBe('human');
    expect(lastMsg.seats[0]?.kind).toBe('empty');

    // Test bot configuration by host
    ws.send(JSON.stringify({ k: 'bot', seat: 1, level: 'normal' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const botMsg = messages[messages.length - 1] as {
      k: string;
      seats: { seat: number; kind: string; level?: string }[];
    };
    expect(botMsg.seats[1]?.kind).toBe('bot');
    expect(botMsg.seats[1]?.level).toBe('normal');

    // Test ready and start
    ws.send(JSON.stringify({ k: 'ready', ready: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    ws.send(JSON.stringify({ k: 'start' }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should receive start message with map and seed
    const startMsg = messages.find((m) => (m as { k: string }).k === 'start') as {
      k: string;
      map: unknown;
      seed: number;
    };
    expect(startMsg).toBeDefined();
    expect(startMsg.seed).toBeDefined();

    ws.close();
  });
});
