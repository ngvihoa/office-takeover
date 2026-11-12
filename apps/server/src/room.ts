import {
  type Bot,
  botThink,
  buildWorld,
  type Command,
  cloneState,
  createBot,
  createMatch,
  DEFAULT_CONFIG,
  type GameState,
  hashState,
  MAPS,
  type MapDef,
  type MatchResult,
  mapSeats,
  type PlayerId,
  parseClientMessage,
  type SeatState,
  type ServerMessage,
  seatOrder,
  step,
  type World,
  withSeatOrder,
} from '@ot/sim';

export interface Env {
  TELEMETRY_DB?: D1Database;
  ROOM?: DurableObjectNamespace;
  ASSETS?: Fetcher;
  EMBED_ALLOWED_ORIGINS?: string;
}

export interface ClientSession {
  ws: WebSocket;
  id: string;
  name: string;
  seat: PlayerId | null;
  seatToken: string;
  commandCount: number;
  commandSecond: number;
}

type RoomPhase = 'lobby' | 'countdown' | 'playing' | 'ended';

const DISCONNECT_GRACE_MS = 15_000;
const MAX_CMDS_PER_SECOND = 10;

export class RoomDO {
  private code = '';
  private phase: RoomPhase = 'lobby';
  private hostId = '';
  private maxSeats: 2 | 3 | 4 = 4;
  private mapId = 'office-01';
  private sessions = new Map<WebSocket, ClientSession>();
  private seats: SeatState[] = [
    { seat: 0, kind: 'empty', name: 'Ghế 1', ready: false, connected: false },
    { seat: 1, kind: 'empty', name: 'Ghế 2', ready: false, connected: false },
    { seat: 2, kind: 'empty', name: 'Ghế 3', ready: false, connected: false },
    { seat: 3, kind: 'empty', name: 'Ghế 4', ready: false, connected: false },
  ];
  private seatTokens = new Map<PlayerId, string>();
  private disconnectTimers = new Map<PlayerId, ReturnType<typeof setTimeout>>();

