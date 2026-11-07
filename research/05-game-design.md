# 05: Game design "Office Takeover"

Xem hình minh hoạ ở `sketches.html`, mục 0–7.

## Bối cảnh
Một tầng văn phòng nhìn từ trên xuống. 4 góc là **bàn làm việc** của 4 người chơi. Giữa map có các phòng đặc biệt.
Lính là nhân viên pixel mini. Map mẫu (13 tháp): 4 bàn người chơi, 4 bàn trống, Pantry, 2 Phòng họp, Phòng sếp, Server room.
Map phải **đối xứng** cho chế độ FFA.

## Số liệu khởi điểm (cần playtest để chỉnh)
| Thông số | Giá trị |
|---|---|
| Sinh lính tháp thường | +1/giây, tối đa 30 (cấp 1) / 50 (cấp 2) / 80 (cấp 3) |
| Nâng cấp | tốn 10 lính (cấp 2), 20 lính (cấp 3) |
| Tốc độ lính | khoảng 40 px/giây (map 640 px rộng → băng ngang map trong khoảng 12 giây) |
| Mặc định gửi | 50% |
| Thời lượng FFA | 6 phút. Hết giờ thì so số tháp, hoà thì so tổng lính |

## Tháp
| Tháp | Hiệu ứng | Khắc chế |
|---|---|---|
| Bàn làm việc | Tháp thường | — |
| ☕ Pantry | Sinh +2/giây | Nằm giữa, dễ bị đánh. Chờ hai người khác đánh nhau rồi vào nhặt |
| 📅 Phòng họp | Lính địch tới bị đứng 3 giây ở cửa | Đánh hai hướng cùng lúc, hoặc dùng Deadline |
| 🖥️ Server room | Mỗi giây giết 1 lính địch trong bán kính | Đi vòng, hoặc dồn một đoàn lớn |
| 📋 Bàn HR | Mỗi 5 giây hút 1 lính từ các tháp trung lập gần | Chiếm bàn trống trước |
| 👑 Phòng sếp | 40 lính trung lập. Chủ sở hữu được +20% tốc độ toàn quân | Rất tốn quân, dễ bị đánh úp nhà |
| 🧑‍💻 Thực tập sinh | Tháp tạm 5 lính do kỹ năng tạo ra | Dễ chiếm |

## Kỹ năng (chọn 2 trước trận)
| Kỹ năng | Hiệu ứng | Hồi chiêu |
|---|---|---|
| ⏰ Deadline | Lính của mình nhanh gấp đôi trong 5 giây | 40s |
| ☕ Coffee Break | +15 lính tức thì cho 1 tháp | 60s |
| 📅 Họp đột xuất | Khoá 1 tháp địch 6 giây (không sinh, không gửi) | 45s |
| 📧 Reply All | Mọi đoàn lính địch đang chạy −50% tốc độ trong 4 giây | 50s |
| 🏠 Work From Home | Ẩn số lính 1 tháp với địch trong 10 giây | 60s |
| 🧑‍💻 Thực tập sinh | Đặt 1 tháp 5 lính ở chỗ trống | 30s |

Bot dùng chung danh sách kỹ năng. Cân bằng dần bằng dữ liệu replay.

## Sự kiện ngẫu nhiên (mỗi ~90 giây, báo trước 3 giây, tác động đều lên mọi phe)
| Sự kiện | Hiệu ứng | Vai trò thiết kế |
|---|---|---|
| 👔 Sếp đi ngang qua | Tháp trên đường sếp đi ngừng sinh 5 giây | Xáo trộn, có thể đoán trước |
| 🔌 Mất điện | Sương mù 10 giây, chỉ thấy quanh tháp mình | Cơ hội đánh úp |
| 🎂 Bánh sinh nhật | Mỗi tháp trung lập gửi 3 lính về pantry | Tạo điểm nóng |
| 🧹 Dọn dẹp | Tháp > 50 lính bị cắt còn 50 | **Chống snowball** |
| 📶 Wifi chập chờn | Huỷ mọi tuyến tiếp tế | Phạt người chơi thụ động |
| 🍕 Pizza | Hộp 20 lính trung lập xuất hiện ở bàn trống | Cuộc đua |

Bật/tắt sự kiện trong cài đặt phòng (người chơi nghiêm túc có thể tắt).

