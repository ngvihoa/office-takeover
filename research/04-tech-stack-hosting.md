# 04: Tech stack và hosting free tier

## Kết luận
**Dùng toàn bộ Cloudflare free:** Workers (static assets + API) + **Durable Object cho mỗi phòng** + D1.
Convex rất tiện cho app CRUD/realtime thông thường, nhưng **không hợp với vòng lặp game** (lý do bên dưới).
Nếu vẫn muốn dùng Convex thì chỉ để làm phần meta (hồ sơ, bảng xếp hạng). Đổi lại phải quản lý 2 hệ thống.

## Free tier (đã kiểm tra lại tài liệu chính thức, tháng 10–11/2026)

### Cloudflare Workers Free
- 100.000 request/ngày (reset 00:00 UTC). CPU 10ms mỗi request HTTP (không tính thời gian chờ I/O). Bộ nhớ 128MB.
- Static assets: 20.000 file, 25MiB/file. Request vào static assets **miễn phí và không giới hạn**.

### Durable Objects trên Workers Free (chỉ backend SQLite)
- **100.000 request/ngày.** Gồm HTTP, RPC, **tin nhắn WebSocket gửi đến** (tính theo tỉ lệ **20:1**) và alarm.
  Tin nhắn gửi đi từ server **miễn phí**. Mở một kết nối WebSocket tính 1 request.
- **13.000 GB-s/ngày** thời gian chạy, tính trên 128MB cấp phát bất kể dùng bao nhiêu.
- SQLite: 5 triệu dòng đọc/ngày, **100.000 dòng ghi/ngày** (mỗi lần `setAlarm()` tính 1 dòng ghi), tổng 5GB.
- Vượt giới hạn thì thao tác **lỗi** cho đến khi reset lúc 00:00 UTC (không tự tính tiền).
- Hibernation API: object nhàn rỗi không bị tính duration. Nhưng **trong trận đang chạy thì không hibernate** (cần tick liên tục).

### Convex Free
- 1 triệu function call/tháng, 1GB data egress, 0.5GB database, 1GB file storage, 20 GB-giờ action compute.

## Vì sao Convex không hợp với vòng lặp trận đấu
Game cần server tick đều khoảng 10 lần/giây để tính lính sinh ra, va chạm, đổi chủ. Trên Convex, mỗi tick là
một scheduled mutation, tức một function call. Một trận 5 phút tốn khoảng 3.000 call cho tick, chưa kể lệnh
của người chơi và subscription. Với 1 triệu call/tháng (khoảng 33.000/ngày), chỉ được **chừng 10 trận/ngày**.
Ngoài ra Convex không được thiết kế cho độ trễ của một game loop.

## Tính dung lượng với Durable Objects
Giả định trận 6 phút, DO sống suốt trận:
- Duration: 360s × 0.125GB = **45 GB-s/trận** → 13.000 / 45 ≈ **~290 trận/ngày**.
- Request: 4 kết nối + khoảng 720 lệnh người chơi (mỗi người 1 lệnh/2 giây) / 20 ≈ **~40 request/trận** → không đáng lo.
- Ghi SQLite: chỉ ghi kết quả cuối trận (vài dòng). **Không dùng `setAlarm` cho tick**, hãy dùng `setInterval` trong DO.
- Trận solo hoặc toàn bot chạy trên **trình duyệt**, không tốn server.

→ Thừa sức cho cả công ty chơi mỗi ngày. Khi mở cho cộng đồng thì nâng lên Workers Paid ($5/tháng).

## Kiến trúc đề xuất
```
                    ┌──────────────────────────────────────┐
 Trình duyệt ──────►│ Worker (static assets: game build)   │
  (Phaser 4)        │  /api/*  → hồ sơ, BXH (D1)            │
     │  WebSocket   │  /room/:code → Durable Object "Room"   │
     └─────────────►│      - giữ state trận, tick 10Hz        │
                    │      - chạy bot cho ghế trống           │
                    │      - cuối trận ghi kết quả vào D1     │
                    │  Durable Object "Lobby" (danh sách phòng)│
                    └──────────────────────────────────────┘
```

