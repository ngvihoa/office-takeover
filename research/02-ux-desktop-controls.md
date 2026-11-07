# 02: UX desktop-first

Xem hình minh hoạ ở `sketches.html`, mục 2.

## Nguyên tắc
1. **Chỉ chuột là chơi được hết.** Bàn phím là lối tắt cho người chơi giỏi.
2. **Màn hình cố định 16:9, không cuộn map.** Map 4 người phải vừa một màn hình. Render ở độ phân giải thấp (ví dụ 640×360) rồi phóng to theo số nguyên.
3. **Đọc được trong nửa giây:** màu đội kèm biểu tượng, số lính to, đoàn lính có số.
4. **Không chat tự do,** chỉ emote soạn sẵn. Vừa tránh toxic vừa tránh sao lãng.
5. **Trận 4–6 phút,** có đồng hồ đếm ngược, vừa giờ giải lao.

## Bảng điều khiển
| Thao tác | Chuột | Phím |
|---|---|---|
| Gửi lính | Kéo chuột trái từ tháp mình đến đích | Chọn tháp, rồi click phải đích |
| Gom quân | Một nét kéo đi qua nhiều tháp mình rồi đến đích | — |
| Chọn nhiều | Kéo khung trên nền / Ctrl+click | `Space` chọn tất cả |
| Tỉ lệ lính | Cuộn chuột khi đang kéo | `1` 25%, `2` 50%, `3` 75%, `4` 100% |
| Tuyến tiếp tế | `Shift` + kéo | Click phải lên đường để huỷ |
| Kỹ năng | Click icon rồi click mục tiêu | `Q`, `W` |
| Xem thông số | Rê chuột hiện tooltip | Giữ `Alt` để hiện cho mọi tháp |
| Nâng cấp tháp | Double-click tháp mình | `E` khi đang chọn |
| Emote | Icon góc màn hình | `T` rồi `1`–`6` |
| Menu / tạm dừng (solo) | — | `Esc` |

## HUD (bố cục đề xuất)
```
┌──────────────────────────────────────────────────────────┐
│ [P1 ■ 5 tháp] [P2 ■ 3] [P3 ■ 2] [P4 ■ 1]       ⏱ 04:12   │  ← thanh trên: điểm các phe + đồng hồ
│                                                          │
│                     (bản đồ văn phòng)                    │
│                                                          │
│ [Q Deadline ▓▓░] [W Coffee ▓▓▓]   Tỉ lệ: ■■■□ 75%   😀👍😱 │  ← thanh dưới: kỹ năng, % gửi, emote
└──────────────────────────────────────────────────────────┘
```
- Thông báo sự kiện xuất hiện ở giữa phía trên, có đếm ngược 3 giây.
- Con trỏ tuỳ biến dạng pixel. Khi kéo thì hiện đường chấm và số lính sẽ gửi ngay cạnh con trỏ.

## Cảm giác "juicy" (rẻ mà hiệu quả)
- Tháp đổi chủ: rung nhẹ màn hình 2px, bung hạt, âm "ting".
- Lính chạm tháp: con số tháp nảy lên.
- Tháp sắp đầy: nhấp nháy viền, nhắc người chơi gửi đi.
- Âm thanh dùng jsfxr. Có nút tắt tiếng nổi bật, vì chơi ở văn phòng.

## Khả năng tiếp cận
- Màu đội cộng thêm **biểu tượng / hoa văn** để người mù màu vẫn phân biệt được.
- Tuỳ chọn tắt rung màn hình.
- Font pixel phải **có đủ dấu tiếng Việt**. VT323 có subset Vietnamese và hiển thị tốt trong sketch. *Press Start 2P* không có dấu.

## Khi nhúng vào virtual office (iframe)
- Bấm vào để focus. Phím tắt chỉ hoạt động khi iframe đang focus.
- `Esc` mở menu "Thoát về văn phòng".
- Chặn menu chuột phải trong canvas (`contextmenu` → `preventDefault`), vì click phải dùng để gửi lính.
