import type { TeamId } from '@ot/design';
import type { BotLevel, PlayerId, SeatState } from '@ot/sim';
import { useState } from 'preact/hooks';
import type { ConnectionStatus, RoomClient } from '../net/roomClient';
import { Badge, Button, Flag, Panel } from './components/primitives';
import './screens.css';

const TEAMS: TeamId[] = ['p1', 'p2', 'p3', 'p4'];

interface LobbyScreenProps {
  code: string;
  client: RoomClient;
  status: ConnectionStatus;
  hostId: string;
  seats: SeatState[];
  you: { id: string; seat: PlayerId | null };
  onLeave: () => void;
}

export function LobbyScreen({ code, client, status, hostId, seats, you, onLeave }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const isHost = you.id === hostId;
  const mySeat = you.seat;
  const mySeatState = mySeat !== null ? seats[mySeat] : null;

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const humanSeats = seats.filter((s) => s.kind === 'human');
  const allReady = humanSeats.length > 0 && humanSeats.every((s) => s.ready);

  return (
    <section class="screen-layer" aria-label="Phòng chờ online">
      <Panel class="screen-panel lobby-screen" title={`Phòng: ${code}`} icon="person">
        <div class="screen-stack">
          <div class="screen-row">
            <h1 class="t-title">Phòng chờ trực tuyến</h1>
            <Badge ok={status === 'connected'}>{status === 'connected' ? 'Đã kết nối' : 'Đang kết nối...'}</Badge>
          </div>

          <div class="screen-row" style={{ gap: '8px' }}>
            <span class="t-body">
              Mã phòng: <strong>{code}</strong>
            </span>
            <Button size="M" icon="copy" onClick={copyInviteLink}>
              {copied ? 'Đã sao chép!' : 'Sao chép link mời'}
            </Button>
          </div>

          <p class="t-body muted">Tối đa 4 người chơi. Ghế trống sẽ được tự động bù bot khi trận bắt đầu.</p>

          <div class="screen-stack bot-list">
            {seats.map((seatInfo, idx) => {
              const tid = TEAMS[idx] ?? 'neutral';
              const isMine = mySeat === idx;

              return (
                <div class="screen-row bot-row" key={seatInfo.seat}>
                  <span class="screen-player">
                    <Flag t={tid} />
                    <strong>{seatInfo.name}</strong>
                    {isMine && <Badge>Bạn</Badge>}
                    {seatInfo.id === hostId && <Badge>Chủ phòng</Badge>}
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {seatInfo.kind === 'human' && (
                      <Badge ok={seatInfo.ready}>{seatInfo.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</Badge>
                    )}

                    {seatInfo.kind === 'bot' && <Badge>{seatInfo.level === 'normal' ? 'Bot Thường' : 'Bot Dễ'}</Badge>}

                    {seatInfo.kind === 'empty' && (
                      <Button size="M" disabled={mySeat !== null} onClick={() => client.setSeat(idx as PlayerId)}>
                        Chọn ghế
                      </Button>
                    )}

                    {isMine && (
                      <>
                        <Button
                          variant={mySeatState?.ready ? 'secondary' : 'primary'}
                          onClick={() => client.setReady(!mySeatState?.ready)}
                        >
                          {mySeatState?.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
                        </Button>
                        <Button onClick={() => client.setSeat(null)}>Rời ghế</Button>
                      </>
                    )}

                    {isHost &&
                      !isMine &&
                      seatInfo.kind !== 'human' &&
                      (seatInfo.kind === 'empty' ? (
                        <Button size="M" onClick={() => client.setBot(idx as PlayerId, 'easy')}>
                          + Bot
                        </Button>
                      ) : (
                        <Button
                          size="M"
                          onClick={() => {
                            const nextLevel: BotLevel | null = seatInfo.level === 'easy' ? 'normal' : null;
                            client.setBot(idx as PlayerId, nextLevel);
                          }}
                        >
                          {seatInfo.level === 'easy' ? 'Đổi: Thường' : 'Bỏ Bot'}
                        </Button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div class="screen-row" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
            <Button onClick={onLeave}>Rời phòng</Button>

            {isHost && (
              <Button
                variant="primary"
                size="L"
                disabled={!allReady}
                title={!allReady ? 'Tất cả người chơi phải sẵn sàng' : undefined}
                onClick={() => client.startMatch()}
              >
                Bắt đầu trận
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}
