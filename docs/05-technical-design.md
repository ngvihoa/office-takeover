# 05: Technical design

## 1. Stack
| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript (strict) | Một ngôn ngữ cho client, server và sim |
| Game engine | **Phaser 4** (4.2.x, MIT) | Engine 2D web mạnh, hỗ trợ pixel art, có agent skills chính thức |
| UI menu / lobby | **Preact** (DOM overlay) | Nhẹ (khoảng 4KB), dễ làm form, chữ tiếng Việt chuẩn |
| Build | Vite | Nhanh, chuẩn cho Phaser |
| Hosting + realtime | **Cloudflare Workers Free** + **Durable Objects (SQLite)** | Free, WebSocket, mỗi phòng một object |
| Database | **Cloudflare D1** (free) | SQL cho hồ sơ, lịch sử trận |
| Auth | **Cloudflare Access** (Zero Trust free ≤ 50 user) | Khoảng 20 người, đăng nhập Google/Microsoft công ty, không phải tự viết |
| Monorepo | pnpm workspaces | |
| Test | Vitest | |
| Lint / format | Biome | Một công cụ, nhanh |

**Không dùng Convex** cho dự án này. Vòng lặp trận tick 10Hz sẽ đốt hết 1 triệu function call/tháng của gói free (xem [research/04](../research/04-tech-stack-hosting.md)).

## 2. Cấu trúc repo
```
/
├─ packages/
│  ├─ design/              ← token và helper của design system (dùng chung DOM + Phaser)
│  └─ sim/                 ← LÕI GAME: TypeScript thuần, tất định, không DOM/Phaser/Cloudflare
│     ├─ src/config.ts     ← mọi con số của GDD
│     ├─ src/types.ts      ← MapDef, World, GameState, Command, GameEvent
│     ├─ src/world.ts      ← buildWorld(): kiểm tra map, tính sẵn đường hành lang (Dijkstra)
│     ├─ src/rules.ts      ← createMatch, validate, step (luật MVP), xếp hạng
│     ├─ src/bot/bot.ts    ← bot Dễ / Thường
│     ├─ src/simulate.ts   ← LocalMatch (host offline: người + bot), runBotMatch
│     ├─ src/rng.ts        ← PRNG mulberry32 có seed
│     ├─ src/hash.ts       ← băm state để kiểm tra đồng bộ
│     ├─ src/maps.ts       ← MAPS (map đóng gói sẵn)
│     └─ maps/office-01.json
├─ apps/
│  ├─ client/              ← Phaser 4 + Preact + Vite
│  │  ├─ src/scenes/       ← Boot, Game, (Tutorial)
│  │  ├─ src/ui/           ← Preact: Home, Lobby, Result, Settings
│  │  ├─ src/net/          ← WebSocket client, buffer tick
│  │  └─ src/render/       ← vẽ state của sim (tháp, đoàn, hiệu ứng)
│  └─ server/              ← Cloudflare Worker + Durable Objects
│     ├─ src/index.ts      ← router: static assets, /api/*, /ws/room/:code
│     ├─ src/room.ts       ← DO "Room"
│     ├─ src/lobby.ts      ← DO "Lobby" (danh sách phòng mở) [V1]
│     ├─ migrations/       ← D1 SQL
│     └─ wrangler.jsonc
├─ art/                    ← xem Art bible
├─ docs/                   ← tài liệu này
└─ research/
```

## 3. Package `sim`: luật bất biến
1. **Thuần và tất định:** cùng `(map, seed, danh sách lệnh theo tick)` thì **luôn** ra cùng kết quả, trên mọi máy.
2. **Chỉ dùng số nguyên** cho state. Không `Math.random()`, không `Date.now()`, không float trong logic.
3. Không import gì ngoài TypeScript chuẩn.
4. Có test tất định: chạy 2 lần cùng input thì `hash(state)` giống hệt nhau. Có test cho từng luật trong GDD.