## Chế độ chơi (đã gọn lại)
**Định nghĩa:** chế độ chơi là luật của **một trận**. Mọi chế độ dùng chung **lobby 4 ghế**, ghế trống thì bot ngồi.
Bảng xếp hạng, mùa giải, điểm theo phòng ban là **lớp meta** (tính từ lịch sử trận), không phải chế độ.

| | A. Đấu tự do | B. 2 vs 2 | C. Đánh Boss | D. Thử thách ngày |
|---|---|---|---|---|
| Người thật | 1–4 | 2–4 | 1–3 | 1 |
| Cần online cùng lúc | Có (hoặc với bot) | Có | Có (hoặc solo) | Không |
| Thắng khi | Cuối cùng còn tháp, hoặc nhiều tháp nhất lúc hết 6 phút | Đội kia hết tháp, hoặc nhiều hơn lúc hết giờ | Chiếm Phòng sếp trong 8 phút | Chiếm hết với ít lượt gửi nhất / nhanh nhất |
| Điểm riêng | — | Tiếp viện tháp đồng đội, ping "giúp tôi" | Boss AI chiếm 60% map, có đòn đặc biệt theo phase | Cả công ty cùng một map mỗi ngày, có BXH ngày |
| Kế hoạch | **MVP** | Backlog | Backlog | Tuỳ chọn sau MVP |

### Luồng
Màn hình chính → Chọn chế độ → Lobby 4 ghế (mời bằng mã phòng hoặc link, thêm/bớt bot, chọn độ khó bot)
→ Chọn 2 kỹ năng → Trận → Kết quả + replay.

### Chế độ D (Thử thách ngày) để làm gì?
- **Chơi không cần hẹn:** 20 người khó có 4 người rảnh cùng lúc. D là thứ chơi được bất cứ lúc nào, 1–3 phút.
- **So tài công bằng:** mọi người cùng giải một map trong ngày, xếp hạng theo số lượt gửi và thời gian, giống Wordle.
- **Luyện cơ chế:** người mới học cách tính lính, thời điểm gửi, mà không bị người giỏi đè.
- **Không tốn server:** chạy trên trình duyệt, chỉ gửi điểm lên.
- **Nhược điểm:** cần người (hoặc agent) soạn map puzzle hay. Nên làm sau khi chế độ A đã vui.
  Có thể sinh map tự động bằng seed theo ngày và bộ giải kiểm tra map có lời giải.

## Bot AI (đơn giản, đủ dùng)
Bot dạng "utility AI" chạy mỗi 1–2 giây:
1. Với mỗi tháp mình có > ngưỡng, chấm điểm từng đích: `giá trị đích / (lính cần + khoảng cách × hệ số)`.
   Giá trị: pantry > phòng sếp > bàn thường. Cộng điểm nếu đích là tháp địch yếu.
2. Nếu tháp mình bị nhắm (có đoàn địch đang đến), ưu tiên tiếp viện.
3. Độ khó: Dễ (phản ứng chậm 3 giây, lựa chọn có nhiễu), Thường, Khó (dùng kỹ năng, phối hợp đánh 2 hướng).
Boss chế độ C là bot "Khó" cộng script theo phase (ví dụ ở 50% máu: "Họp toàn công ty", khoá 3 tháp).

## Lớp meta (làm sau MVP)
- Hồ sơ: avatar pixel tự chọn (tóc, kính, áo, phụ kiện), tên hiển thị.
- Elo cho A/B, BXH ngày cho D.
- Thành tích vui: "Chưa từng thua trước 9h sáng", "Chiếm phòng sếp 50 lần", "Lật kèo từ 1 tháp".
- Map editor (cho cộng đồng sau này), skin theo mùa (Tết, Trung thu).
- **Không** có bot Slack/Teams, không gửi thông báo đẩy. Người chơi tự vào khi rảnh.

## Lộ trình
| Giai đoạn | Nội dung |
|---|---|
| MVP | `sim` + Phaser client, chế độ A chơi với bot **offline**, 1 map, tháp thường + pantry, 2 kỹ năng, asset sinh bằng code |
| V1 | Online 4 ghế qua Durable Object, mã phòng, đăng nhập Cloudflare Access, kết quả lưu D1 |
| V2 | Đủ loại tháp, kỹ năng, sự kiện, avatar, replay, nhúng virtual office |
| V2.5 (tuỳ chọn) | Chế độ D. Thử thách ngày |
| Backlog | Chế độ B (2v2), chế độ C (Đánh Boss), Elo, map editor, mở cộng đồng |
