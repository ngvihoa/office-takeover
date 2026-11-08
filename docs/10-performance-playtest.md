# 10: Hiệu năng và chơi thử MVP

## Đo lặp lại được

1. `pnpm install --frozen-lockfile`, `pnpm build`. Lệnh build gồm client và Worker
   dry-run, **không deploy**. Chạy bản production cục bộ theo phần D1 bên dưới.
2. Mở `/?perf=1` ở cửa sổ đang focus: seed 7, 4 bot (Thường, Dễ, Thường, Dễ),
   vẫn chạy renderer và tick thật, không tăng tốc sim. Lệnh người không can thiệp
   vào sim trong chế độ này. `/dev/perf` của `pnpm dev` dùng cùng kịch bản,
   nhưng không so kết quả dev với production.
3. Đặt viewport 1280×720 (S=2), DPR=2. Không quay video/chụp ảnh trong lúc đo.
4. Để chạy ít nhất 30 giây sau khởi động. Bấm **Sao chép JSON** / **Tải JSON**,
   hoặc gọi `window.officeBenchmark()` trong console. JSON gồm seed, build commit,
   thống kê frame và cấu hình môi trường ở mức thô, không có UA đầy đủ.
5. Tải lại trang rồi lặp ở 1920×1080 (S=3). Ghi máy, trình duyệt, DPR và trạng thái tăng tốc GPU.

Bộ đo giữ tối đa 3600 khoảng cách frame, bỏ 120 mẫu đầu để làm nóng, tức tối đa
3480 mẫu được tổng hợp. Chỉ lấy frame trong trận đang chạy, không nối qua khoảng
tạm dừng/blur. Hết ngân sách thì giữ mẫu đầu, không xoay vòng; đây không phải phân
bố đầy đủ của cả trận dài. Phân vị dùng nearest-rank; chưa đủ warm-up thì FPS và
frame p50/p95 là `null`, không phải 0 hay NaN.
FPS tính từ thời gian thực giữa các `prestep`, **không lấy delta đã làm mượt của Phaser**.
`cpuP95Ms` đo từ `prestep` tới `postrender`, không phải thời gian GPU trình bày frame.
`maxSquads` là số đoàn tối đa quan sát ở đầu frame, kể cả ngoài cửa sổ mẫu;
trận seed này không thay cho kiểm tra tải cực đại.
Không so sánh hai lần đo có viewport, DPR hoặc cách chạy trình duyệt khác nhau.
Blur tạm dừng trận; Escape tiếp tục. Tải lại để đo lại từ cùng trạng thái ban đầu.
Không có cờ thì **không tải chunk benchmark, panel hay bộ đo CPU** (dynamic import).

## Tracking trận ẩn danh

Trận thường chỉ thêm một bộ đếm nhẹ: thời gian giữa các `prestep`, tối đa 3600
mẫu số, cùng bộ đếm số đoàn tối đa. Không đo CPU ở chế độ thường, nên `cpuP95Ms`
là `null`. Chế độ có kiểm soát bổ sung đo CPU, ghi `mode='controlled'`; không trộn
những trận 4 bot này với `mode='offline'` khi phân tích người chơi.

Mỗi trận thử gọi **một lần** `navigator.sendBeacon('/api/telemetry')` khi nhận
`matchEnded`, về trang chủ/hủy game, hoặc `pagehide` (đóng/tải lại/rời trang).
Một cờ hoàn tất chặn gửi lặp giữa các đường này. Không gửi khi chỉ đổi tab/blur.
Beacon bị từ chối, thiếu API, hoặc lỗi mạng thì bỏ qua: không retry, không fallback
fetch, không hàng đợi và không chờ phản hồi để kết thúc trận. Vì trình duyệt có thể
không phát `pagehide` khi bị hệ điều hành kill, đây là **best effort**, không phải
nguồn kiểm đếm mọi trận chính xác tuyệt đối.

Schema v1 dùng chung tại `packages/telemetry/src/index.ts`:

- `schemaVersion`, `sessionId` (UUIDv4 trong localStorage), `buildVersion` (Git commit
  lúc build, `unknown` nếu source không có Git), `mode`.
- `samples`, `fps`, `frameP50Ms`, `frameP95Ms`, `cpuP95Ms`, `framesOver20Ms`, `maxSquads`.
- `scale`, `viewport=[width,height]` (CSS px), `dpr`, `hardwareConcurrency` (hoặc null),
  `browser` / `os` ở mức nhóm, `reducedMotion`. Viewport/S và cài đặt lấy lúc kết thúc;
  trận có resize có thể trộn nhiều tải trong cùng thống kê, nên không dùng để so benchmark.