### API chính
```ts
type PlayerId = 0 | 1 | 2 | 3;
type Command =
  | { t: 'send';    player: PlayerId; from: number[]; to: number; pct: 25 | 50 | 75 | 100 }
  | { t: 'upgrade'; player: PlayerId; tower: number }
  | { t: 'skill';   player: PlayerId; skill: SkillId; target?: number }
  | { t: 'route';   player: PlayerId; from: number; to: number | null };   // [V2]

buildWorld(map: MapDef, config?: Config): World                    // phần tĩnh: map + config + bảng đường đi
createMatch(world: World, seats: SeatKind[], seed: number): GameState
step(world: World, state: GameState, commands: Command[]): GameEvent[] // tiến đúng 1 tick, SỬA state tại chỗ
validate(world: World, state: GameState, cmd: Command): boolean
cloneState(state: GameState): GameState                              // khi cần giữ bản cũ (dự đoán, replay)
hashState(state: GameState): number
createBot(player, level, matchSeed): Bot;  botThink(world, state, bot): Command[]
new LocalMatch(world, seats, seed)  // .submit(cmd), .tick(): GameEvent[], .state, .ended
```
- `step` sửa state tại chỗ (không tạo bản mới mỗi tick) để nhanh: 1000 trận bot chạy khoảng 1 giây.
`GameEvent` (ví dụ `captured`, `squadSpawned`, `skillUsed`, `eliminated`, `matchEnded`) **chỉ phục vụ hiển thị và âm thanh**, không ảnh hưởng logic.

### Map format
```json
{
  "id": "office-01", "name": "Tầng 1", "size": [640, 360],
  "seats": [0, 1, 2, 3],
  "building": { "x": 6, "y": 20, "w": 628, "h": 320 },
  "towers": [
    { "id": 0, "name": "TEAM DEV", "kind": "team", "dept": "dev", "rect": [16, 28, 120, 86],
      "doors": [{ "side": "b", "node": "n76_118" }], "seat": 0, "troops": 10, "level": 1 },
    { "id": 2, "name": "PANTRY", "kind": "pantry", "dept": "pantry", "rect": [264, 28, 112, 86],
      "doors": [{ "side": "b", "node": "n320_118" }], "seat": null, "troops": 12, "level": 1 }
  ],
  "corridor": {
    "nodes": { "d0": [76, 114], "d2": [320, 114], "c0": [76, 125], "c2": [320, 125] },
    "edges": [["d0", "c0"], ["c0", "c2"], ["c2", "d2"]]
  },
  "decor": [ { "sprite": "plant", "x": 200, "y": 192 } ]
}
```
- `kind` quyết định **luật** (team, normal, pantry, meeting, boss, server). `dept` chỉ quyết định **nội thất** khi render.
- Nút cửa nằm ngay ngoài khung cửa. Cạnh hành lang chỉ được ngang hoặc dọc. Độ dài cạnh = khoảng cách Manhattan (số nguyên).
- Khi nạp map, `sim` chạy Dijkstra từ mọi nút cửa để dựng `path[from][to] = { length, points[] }`. Có test kiểm tra: đồ thị liên thông,
  mọi phòng có ít nhất 1 cửa, map FFA đối xứng (độ dài từ mỗi phòng team đến Pantry và Phòng sếp bằng nhau).
- Nội thất trong phòng được **bố trí tự động** theo `dept` và kích thước phòng (hàm thuần trong client), nên file map không phải liệt kê từng cái bàn.

## 4. Chạy offline `[MVP]`
Client tạo `GameState` và chạy `step()` 10 lần/giây trong trình duyệt. Bot chạy trên client. **Không cần server.**
Renderer nội suy vị trí đoàn lính giữa 2 tick để chuyển động mượt ở 60fps.

## 5. Netcode online `[V1]`
**Mô hình:** "sim tất định + server sắp xếp lệnh + snapshot định kỳ".

