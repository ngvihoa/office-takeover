import type { BotLevel, ClientCommand, ClientMessage, PlayerId, ServerMessage } from '@ot/sim';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface RoomClientCallbacks {
  onStatusChange?: (status: ConnectionStatus) => void;
  onLobby?: (lobby: Extract<ServerMessage, { k: 'lobby' }>) => void;
  onStart?: (start: Extract<ServerMessage, { k: 'start' }>) => void;
  onTick?: (tick: Extract<ServerMessage, { k: 't' }>) => void;
  onSync?: (sync: Extract<ServerMessage, { k: 's' }>) => void;
  onEmote?: (emote: Extract<ServerMessage, { k: 'emote' }>) => void;
  onEnd?: (end: Extract<ServerMessage, { k: 'end' }>) => void;
  onError?: (err: Extract<ServerMessage, { k: 'err' }>) => void;
}

export class RoomClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private playerName = 'Người chơi';
  private seatToken?: string;
  private autoReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public readonly code: string,
    private readonly callbacks: RoomClientCallbacks = {},
    options?: { seatToken?: string; playerName?: string },
  ) {
    if (options?.seatToken) this.seatToken = options.seatToken;
    if (options?.playerName) this.playerName = options.playerName;
  }

  connect(url?: string): void {
    if (this.ws) {
      this.disconnect();
    }

    this.setStatus('connecting');

    const wsUrl =
      url ??
      (() => {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}/ws/room/${this.code.toUpperCase()}`;
      })();

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener('open', () => {
      this.setStatus('connected');
      // Auto-join upon connect
      this.send({
        k: 'join',
        name: this.playerName,
        seatToken: this.seatToken,
      });
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
        const msg = JSON.parse(text) as ServerMessage;
        this.handleMessage(msg);
      } catch {
        // Ignore unparseable messages
      }
    });

    this.ws.addEventListener('close', () => {
      this.ws = null;
      this.setStatus('disconnected');
      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.addEventListener('error', () => {
      this.ws?.close();
    });
  }

  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.autoReconnect) {
        this.connect();
      }
    }, 2000);
  }

  private handleMessage(msg: ServerMessage): void {
    if (msg.k === 'lobby') {
      if (msg.you?.seatToken) {
        this.seatToken = msg.you.seatToken;
      }
      this.callbacks.onLobby?.(msg);
      return;
    }

    if (msg.k === 'start') {
      this.callbacks.onStart?.(msg);
      return;
    }

    if (msg.k === 't') {
      this.callbacks.onTick?.(msg);
      return;
    }

    if (msg.k === 's') {
      this.callbacks.onSync?.(msg);
      return;
    }

    if (msg.k === 'emote') {
      this.callbacks.onEmote?.(msg);
      return;
    }

    if (msg.k === 'end') {
      this.callbacks.onEnd?.(msg);
      return;
    }

    if (msg.k === 'err') {
      this.callbacks.onError?.(msg);
      return;
    }
  }

  private send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      // Socket failed
    }
  }

  setSeat(seat: PlayerId | null): void {
    this.send({ k: 'seat', seat });
  }

  setBot(seat: PlayerId, level: BotLevel | null): void {
    this.send({ k: 'bot', seat, level });
  }

  setReady(ready: boolean): void {
    this.send({ k: 'ready', ready });
  }

  setRoomConfig(config: { maxSeats?: 2 | 3 | 4; mapId?: string }): void {
    this.send({ k: 'roomConfig', ...config });
  }

  startMatch(): void {
    this.send({ k: 'start' });
  }

  sendCommand(cmd: ClientCommand): void {
    this.send({ k: 'cmd', cmd });
  }

  sendEmote(id: number): void {
    this.send({ k: 'emote', id });
  }

  requestResync(): void {
    this.send({ k: 'resync' });
  }

  requestRematch(): void {
    this.send({ k: 'rematch' });
  }

  get currentStatus(): ConnectionStatus {
    return this.status;
  }

  get token(): string | undefined {
    return this.seatToken;
  }
}