- `matchTicks`, `wallSeconds` từ lúc scene sẵn sàng, **có tính tạm dừng**;
  thời gian sim là `matchTicks / 10`. Báo cáo giữ nguyên thời gian sau khi kết thúc.
- `endReason`: `elimination` (last-standing), `timeout`, `left`;
  `playerRank` là hạng ghế người từ kết quả, hoặc null khi rời sớm / chạy 4 bot.
- `bots` là đúng 3 ghế đối thủ (`easy`, `normal`, hoặc null), không rút gọn khi bỏ bot.
  Trong controlled, ghế 0 luôn là bot Thường. `humanCommands` đếm lệnh người hợp lệ
  đã xếp hàng (gửi quân, nâng cấp, kỹ năng), không phải số nhân viên. `humanCaptured`
  đếm sự kiện chiếm phòng, gồm chiếm lại; cả hai là 0 trong controlled.

### Quyền riêng tư và giới hạn

**Gửi số liệu ẩn danh** trong Cài đặt mặc định bật, kể cả dữ liệu cài đặt cũ.
Tắt thì không gửi, không tạo mã session mới. Lựa chọn được kiểm tra lại khi kết thúc,
nên tắt giữa trận cũng có hiệu lực. Tải/copy JSON benchmark thủ công vẫn dùng được.

Không có tên, email, seed, lịch sử lệnh, full UA hay GPU trong gói tự động; không đọc
`WEBGL_debug_renderer_info`. UA chỉ được phân nhóm ngay trên client. Worker không
đọc/lưu IP, cookie hay header Cloudflare Access; observability bị tắt trong cấu hình.
Cloudflare vẫn xử lý metadata HTTP để phục vụ request; cam kết này là **không thu
thập/lưu trong ứng dụng**, không phải loại bỏ thông tin mà hạ tầng mạng cần dùng.
Mã UUID tồn tại trên trình duyệt, có thể nối nhiều trận cùng mã nhưng không gắn danh
tính. Tắt không xóa bản ghi đã gửi; xóa site data sẽ đổi mã cho lần gửi sau. Storage
bị chặn thì mã chỉ dùng cho trận hiện tại. Không có dịch vụ analytics bên thứ ba.

Worker chỉ nhận POST, từ chối trường lạ/thiếu/sai kiểu (400); đọc body theo luồng,
giới hạn **2048 byte UTF-8** kể cả không có Content-Length (413). Một câu INSERT có
điều kiện trong D1 nhận tối đa 30 gói mỗi session trong cửa sổ trượt 3600 giây theo
giờ server; vượt giới hạn trả 204 nhưng không lưu. Chuẩn hóa UUID về chữ thường để
không lách quota bằng đổi hoa/thường. Đây không phải chống lạm dụng theo danh tính:
xóa storage/tạo UUID khác có thể đổi quota. Không dùng IP để giới hạn.

### Chạy và xem D1 cục bộ

```sh copy Copy Local Telemetry Commands
pnpm build
pnpm --filter @ot/server db:migrate:local
pnpm --filter @ot/server dev
```

Wrangler phục vụ client production và API cùng origin; `pnpm dev` chỉ là Vite, không
có D1/API. `pnpm test` chạy validator, client opt-out/send-once và Worker qua Miniflare
với D1 thật cục bộ, gồm 45 request đồng thời chỉ lưu 30. Không cần tài khoản Cloudflare.
State cục bộ ở `apps/server/.wrangler/` (gitignored).

`apps/server/wrangler.jsonc` đang có D1 ID placeholder. Trước deploy thật cần tạo D1,
điền ID, áp dụng `migrations/0001_telemetry_matches.sql` bằng `--remote`, rồi deploy
Worker/static assets. **Đây là các thao tác từ xa cần được chủ dự án cho phép riêng**;
build dry-run và test không thực hiện chúng. Không đặt email/Access/IP vào bảng.

Xem mẫu gần nhất; dùng `--local` để không chạm dữ liệu thật:

```sh copy Copy Recent Telemetry Query
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --local --command "SELECT received_at, build_version, mode, scale, samples, fps, frame_p95_ms, cpu_p95_ms, match_ticks / 10.0 AS sim_seconds, wall_seconds, end_reason, player_rank, bots, human_commands, human_captured FROM telemetry_matches ORDER BY id DESC LIMIT 20;"
```