  // Gameplay state
  private world: World | null = null;
  private state: GameState | null = null;
  private bots: Bot[] = [];
  private mapDef: MapDef | null = null;
  private seed = 0;
  private pendingCommands: Command[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly stateStorage: DurableObjectState,
    readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/ws/room/') || url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      const match = url.pathname.match(/\/ws\/room\/([A-Za-z0-9]{4})/);
      if (match?.[1]) {
        this.code = match[1].toUpperCase();
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.handleConnection(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/status') {
      return Response.json({
        code: this.code,
        phase: this.phase,
        maxSeats: this.maxSeats,
        mapId: this.mapId,
        seats: this.seats,
        players: this.sessions.size,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private handleConnection(ws: WebSocket): void {
    if (typeof (ws as unknown as { accept: () => void }).accept === 'function') {
      (ws as unknown as { accept: () => void }).accept();
    }

    const sessionId = crypto.randomUUID();
    const seatToken = crypto.randomUUID();

    const session: ClientSession = {
      ws,
      id: sessionId,
      name: 'Người chơi',
      seat: null,
      seatToken,
      commandCount: 0,
      commandSecond: Math.floor(Date.now() / 1000),
    };
    this.sessions.set(ws, session);

    ws.addEventListener('message', (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
        const json = JSON.parse(text);
        const msg = parseClientMessage(json);
        if (msg) {
          this.handleClientMessage(session, msg);
        }
      } catch {
        // Ignore malformed payloads
      }
    });

    ws.addEventListener('close', () => {
      this.handleDisconnect(session);
    });

    ws.addEventListener('error', () => {
      this.handleDisconnect(session);
    });
  }

  private send(session: ClientSession, msg: ServerMessage): void {
    try {
      session.ws.send(JSON.stringify(msg));
    } catch {
      // Socket closed
    }
  }

  private broadcast(msg: ServerMessage): void {
    const json = JSON.stringify(msg);
    for (const session of this.sessions.values()) {
      try {
        session.ws.send(json);
      } catch {
        // Socket closed
      }
    }
  }

  private broadcastLobby(): void {
    for (const session of this.sessions.values()) {
      this.send(session, {
        k: 'lobby',
        code: this.code,
        hostId: this.hostId,
        maxSeats: this.maxSeats,
        mapId: this.mapId,
        seats: this.seats,
        you: { id: session.id, seatToken: session.seatToken, seat: session.seat },
      });
    }
  }

  private handleClientMessage(session: ClientSession, msg: ReturnType<typeof parseClientMessage>): void {
    if (!msg) return;

    if (msg.k === 'join') {
      session.name = msg.name;

      // Check reconnect by seatToken
      if (msg.seatToken) {
        for (const [seatId, token] of this.seatTokens.entries()) {
          if (token === msg.seatToken) {
            // Restore seat
            session.seat = seatId;
            session.seatToken = token;
            const seat = this.seats[seatId];
            if (seat) {
              seat.connected = true;
              seat.name = session.name;
              seat.id = session.id;
            }

            // Cancel disconnect grace timer
            const timer = this.disconnectTimers.get(seatId);
            if (timer) {
              clearTimeout(timer);
              this.disconnectTimers.delete(seatId);
            }

            // If game is in progress, catch up reconnected player
            if (this.phase === 'playing' && this.state && this.mapDef && this.world) {
              // Remove takeover bot if one was added
              this.bots = this.bots.filter((b) => b.player !== seatId);

              this.send(session, {
                k: 'start',
                map: this.mapDef,
                seats: this.seats,
                seed: this.seed,
                tick0: 0,
                config: this.world.config,
              });
              this.send(session, {
                k: 's',
                tick: this.state.tick,
                hash: hashState(this.state),
                snapshot: cloneState(this.state),
              });
              return;
            }
            break;
          }
        }
      }

      // Assign host if none
      if (!this.hostId || !this.hasHost()) {
        this.hostId = session.id;
      }

      // Auto-seat if in lobby and seat is null
      if (this.phase === 'lobby' && session.seat === null) {
        const freeSeat = this.seats.find((s) => s.kind === 'empty');
        if (freeSeat) {
          freeSeat.kind = 'human';
          freeSeat.name = session.name;
          freeSeat.id = session.id;
          freeSeat.ready = false;
          freeSeat.connected = true;
          session.seat = freeSeat.seat;
          this.seatTokens.set(freeSeat.seat, session.seatToken);
        }
      }

      this.broadcastLobby();
      return;
    }

    if (msg.k === 'seat') {
      if (this.phase !== 'lobby') return;
      const targetSeat = msg.seat;

      // Vacate current seat
      if (session.seat !== null) {
        const cur = this.seats[session.seat];
        if (cur && cur.id === session.id) {
          this.seats[session.seat] = {
            seat: session.seat,
            kind: 'empty',
            name: `Ghế ${session.seat + 1}`,
            ready: false,
            connected: false,
          };
          this.seatTokens.delete(session.seat);
          session.seat = null;
        }
      }

      // Claim new seat
      if (targetSeat !== null && targetSeat < this.maxSeats) {
        const dest = this.seats[targetSeat];
        if (dest && dest.kind === 'empty') {
          dest.kind = 'human';
          dest.name = session.name;
          dest.id = session.id;
          dest.ready = false;
          dest.connected = true;
          session.seat = targetSeat;
          this.seatTokens.set(targetSeat, session.seatToken);
        }
      }

      this.broadcastLobby();
      return;
    }

    if (msg.k === 'bot') {
      if (this.phase !== 'lobby') return;
      if (session.id !== this.hostId) return; // Only host sets bots
      if (msg.seat >= this.maxSeats) return;

      const targetSeat = this.seats[msg.seat];
      if (!targetSeat || targetSeat.kind === 'human') return;

      if (msg.level === null) {
        this.seats[msg.seat] = {
          seat: msg.seat,
          kind: 'empty',
          name: `Ghế ${msg.seat + 1}`,
          ready: false,
          connected: false,
        };
      } else {
        this.seats[msg.seat] = {
          seat: msg.seat,
          kind: 'bot',
          level: msg.level,
          name: msg.level === 'easy' ? 'Bot Dễ' : 'Bot Thường',
          ready: true,
          connected: true,
        };
      }

      this.broadcastLobby();
      return;
    }

    if (msg.k === 'ready') {
      if (this.phase !== 'lobby') return;
      if (session.seat !== null) {
        const seat = this.seats[session.seat];
        if (seat) {
          seat.ready = msg.ready;
          this.broadcastLobby();
        }
      }
      return;
    }

    if (msg.k === 'roomConfig') {
      if (this.phase !== 'lobby') return;
      if (session.id !== this.hostId) return;

      if (msg.maxSeats !== undefined) {
        this.setMaxSeats(msg.maxSeats);
      }
      if (msg.mapId !== undefined && MAPS[msg.mapId]) {
        const candidateMap = MAPS[msg.mapId];
        if (candidateMap && mapSeats(candidateMap).length === this.maxSeats) {
          this.mapId = msg.mapId;
        }
      }

      this.broadcastLobby();
      return;
    }

    if (msg.k === 'start') {
      if (this.phase !== 'lobby') return;
      if (session.id !== this.hostId) return;

      // Validate: at least 1 human, and all humans are ready
      const humanSeats = this.seats.filter((s) => s.kind === 'human');
      if (humanSeats.length === 0) return;
      if (!humanSeats.every((s) => s.ready)) return;

      // Auto-fill empty seats with Easy bot
      for (let i = 0; i < this.maxSeats; i++) {
        const s = this.seats[i];
        if (s && s.kind === 'empty') {
          this.seats[i] = {
            seat: i as PlayerId,
            kind: 'bot',
            level: 'easy',
            name: 'Bot Dễ',
            ready: true,
            connected: true,
          };
        }
      }

      this.startMatch();
      return;
    }

    if (msg.k === 'cmd') {
      if (this.phase !== 'playing' || !this.state || session.seat === null) return;

      // Rate limit: 10 cmds / sec
      const nowSec = Math.floor(Date.now() / 1000);
      if (session.commandSecond !== nowSec) {
        session.commandSecond = nowSec;
        session.commandCount = 0;
      }
      if (session.commandCount >= MAX_CMDS_PER_SECOND) return;
      session.commandCount++;

      // Assign authentic player seat
      const player = session.seat;
      const cmd: Command = {
        ...msg.cmd,
        player,
      };

      this.pendingCommands.push(cmd);
      return;
    }

    if (msg.k === 'emote') {
      if (session.seat !== null) {
        this.broadcast({ k: 'emote', seat: session.seat, id: msg.id });
      }
      return;
    }

    if (msg.k === 'resync') {
      if (this.phase === 'playing' && this.state) {
        this.send(session, {
          k: 's',
          tick: this.state.tick,
          hash: hashState(this.state),
          snapshot: cloneState(this.state),
        });
      }
      return;
    }

    if (msg.k === 'rematch') {
      if (this.phase !== 'ended') return;
      this.resetToLobby();
      return;
    }
  }

  private handleDisconnect(session: ClientSession): void {
    this.sessions.delete(session.ws);

    if (this.phase === 'lobby') {
      if (session.seat !== null) {
        this.seats[session.seat] = {
          seat: session.seat,
          kind: 'empty',
          name: `Ghế ${session.seat + 1}`,
          ready: false,
          connected: false,
        };
        this.seatTokens.delete(session.seat);
      }
      if (this.hostId === session.id) {
        this.assignNextHost();
      }
      this.broadcastLobby();
      return;
    }

    if (this.phase === 'playing' && session.seat !== null) {
      const seatId = session.seat;
      const seat = this.seats[seatId];
      if (seat) {
        seat.connected = false;
      }

      // Start 15s grace period
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(seatId);
        // If still disconnected and player is alive, replace with easy bot
        if (this.phase === 'playing' && this.state && this.world) {
          const curSeat = this.seats[seatId];
          if (curSeat && !curSeat.connected) {
            const humans = this.seats.flatMap((s) => (s.kind === 'human' && s.connected ? [s.seat] : []));
            this.bots.push(createBot(seatId, 'easy', this.seed, humans));
          }
        }
      }, DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(seatId, timer);
    }
  }

  private hasHost(): boolean {
    for (const session of this.sessions.values()) {
      if (session.id === this.hostId) return true;
    }
    return false;
  }

  private assignNextHost(): void {
    const next = this.sessions.values().next().value;
    this.hostId = next ? next.id : '';
  }

  private setMaxSeats(newMax: 2 | 3 | 4): void {
    if (newMax === this.maxSeats) return;
    this.maxSeats = newMax;

    // Reset mapId to default for this player count if current map has wrong seats
    const curMap = MAPS[this.mapId];
    if (!curMap || mapSeats(curMap).length !== newMax) {
      this.mapId = newMax === 2 ? 'duel-01' : newMax === 3 ? 'trio-01' : 'office-01';
    }

    // Shrink seats if needed
    while (this.seats.length > newMax) {
      const removed = this.seats.pop();
      if (removed) {
        this.seatTokens.delete(removed.seat);
        for (const session of this.sessions.values()) {
          if (session.seat === removed.seat) {
            session.seat = null;
          }
        }
      }
    }

    // Expand seats if needed
    while (this.seats.length < newMax) {
      const idx = this.seats.length as PlayerId;
      this.seats.push({
        seat: idx,
        kind: 'empty',
        name: `Ghế ${idx + 1}`,
        ready: false,
        connected: false,
      });
    }
  }

  private startMatch(): void {
    this.phase = 'countdown';
    this.seed = (crypto.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;

    const defaultMapId = this.maxSeats === 2 ? 'duel-01' : this.maxSeats === 3 ? 'trio-01' : 'office-01';
    const baseMap = MAPS[this.mapId] ?? MAPS[defaultMapId];
    if (!baseMap) throw new Error(`Base map ${this.mapId} not found`);

    const shuffledMap = withSeatOrder(baseMap, seatOrder(this.seed, this.maxSeats));
    this.mapDef = shuffledMap;
    this.world = buildWorld(shuffledMap, DEFAULT_CONFIG);

    this.state = createMatch(
      this.world,
      this.seats.map((s) => s.kind),
      this.seed,
    );

    const humans = this.seats.flatMap((s) => (s.kind === 'human' ? [s.seat] : []));
    this.bots = this.seats.flatMap((s) =>
      s.kind === 'bot' && s.level ? [createBot(s.seat, s.level, this.seed, humans)] : [],
    );

    this.broadcast({
      k: 'start',
      map: this.mapDef,
      seats: this.seats,
      seed: this.seed,
      tick0: 0,
      config: this.world.config,
    });

    // Client freezes 3 seconds for intro; server starts simulation after 3 seconds
    this.countdownTimer = setTimeout(() => {
      this.phase = 'playing';
      this.tickInterval = setInterval(() => this.stepTick(), 100);
    }, 3000);
  }

  private stepTick(): void {
    if (this.phase !== 'playing' || !this.state || !this.world) return;

    const cmds = this.pendingCommands;
    this.pendingCommands = [];

    // Collect bot commands
    for (const bot of this.bots) {
      const pl = this.state.players[bot.player];
      if (pl?.active && pl.eliminatedAt === null) {
        cmds.push(...botThink(this.world, this.state, bot));
      }
    }

    // Step simulation
    step(this.world, this.state, cmds);

    // Broadcast tick commands
    this.broadcast({
      k: 't',
      tick: this.state.tick,
      cmds,
    });

    // Checkpoint hash every 20 ticks
    if (this.state.tick % 20 === 0) {
      const hash = hashState(this.state);
      this.broadcast({
        k: 's',
        tick: this.state.tick,
        hash,
      });
    }

    // End condition
    if (this.state.result !== null) {
      this.endMatch(this.state.result);
    }
  }

  private endMatch(result: MatchResult): void {
    this.phase = 'ended';
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.broadcast({ k: 'end', result });
  }

  private resetToLobby(): void {
    this.phase = 'lobby';
    this.state = null;
    this.world = null;
    this.bots = [];
    this.pendingCommands = [];
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Unready humans
    for (const seat of this.seats) {
      if (seat.kind === 'human') {
        seat.ready = false;
      }
    }

    this.broadcastLobby();
  }
}
