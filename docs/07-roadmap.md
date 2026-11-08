# 07: Roadmap

Nguyên tắc: **mỗi giai đoạn phải chơi được và vui** trước khi sang giai đoạn sau. Không làm mọi thứ một lần.

## MVP: "Chơi được với bot"
**Mục tiêu:** chứng minh cơ chế cốt lõi vui. Chạy hoàn toàn trong trình duyệt, chưa cần server.

Phạm vi:
- `packages/sim`: luật cốt lõi (GDD mục 1, 3), tháp thường và Pantry, nâng cấp, 2 kỹ năng (Deadline, Coffee Break), bot Dễ và Thường.
- `packages/design`: token và helper theo design system. Trang `/dev/ui` hiển thị mọi component MVP.
- `apps/client`: Phaser 4 render map `office-01` theo hướng mặt bằng 3/4 (phòng ban, hành lang, nhân viên đi theo hành lang). Điều khiển MVP (UX mục 3). HUD. Phản hồi MVP. Âm thanh MVP.
- UI: Trang chủ, Thiết lập trận offline, Kết quả, Cài đặt cơ bản.
- `art/`: pipeline sinh asset, validate, asset MVP (Art bible mục 5).
- Deploy static lên Cloudflare (Workers static assets) để đồng nghiệp chơi thử.

Tiêu chí hoàn thành:
- [x] Luồng 1 ghế người + 3 bot đi tới kết quả: kiểm tra trình duyệt hết 360 giây, seed 1137046465; chơi lại/về trang chủ hoạt động. Đây là kiểm tra tự động, không thay playtest người thật.
- [x] Mọi thao tác MVP trong UX spec hoạt động bằng chuột. Phím `1`–`4`, `Q`, `W`, `E`, `Space`, `Esc` hoạt động. Playwright Chromium kiểm tra S=1/2: kết quả điều quân, gom hai phòng, nâng cấp/sinh quân, kỹ năng, hủy ngắm, tạm dừng; cả ngưỡng kéo 5/6px logic, hướng dẫn theo hành lang và chặn context menu.
- [x] Test tất định qua. 1000 trận bot-vs-bot không lỗi. Tỉ lệ thắng theo ghế trong khoảng 20–30% (đo được 22.6–26.4%).
  - Ghi nhận: trận bot Thường × 4 kết thúc nhanh (trung vị khoảng 60 giây, p90 khoảng 80 giây), ngắn hơn nhiều so với mục tiêu 4–6 phút.
    Cần xem lại khi playtest với người (bot đang chơi kiểu dồn ép). Chỉnh trong `packages/sim/src/config.ts`.
- [x] Mọi asset qua `validate.ts`. Có contact sheet (88 nguồn, 164 frame runtime; `pnpm art:build`).
- [x] `/dev/ui` hiển thị đủ component MVP ở S=1, 2, 3. Kiểm tra tự động 18 mục, màu DOM thuộc token, canvas integer/pixelated và không tràn ngang; chụp từng mục/trạng thái ở DPR=2. Đã xem lại ảnh đại diện ở ba S; chưa có so sánh ảnh baseline tự động (V1). `pnpm test:e2e`: 43 test qua, ảnh/report được giữ trong CI 7 ngày.
- [ ] 60fps trên một laptop văn phòng phổ biến.
- [ ] Ít nhất 3 đồng nghiệp chơi thử và góp ý. Đã chỉnh số liệu theo góp ý.

## V1: "Chơi online cùng nhau"
- Room DO: lobby 4 ghế, mã phòng và link mời, thêm/bớt bot, sẵn sàng, bắt đầu, tái đấu.
- Netcode (Technical design mục 5), vào lại khi mất kết nối, bot thay ghế khi mất kết nối.
- Cloudflare Access, bảng `users`, `matches`, `match_players`. Lịch sử trận cá nhân.
- Chọn bằng khung, tooltip, `Alt` hiện thông số, emote, trận hướng dẫn, logo.

Tiêu chí hoàn thành:
- [ ] 4 người trên 4 máy chơi trọn trận, không lệch hash (hoặc tự sửa lệch không ai nhận ra).
- [ ] Rút dây mạng 10 giây rồi vào lại thì lấy lại được ghế.
- [ ] Theo dõi 1 tuần chơi thật: dùng < 20% quota free của Cloudflare.

