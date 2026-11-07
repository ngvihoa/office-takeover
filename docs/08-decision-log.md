# 08: Decision log

Ghi lại các quyết định đã chốt. Muốn thay đổi thì thêm một dòng mới (đánh dấu dòng cũ là "Thay bởi #N"), không sửa lịch sử.

| # | Ngày | Quyết định | Lý do | Trạng thái |
|---|---|---|---|---|
| 1 | 2026-11-07 | Thể loại: chiếm tháp realtime (kiểu Tower Takeover / Galcon), pixel 2D, bối cảnh văn phòng | Dễ học, trận ngắn, hợp chơi giờ giải lao | Chốt |
| 2 | 2026-11-07 | **Desktop-first**, chơi bằng chuột + bàn phím | Đồng nghiệp chơi bằng máy tính | Chốt |
| 3 | 2026-11-07 | Tối đa **4 người mỗi trận**, ghế trống là bot | Giới hạn của chủ dự án, map gọn | Chốt |
| 4 | 2026-11-07 | **Không** tích hợp bot Slack/Teams, không thông báo đẩy, không chat tự do | Tránh sao lãng công việc | Chốt |
| 5 | 2026-11-07 | **Chỉ dùng công cụ và dịch vụ miễn phí.** Không PixelLab, không mua Aseprite | Dự án cá nhân, chi phí 0 | Chốt |
| 6 | 2026-11-07 | Engine **Phaser 4** + TypeScript + Vite. Menu bằng Preact | Phaser 4 là bản hiện hành (4.2.x), MIT, có agent skills chính thức | Chốt |
| 7 | 2026-11-07 | Backend **Cloudflare Workers + Durable Objects + D1** (gói Free). **Không dùng Convex** | Tick 10Hz trên Convex sẽ đốt hết quota function call. DO free đủ khoảng 290 trận/ngày | Chốt |
| 8 | 2026-11-07 | Package `sim` thuần và tất định, dùng chung cho client, server, bot, replay | Viết logic một lần, offline miễn phí, replay rẻ | Chốt |
| 9 | 2026-11-07 | Netcode: server sắp xếp lệnh + sim tất định + hash và snapshot mỗi 20 tick | Băng thông cực nhỏ, server có thẩm quyền, tự sửa lệch | Chốt |
| 10 | 2026-11-07 | Auth: **Cloudflare Access** | Khoảng 20 người (< 50 user free), không phải tự viết đăng nhập | Chốt |
| 11 | 2026-11-07 | Virtual office là dự án tách biệt. Game chỉ công bố **iframe + postMessage contract** | Không phụ thuộc công nghệ của office | Chốt |
| 12 | 2026-11-07 | Chế độ: **A. Đấu tự do** cho MVP/V1. D tuỳ chọn. **B (2v2) và C (Boss) vào backlog** | Làm dần, tập trung một chế độ cho vui | Chốt |
| 13 | 2026-11-07 | Asset sinh bằng code từ "bitmap dạng chữ", palette ENDESGA 32, script validate bắt buộc | Miễn phí, tất định, agent làm được, diff đọc được | Chốt |
| 14 | 2026-11-07 | Font: VT323 cho chữ tiếng Việt, bitmap font tự sinh cho số | Có dấu tiếng Việt, OFL miễn phí, nhẹ khi cập nhật số liên tục | Chốt |
| 15 | 2026-11-07 | MVP không có va chạm giữa các đoàn lính trên đường | Giữ sim đơn giản. Cân nhắc lại sau playtest | Chốt (xem lại sau MVP) |
| 16 | 2026-11-07 | **Bản đồ: tháp = phòng ban** trên mặt bằng văn phòng 3/4 (hướng 1 trong map-style-sketches). Bỏ hình "hộp có icon" | Hộp-icon không ra chất văn phòng. Phòng ban có nội thất thì dễ nhận ra và vui hơn | Chốt |
| 17 | 2026-11-07 | Lính là nhân viên **đi theo hành lang** (đồ thị, đường ngắn nhất tính sẵn), không đi đường thẳng | Không xuyên tường. Sim vẫn tất định, chỉ thay `dist` | Chốt |
| 18 | 2026-11-07 | Design system "Office Pixel": panel trắng viền ink, góc vát, bóng cứng, header kiểu mặt tường, biển số kiểu biển cửa. Áp dụng chung cho menu DOM và HUD canvas | Thống nhất với bản đồ. Ít asset hơn phong cách Retro OS và Văn phòng phẩm. HUD không che map | Chốt (có thể chỉnh) |
| 19 | 2026-11-07 | Chỉ tông sáng | Một bộ màu, ít công kiểm tra | Chốt |
| 20 | 2026-11-07 | Màu `accent` của UI là magenta `#b55088`. Màu đội không bao giờ dùng cho nút hay trạng thái | Tránh nhầm UI với phe | Chốt |
| 21 | 2026-11-07 | Không dùng emoji trong sản phẩm, chỉ dùng icon pixel tự vẽ | Emoji khác nhau theo hệ điều hành và không phải pixel | Chốt |
| 22 | 2026-11-07 | Màu giữ chỗ cho màu đội đổi thành `ff00ff`/`ff80ff`/`800080` (ngoài palette) | Bộ cũ trùng màu đang dùng (plum, pink) | Chốt |
| 23 | 2026-11-08 | Bố cục văn phòng: **cố định ở MVP**. Ngẫu nhiên mức 1 + 2 (bộ map + xáo phòng đặc biệt đối xứng) ở V2. Mức 3 (sinh thuật toán + lật gương) đi cùng chế độ D | MVP tập trung cân bằng luật. Ngẫu nhiên phải giữ công bằng 4 phe và tất định theo seed | Chốt |
| 24 | 2026-11-08 | Component canvas (phòng, biển số, HUD) viết thành **hàm vẽ thuần** trong `packages/design` qua interface `Painter`, vẽ ở tỉ lệ S. Lớp mờ dùng dither thay alpha | Một bản vẽ dùng cho cả `/dev/ui` (Canvas2D) và Phaser. Chữ sắc, giữ quy tắc không alpha | Chốt |
| 25 | 2026-11-08 | `success.bg` đổi từ `green-700` sang `green-500` | `green-700` không đạt 4.5:1 với cả chữ trắng lẫn ink (test tương phản bắt được) | Chốt |
| 26 | 2026-11-08 | `office-01` có **2 pantry** (Pantry trên, Căng tin dưới) thay cho Server room | 1 pantry ở giữa hàng trên làm 2 người phía trên lợi thế. Test đối xứng 4 phía bắt buộc profile (loại, khoảng cách) của 4 phòng team giống nhau | Chốt |
| 27 | 2026-11-08 | `step()` sửa state tại chỗ, `World` (map + bảng đường đi) tách khỏi `GameState` | Nhanh, không băm/clone phần tĩnh. Cần bản sao thì dùng `cloneState` | Chốt |