```
Client ──cmd──► Room DO: gắn lệnh vào tick T+1, chạy step(), broadcast {tick, cmds}
Client ◄──────  mỗi tick:  { k:'t', tick, cmds: [...] }          (thường rỗng)
Client ◄──────  mỗi 20 tick: { k:'s', tick, hash, snapshot? }   (snapshot đầy đủ nếu client báo lệch)
```
- Server là bên có thẩm quyền: chạy `step()` thật và quyết định thứ tự lệnh.
- Client chạy cùng `step()` với **đúng các lệnh server gửi**, nên state trùng khớp. Client đi trễ server 2 tick
  (bộ đệm 200ms) để không bao giờ phải tua lại.
- Mỗi 20 tick server gửi `hash`. Nếu client tính ra hash khác thì xin snapshot và nạp lại (tự sửa lệch, chống bug).
- Lệnh của bot được tạo trên server và broadcast như lệnh người.
- Lệnh của người chơi được **phản hồi hình ảnh tạm** ngay lập tức (đường chấm, âm "pop"). Đoàn lính thật xuất hiện khi tick chứa lệnh đến (trễ khoảng 100–250ms, chấp nhận được với thể loại này).

### Giao thức (JSON ở V1, có thể chuyển sang nhị phân sau)
```ts
// Client → Server
{ k: 'join',  name: string, seatToken?: string }        // seatToken để vào lại sau khi mất kết nối
{ k: 'seat',  seat: 0|1|2|3 | null }                    // chọn hoặc rời ghế (lobby)
{ k: 'bot',   seat: 0|1|2|3, level: 'easy'|'normal'|null } // chủ phòng đặt bot
{ k: 'ready', ready: boolean }
{ k: 'start' }                                          // chủ phòng
{ k: 'cmd',   cmd: Command }                            // trong trận (server tự gắn player)
{ k: 'emote', id: 1|2|3|4|5|6 }
{ k: 'resync' }

// Server → Client
{ k: 'lobby', code, hostId, seats: Seat[], you: { id, seatToken } }
{ k: 'start', map, seats, seed, tick0, config }
{ k: 't', tick, cmds: Command[] }
{ k: 's', tick, hash, snapshot?: GameState }
{ k: 'emote', seat, id }
{ k: 'end', result: MatchResult }
{ k: 'err', code: string, msg: string }
```

### Vòng đời Room DO
`lobby` → (chủ phòng bấm bắt đầu, đếm ngược 3 giây) → `playing` (setInterval 100ms) → `ended`
(giữ 60 giây cho Tái đấu) → huỷ state, hibernate.
- Mã phòng: 4 ký tự từ bảng `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (bỏ ký tự dễ nhầm).
- Ở `lobby` dùng **WebSocket Hibernation API** để không tốn duration.
- **Không dùng `setAlarm` cho tick** (mỗi alarm tính 1 dòng ghi SQLite, giới hạn 100k/ngày).
- Cuối trận ghi kết quả vào D1 (một transaction).
- Mất kết nối: giữ ghế 15 giây, sau đó bot Dễ thay. Vào lại bằng `seatToken` thì lấy lại ghế và nhận snapshot.
- Giới hạn tốc độ: tối đa 10 lệnh/giây mỗi người, quá thì bỏ qua. Lệnh không hợp lệ thì bỏ qua và không broadcast.

### Ngân sách free tier (kiểm tra lại 11/2026)
- DO Free: 100k request/ngày (tin nhắn WS gửi đến tính 20:1, gửi đi miễn phí), 13.000 GB-s/ngày.
- Một trận 6 phút ≈ 45 GB-s và khoảng 40 request → **khoảng 290 trận/ngày**, thừa cho 20 người.
- Workers Free: 100k request/ngày, 10ms CPU mỗi request HTTP. Request static assets miễn phí.
- D1 Free: dư cho vài nghìn trận.

## 6. Dữ liệu (D1) `[V1]`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,               -- email từ Cloudflare Access (hoặc sub từ office JWT)
  display_name TEXT NOT NULL,
  avatar_json TEXT,                  -- [V2]
  created_at INTEGER NOT NULL
);
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,                -- 'ffa'
  map_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  duration_ticks INTEGER NOT NULL,
  commands_json TEXT                 -- replay [V2]: [[tick, cmd], ...]
);
CREATE TABLE match_players (
  match_id TEXT NOT NULL REFERENCES matches(id),
  seat INTEGER NOT NULL,
  user_id TEXT REFERENCES users(id), -- NULL nếu là bot
  bot_level TEXT,
  placement INTEGER NOT NULL,        -- 1..4
  towers_end INTEGER NOT NULL,
  PRIMARY KEY (match_id, seat)
);
```
Trận offline **không** ghi lên server ở MVP. `[Tuỳ chọn]` Sau này có thể gửi kết quả cho chế độ D.