p50/p95 **FPS giữa các trận** theo S, 7 ngày gần nhất, loại controlled và trận thiếu
mẫu. p95 FPS cao **không phải** đuôi frame chậm; xem thêm `frame_p95_ms` và
`frames_over_20_ms` để tìm giật. Khi so build/máy, thêm lọc `build_version`, `browser`,
`dpr`, `reduced_motion`; không gộp thiết bị khác nhau thành kết luận 60fps.

```sh copy Copy FPS Percentile Query
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --local --command "WITH ranked AS (SELECT scale, fps, ROW_NUMBER() OVER (PARTITION BY scale ORDER BY fps) AS rn, COUNT(*) OVER (PARTITION BY scale) AS n FROM telemetry_matches WHERE mode = 'offline' AND samples > 0 AND received_at > unixepoch() - 604800) SELECT scale, MAX(n) AS matches, MIN(CASE WHEN rn >= (n + 1) / 2 THEN fps END) AS fps_p50, MIN(CASE WHEN rn >= (95 * n + 99) / 100 THEN fps END) AS fps_p95 FROM ranked GROUP BY scale ORDER BY scale;"
```

Thời lượng theo đúng cấu hình 3 ghế bot, chỉ trận đã kết thúc tự nhiên; báo riêng
rời sớm để không làm lệch đánh giá "trận quá nhanh". Phân vị thời gian sim dùng
nearest-rank; trung bình thời gian thực gồm cả nghỉ/tạm dừng.

```sh copy Copy Match Duration Query
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --local --command "WITH ranked AS (SELECT bots, match_ticks / 10.0 AS sim_seconds, wall_seconds, ROW_NUMBER() OVER (PARTITION BY bots ORDER BY match_ticks) AS rn, COUNT(*) OVER (PARTITION BY bots) AS n FROM telemetry_matches WHERE mode = 'offline' AND end_reason <> 'left') SELECT bots, MAX(n) AS matches, MIN(CASE WHEN rn >= (n + 1) / 2 THEN sim_seconds END) AS sim_p50_seconds, MIN(CASE WHEN rn >= (95 * n + 99) / 100 THEN sim_seconds END) AS sim_p95_seconds, ROUND(AVG(wall_seconds), 1) AS wall_mean_seconds FROM ranked GROUP BY bots;"
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --local --command "SELECT bots, end_reason, COUNT(*) AS matches FROM telemetry_matches WHERE mode = 'offline' GROUP BY bots, end_reason;"
```

Sau khi được phép và đã triển khai, thay `--local` bằng `--remote` để đọc D1 production.
Telemetry là dữ liệu tự khai từ client, không dùng làm bảng điểm đáng tin hay chống gian lận.

## Điều kiện nghiệm thu 60fps

- Chưa nghiệm thu chỉ bằng Chromium headless trong orb (GPU phần mềm, máy chủ chia sẻ).
- Cần đo trên ít nhất một laptop văn phòng thật, cửa sổ đang focus, cả S=2 và S=3 nếu màn hình hỗ trợ.
- Ghi FPS, p50/p95 thời gian frame, CPU p95 và số đoàn nhân viên tối đa.
- Kiểm tra thêm lúc kéo gom quân, đổi chủ phòng, dùng kỹ năng, âm thanh/hiệu ứng và cuối trận.
- Mục tiêu màn hình 60Hz: xấp xỉ 60fps, phần lớn frame nằm trong ngân sách 16,7ms,
  không giật kéo dài. Ghi nhận frame trễ, không chỉ báo FPS trung bình.

## Kết quả baseline

Ngày 08/11/2026, orb Linux x64, Xeon 2,60GHz, Chromium headless 157,
WebGL ANGLE/SwiftShader (GPU phần mềm), DPR=2, dev build. Không quay video trong lúc đo.

| Viewport | Mẫu / thời gian sau warm-up | FPS | Frame p50 / p95 | CPU p95 | Max squads |
|---|---|---|---|---|---|
| 1280×720 | 766 / 40,5s | 18,9 | 48,5 / 84,2ms | 16,6ms | 8 |
| 1920×1080 | 326 / 35,4s | 9,2 | 103,9 / 151,3ms | 31,8ms | 8 |

Baseline **không đạt 60fps trong môi trường này**. Đây là số nền để so sánh cùng orb,
không phải kết luận về laptop thật. Chưa đánh dấu tiêu chí 60fps hoàn thành.

## Sau khi nối atlas

Cùng môi trường và kịch bản, vẫn dev build, không quay video trong lúc đo:

| Viewport | Mẫu / thời gian sau warm-up | FPS | Frame p50 / p95 | CPU p95 | Max squads |
|---|---|---|---|---|---|
| 1280×720 | 896 / 39,5s | 22,7 | 40,5 / 68,5ms | 14,3ms | 8 |
| 1920×1080 | 357 / 30,6s | 11,7 | 86,0 / 105,6ms | 22,3ms | 7 |

