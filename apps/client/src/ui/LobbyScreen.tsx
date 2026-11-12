import type { TeamId } from '@ot/design';
import { type BotLevel, MAPS, type PlayerId, type SeatState } from '@ot/sim';
import { useState } from 'preact/hooks';
import type { ConnectionStatus, RoomClient } from '../net/roomClient';
import { Segmented } from './components/controls';
import { MapThumbnail } from './components/MapThumbnail';
import { Badge, Button, Flag, Panel } from './components/primitives';
import { MAP_DETAILS, type MapKey } from './screens';
import './screens.css';

const TEAMS: TeamId[] = ['p1', 'p2', 'p3', 'p4'];

const PLAYER_MODES = [
  { value: '2', label: '⚔️ 2 Người (1v1)' },
  { value: '3', label: '🔺 3 Người' },
  { value: '4', label: '🛡️ 4 Người' },
] as const;

interface LobbyScreenProps {
  code: string;
  client: RoomClient;
  status: ConnectionStatus;
  hostId: string;
  maxSeats: 2 | 3 | 4;
  mapId: string;
  seats: SeatState[];
  you: { id: string; seat: PlayerId | null };
  onLeave: () => void;
}

export function LobbyScreen({ code, client, status, hostId, maxSeats, mapId, seats, you, onLeave }: LobbyScreenProps) {
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

  const humanSeats = seats.slice(0, maxSeats).filter((s) => s.kind === 'human');
  const allReady = humanSeats.length > 0 && humanSeats.every((s) => s.ready);

  const fallbackDefaultMap = maxSeats === 2 ? 'duel-01' : maxSeats === 3 ? 'trio-01' : 'office-01';
  const effectiveMapId = (mapId in MAPS ? mapId : fallbackDefaultMap) as MapKey;
  const currentMap = MAPS[effectiveMapId] ?? MAPS[fallbackDefaultMap];
  const mapDetail = MAP_DETAILS[effectiveMapId] ?? MAP_DETAILS[fallbackDefaultMap as MapKey];
  const matchingMaps = Object.values(MAP_DETAILS).filter((m) => m.seats === maxSeats);

  const handleModeChange = (val: string) => {
    const count = Number(val) as 2 | 3 | 4;
    client.setRoomConfig({ maxSeats: count });
  };

  const handleSelectMap = (id: string) => {
    client.setRoomConfig({ mapId: id });
  };

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

          <div class="setup-mode-row">
            <span class="t-body" style={{ fontWeight: 600 }}>
              Quy mô trận đấu:
            </span>
            {isHost ? (
              <Segmented
                label="Chọn số lượng người chơi"
                value={String(maxSeats)}
                options={PLAYER_MODES}
                onChange={handleModeChange}
              />
            ) : (
              <Badge ok>{maxSeats === 2 ? '⚔️ 2 Người (1v1)' : maxSeats === 3 ? '🔺 3 Người' : '🛡️ 4 Người'}</Badge>
            )}
          </div>

          <div class="screen-stack" style={{ gap: '6px' }}>
            <div class="screen-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span class="t-body" style={{ fontWeight: 600 }}>
                Bản đồ thi đấu:
              </span>
              {isHost && matchingMaps.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {matchingMaps.map((m) => (
                    <Button
                      key={m.id}
                      size="M"
                      variant={effectiveMapId === m.id ? 'primary' : 'secondary'}
                      onClick={() => handleSelectMap(m.id)}
                    >
                      {m.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div class="lobby-map-preview">
              {currentMap && (
                <div class="lobby-map-thumb">
                  <MapThumbnail map={currentMap} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <strong>{mapDetail.name}</strong>
                  <span class="map-card-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>
                    {mapDetail.badge}
                  </span>
                  <span class="muted" style={{ fontSize: '12px' }}>
                    ({mapDetail.tag})
                  </span>
                </div>
                <span
                  class="t-body muted"
                  style={{
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mapDetail.desc}
                </span>
              </div>
            </div>
          </div>

          <p class="t-body muted">Tối đa {maxSeats} người chơi. Ghế trống sẽ được tự động bù bot khi trận bắt đầu.</p>

          <div class="screen-stack bot-list">
            {seats.slice(0, maxSeats).map((seatInfo, idx) => {
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