### Monorepo
```
/packages/sim      ← logic game THUẦN TypeScript, tất định, không phụ thuộc DOM hay Phaser
                     (state, tick(), applyCommand(), bot AI)
/apps/client       ← Phaser 4 + Vite; import sim để chạy solo/bot và để nội suy
/apps/server       ← Worker + Durable Objects; import sim để chạy trận online
/art               ← STYLE.md, palette, nguồn asset, script hậu kiểm
```
Điểm mấu chốt: **cùng một package `sim`** chạy ở client (offline, bot) và server (online), nên không phải viết logic hai lần.
Sau này dùng luôn cho replay: chỉ cần lưu seed và danh sách lệnh.

### Netcode
- Server-authoritative. Client gửi **lệnh** (`send {from, to, pct}`, `skill {id, target}`).
- Server tick 10Hz, broadcast **delta**: số lính tháp thay đổi, đổi chủ, đoàn lính mới (id, from, to, tickStart, count).
  Vị trí đoàn lính do client tự tính từ `tickStart` và tốc độ, nên băng thông rất nhỏ.
- Map nhỏ, lính đi thẳng, nên **không cần** dự đoán hay rollback phức tạp. Độ trễ 50–100ms chấp nhận được.
- Random (sự kiện, crit…) dùng PRNG có seed trong `sim` để replay tái tạo được.

### Thư viện hỗ trợ
- **PartyServer** (`partyserver`, kế thừa PartyKit) giúp viết room trên DO gọn hơn. Lưu ý: **nền tảng hosted PartyKit đã
  đóng**, `npx partykit deploy` ngừng chạy từ 23/10/2026. Dùng PartyServer deploy lên tài khoản Cloudflare của mình thì vẫn ổn.
  Cũng có thể viết DO thuần với Hibernation API, code không nhiều.
- Hoặc **Colyseus** nếu muốn framework game server đầy đủ, nhưng cần VPS riêng (không chạy trên Workers), tức không free.

### Đăng nhập (giai đoạn công ty)
- Đơn giản nhất: **Cloudflare Access** (Zero Trust free đến 50 user) chặn trước domain, xác thực bằng Google/Microsoft
  công ty. Worker đọc email từ header JWT của Access.
- Hiện khoảng 20 người nên Access free là đủ. Chỉ khi mở cộng đồng mới cần OAuth công khai.
- Khi nhúng virtual office: nhận token từ office (xem file 06).

## Phương án dự phòng
| Phương án | Khi nào |
|---|---|
| Cloudflare toàn bộ (đề xuất) | Mặc định |
| Cloudflare DO cho trận + Convex cho meta | Nếu đã có sẵn codebase hoặc auth trên Convex và muốn tận dụng |
| Lockstep P2P (WebRTC) + Cloudflare chỉ làm signaling | Nếu DO hết quota (khó xảy ra). Phức tạp hơn và dễ gian lận |

## Nguồn
- [Durable Objects pricing (Cloudflare docs)](https://developers.cloudflare.com/durable-objects/platform/pricing)
- [Workers limits (Cloudflare docs)](https://developers.cloudflare.com/workers/platform/limits)
- [DO free quota & WebSocket 20:1 – Cloudflare Community](https://community.cloudflare.com/t/durable-objects-free-quota-block-below-100k-after-websocket-20-1-adjustment/967650)
- [Cloudflare DO multiplayer server guide 2026](https://tech-insider.org/cloudflare-durable-objects-multiplayer-game-server-2026/)
- [Cloudflare WebSockets guide](https://websocket.org/guides/infrastructure/cloudflare/)
- [Convex free tier 2026](https://agentdeals.dev/vendor/convex) · [Convex pricing](https://toolradar.com/tools/convex/pricing)
- [Migrate to PartyServer](https://docs.partykit.io/guides/migrate-to-partyserver/)
- [Phaser GitHub](https://github.com/phaserjs/phaser)