Có cải thiện quan sát được; tải ở S=3 không hoàn toàn giống nhau (7 so với 8 đoàn).
Máy chia sẻ nên không dùng một cặp lần đo để khẳng định mức tăng cố định.
Vẫn chưa đạt 60fps trong orb và chưa nghiệm thu laptop thật.

## Chơi thử với người: chưa thực hiện

MVP hiện là **mỗi người chơi trên máy mình với bot**, không phải nhiều người trong
cùng trận. Chưa có server/lobby online; không dùng buổi này để nghiệm thu V1.
Chưa chỉnh số liệu luật chơi: trận bot Thường × 4 trước đây có trung vị khoảng
60 giây, p90 khoảng 80 giây, chưa chứng minh trải nghiệm của người mới cũng vậy.

Kiểm tra luồng bằng Chromium trong orb: seed 1137046465, một ghế người gần như
không điều quân, 3 bot mặc định, kết thúc do hết giờ ở tick 3600 (360 giây).
Kết quả: Bot An 11 phòng, ghế người 1 phòng, hai bot còn lại 0 phòng.
Chơi lại tạo một canvas mới; về trang chủ không còn game host. Không coi trận
thụ động này là đánh giá độ vui/độ khó, cũng không phủ định vấn đề rush/snowball.

### Một buổi 15–20 phút / người

Mời ít nhất 3 đồng nghiệp; ghi mã A/B/C thay tên thật. Dùng cùng một build,
trình duyệt đang focus, ghi máy, viewport, DPR và bật/tắt hiệu ứng. Không giải thích
chiến thuật trước trận đầu; chỉ chỉ ra cách mở game.

1. Trận đầu: 1 bot Dễ (bỏ Bot Bình và Bot Chi). Quan sát 30 giây đầu:
   người chơi có tự gửi được nhân viên, hiểu màu phe và phòng trung lập không?
   Ghi lúc cần trợ giúp, thao tác nhầm, chỗ không đọc được.
2. Trận hai: mặc định 3 bot (Dễ / Thường / Dễ). Chơi tới kết quả, không bỏ giữa
   trận chỉ vì đã mất lợi thế. Ghi thời điểm người chơi thấy đã thắng/thua chắc.
3. Nếu còn thời gian, chơi lại cùng thiết lập sau khi đã hiểu điều khiển.
   Không gộp trận đầu và trận đã quen tay khi phân tích độ khó.
4. Ở màn kết quả bấm **Tải báo cáo JSON**. File có seed, ghế/độ khó bot,
   lý do kết thúc, tick kết thúc, thứ hạng, phòng còn lại, nhân viên đã điều và
   số lần chiếm phòng (có tính chiếm lại). Không có lịch sử lệnh nên **không phải replay**.
5. Hỏi ngắn: vui ở đâu, khó chịu ở đâu, trận quá ngắn/vừa/quá dài, muốn thử lại không?
   Nếu quá nhanh: thua vì chưa biết thao tác, bị rush, snowball, hay vì không kịp phản ứng?

| Người / lượt | Thiết lập bot | Seed / file JSON | Thời gian trận | Hiểu gửi trong 30s? | Lúc thắng/thua chắc | Nhận xét / muốn chơi lại? |
|---|---|---|---|---|---|---|
| A / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |
| B / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |
| C / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |

### Quyết định về thời lượng sau buổi thử

- Tách thời gian sim (`endTick / 10`) khỏi thời gian nghỉ/tạm dừng thực tế.
- Tổng hợp trung vị, khoảng thời gian và phản hồi theo thiết lập bot / mức quen tay;
  mẫu 3 người chỉ giúp tìm vấn đề, không đủ kết luận cân bằng thống kê.
- So với mục tiêu 4–6 phút, nhưng không kéo dài trận chỉ để đạt con số nếu người chơi
  thấy trận ngắn vẫn vui. Ghi riêng thời gian từ lúc hết cơ hội tới kết quả để nhận diện snowball.
- Nếu cần chỉnh luật, chọn một giả thuyết và một nhóm tham số trong
  `packages/sim/src/config.ts`, sửa test, chạy lại tất định/đối xứng và 1000 trận bot,
  rồi cho người chơi thử lại. Không đổi đồng thời nhiều luật để tránh mất dấu nguyên nhân.
- Chỉ đánh dấu playtest hoàn thành khi đã có người thật và xử lý phản hồi; các ô trống
  ở trên không phải kết quả.