## 7. Auth `[V1]`
- Domain game được bảo vệ bởi **Cloudflare Access** (Google/Microsoft công ty, hoặc mã OTP qua email công ty).
- Worker đọc header `Cf-Access-Jwt-Assertion`, xác thực JWT với khoá của team Access, lấy `email` làm `users.id`.
- Kết nối WebSocket đi qua cùng domain nên được Access bảo vệ luôn.
- Khi nhúng virtual office: xem [06-embed-contract.md](06-embed-contract.md). Lớp auth viết dạng adapter: `access` | `office-jwt` | (sau này) `public-oauth`.

## 8. Renderer (Phaser 4)
- Config: `pixelArt: true`, `roundPixels: true`. Canvas có kích thước 640·S × 360·S và vẽ trực tiếp ở tỉ lệ S (xem design system mục 12),
  để chữ sắc nét. Đổi S khi cửa sổ đổi kích thước.
- Map, HUD và biển số vẽ bằng các hàm paint trong `packages/design` qua một adapter `Painter` cho Phaser (lớp tĩnh vào RenderTexture).
- Một texture atlas duy nhất cho sprite. Đoàn lính dùng **object pool**. Số dùng `BitmapText`.
- **Lớp tĩnh** (hành lang, tường, nội thất) vẽ một lần vào RenderTexture. Khi đổi chủ chỉ vẽ lại thảm sàn và ghế của phòng đó.
  Lớp động gồm biển số, nhóm nhân viên, hiệu ứng, HUD.
- Nhóm nhân viên nội suy vị trí dọc `path.points` theo `traveled / length`.
- Token màu, chữ, khoảng cách lấy từ `packages/design` (xem [09-design-system.md](09-design-system.md)).
- Renderer **chỉ đọc** `GameState` và `GameEvent`, không bao giờ sửa state.
- Mục tiêu: 60fps trên laptop văn phòng, bundle JS < 1.5MB gzip, tải lần đầu < 2 giây.

## 9. Deploy và môi trường
- **Một Worker** phục vụ cả static assets (build của client), API và Durable Objects. Deploy bằng `wrangler deploy`.
- Môi trường: `dev` (`wrangler dev` cục bộ, D1 local) và `prod`.
- Cloudflare Access bật cho domain prod. Khi thiết lập cần kiểm tra cách bảo vệ `workers.dev` hoặc gắn custom domain.
- CI `[V1]`: GitHub Actions free, chạy lint, test sim, build. Deploy thủ công hoặc tự động khi merge vào `main`.

## 10. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit (sim) | Mỗi luật GDD: sinh lính, sức chứa, gửi %, chiếm, nâng cấp, kỹ năng, loại, thắng/hoà |
| Tất định | Cùng seed + lệnh thì cùng hash. Mô phỏng 1000 trận bot-vs-bot không lỗi |
| Cân bằng | Script mô phỏng bot Thường vs Thường: tỉ lệ thắng theo ghế phải xấp xỉ 25% (map đối xứng) |
| Netcode `[V1]` | Test giả lập 2 client + Room DO (Miniflare): hash khớp sau 3600 tick, vào lại giữa trận |
| Thủ công | Checklist playtest trong [07-roadmap.md](07-roadmap.md) |