## V2: "Đầy đủ chất văn phòng"
- Tháp Phòng họp, Server room, Phòng sếp. Kỹ năng Họp đột xuất và Reply All, chọn 2 kỹ năng trong lobby.
- Sự kiện: Bánh sinh nhật, Dọn dẹp, Pizza. Tuyến tiếp tế. Bot Khó.
- Hồ sơ và avatar pixel ghép. Replay.
- **Kết nối virtual office** theo [06-embed-contract.md](06-embed-contract.md).
- **Bố cục ngẫu nhiên mức 1 + 2** (GDD mục 2.2):
  - Thêm 2 map vẽ tay (tổng 3 map trong bộ). Mỗi trận chọn ngẫu nhiên 1 map theo seed.
  - Xáo ghế ngồi, tên phòng ban trung lập, cách bày nội thất.
  - Xáo vị trí các phòng đặc biệt (Pantry, Phòng họp, Server) giữa các "ô" khai báo sẵn, **đối xứng 4 phía**.
    Dao động số nhân viên trung lập ±20% (đối xứng).
  - Tiêu chí: test tự động chạy 10.000 seed, mọi bố cục sinh ra đều liên thông và có khoảng cách đều cho 4 phe.
    1000 trận bot-vs-bot trên bố cục ngẫu nhiên có tỉ lệ thắng theo ghế 20–30%.

## Tuỳ chọn
- Chế độ D. Thử thách ngày: map sinh từ seed theo ngày (dùng **bộ sinh mức 3**), bộ giải kiểm tra có lời giải, bảng xếp hạng ngày.
- **Bố cục ngẫu nhiên mức 3** (GDD mục 2.2): sinh 1/4 toà nhà từ seed, lật gương ra 4 góc, chạy bộ kiểm tra.
  Làm khi làm chế độ D, hoặc khi mở cho cộng đồng.
  Chỉ làm nếu nhóm thấy khó hẹn nhau chơi cùng giờ.

## Backlog (chưa lên lịch)
- Chế độ B. Đồng đội 2 vs 2.
- Chế độ C. Đánh Boss (co-op).
- Tháp HR, Thực tập sinh. Kỹ năng Work From Home, Thực tập sinh.
- Sự kiện Sếp đi ngang, Mất điện, Wifi chập chờn.
- Va chạm giữa các đoàn lính trên đường.
- Elo và bảng xếp hạng, thành tích, skin theo mùa, nhạc nền.
- Chế độ xem (spectate) chiếu lên TV trong office.
- Map editor. Mở cho cộng đồng (auth OAuth công khai, kiểm duyệt tên, rate limit, nâng Workers Paid $5/tháng nếu cần).

## Checklist playtest (dùng cho mọi giai đoạn)
- Người mới có hiểu cách gửi lính trong 30 giây đầu không?
- Có trận nào kéo dài vô nghĩa vì một người đã thắng chắc không? (snowball)
- Có chiến thuật nào luôn thắng không? (ví dụ rush Pantry)
- Bot Dễ có quá khó với người mới không? Bot Thường có quá dễ với người quen tay không?
- Có thao tác nào gây mỏi hoặc khó chịu không?

### Tiến độ màn chơi Phaser (08/11/2026)
- Đã nối màn chính vào Phaser 4.2 và `LocalMatch`: 1 người + 3 bot trên `office-01`.
- Có kéo gom quân, Ctrl+click, click phải điều quân, cuộn/1–4 đổi tỉ lệ, double-click/E mở rộng,
  Q/W kỹ năng, Space chọn hết, Esc bỏ chọn/tạm dừng; nút chuột cho kỹ năng, tỉ lệ, mở rộng, chọn hết và menu.
- HUD đọc state thật; đoàn nhân viên nội suy theo đường hành lang. Có bảng thứ hạng và chơi lại.
- Đã có pipeline validate/atlas, 10 âm thanh sinh lặp lại được, hiệu ứng từ sự kiện sim,
  giảm chuyển động/tắt âm, không rung màn hình khi chiếm phòng, menu thiết lập 1–3 bot và cài đặt lưu trên máy.
- Kết quả có thứ hạng, phòng còn lại, nhân viên đã điều, số lần chiếm, thời gian, seed và tải JSON.
  `/dev/ui` có preview trang chủ, thiết lập 1/3 bot, cài đặt, thắng/thua/hòa và tạm dừng.
- Đã đo baseline và sau atlas trên GPU phần mềm trong orb; **chưa đạt 60fps trong orb**,
  chưa nghiệm thu laptop thật. Số đo và quy trình ở [10-performance-playtest.md](10-performance-playtest.md).
- Đã có `pnpm deploy`, security headers/CSP từ Worker, test D1/HTTP local và CI push/PR
  (typecheck, lint, 84 unit/integration test, build, 43 Playwright test); CI không deploy.
  Hướng dẫn D1/Access/WAF/rollback ở [11-deploy.md](11-deploy.md); chưa nghiệm thu account thật.
- Chưa đánh dấu hoàn tất MVP: còn nghiệm thu hiệu năng máy thật, playtest ít nhất 3 đồng nghiệp,
  xem lại thời lượng trận theo phản hồi và deploy static (chưa thực hiện).
