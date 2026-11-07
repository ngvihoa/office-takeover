# 03: UX spec

> Giao diện (màu, chữ, component, trạng thái) theo [09-design-system.md](09-design-system.md). Trong UI, *tháp* gọi là **phòng**,
> *lính* gọi là **nhân viên**.

## 1. Nguyên tắc
1. **Chỉ chuột là chơi được hết.** Bàn phím là lối tắt.
2. **Màn hình 16:9 cố định, không cuộn map.** Canvas logic 640×360, phóng to theo số nguyên, viền letterbox màu nền.
3. **Đọc được trong nửa giây:** màu đội kèm ký hiệu, số lính to, đoàn lính có số.
4. **Không chat tự do,** chỉ emote soạn sẵn.
5. **Âm thanh mặc định nhỏ, tắt được ngay,** vì chơi ở văn phòng.
6. **Tiếng Việt có dấu đầy đủ** ở mọi nơi.

## 2. Màn hình và luồng
```
[Trang chủ] ─┬─ Chơi với bot ──► [Thiết lập trận offline] ──► [Trận] ──► [Kết quả] ─► Chơi lại / Trang chủ
             ├─ Tạo phòng ─────► [Lobby 4 ghế] ──► [Trận] ──► [Kết quả] ─► Tái đấu (cùng phòng) / Trang chủ
             ├─ Vào bằng mã ───► [Lobby 4 ghế]
             ├─ Hướng dẫn ─────► [Trận hướng dẫn]
             └─ Cài đặt
```
| Màn hình | Nội dung | Phạm vi |
|---|---|---|
| Trang chủ | Logo, các nút trên, tên người chơi | MVP |
| Thiết lập trận offline | Số bot (1–3), độ khó từng bot, chọn map | MVP |
| Trận | Canvas game + HUD | MVP |
| Kết quả | Thứ hạng, số tháp, lính đã gửi, tháp đã chiếm, thời gian | MVP |
| Cài đặt | Âm lượng, tắt rung màn hình, chế độ màu cho người mù màu, tỉ lệ gửi mặc định | MVP (cơ bản) |
| Trận hướng dẫn | 3 bước: kéo gửi lính → chiếm trung lập → chiếm tháp bot đứng yên | V1 |
| Lobby 4 ghế | Mã phòng (4 ký tự) + nút copy link, 4 ghế (người / bot Dễ / bot Thường / khoá), trạng thái sẵn sàng, chủ phòng bấm Bắt đầu | V1 |
| Hồ sơ / avatar | Tạo avatar pixel ghép | V2 |

**Công nghệ UI:** menu và lobby làm bằng **DOM (Preact)** chồng lên canvas, dễ làm form và hiển thị tiếng Việt.
Trong trận chỉ dùng Phaser.

## 3. Điều khiển trong trận
| Thao tác | Chuột | Phím | Phạm vi |
|---|---|---|---|
| Gửi lính | Kéo chuột trái từ tháp mình, thả trên đích | — | MVP |
| Gom quân | Một nét kéo đi qua nhiều tháp mình rồi thả trên đích. Mọi tháp đi qua đều gửi | — | MVP |
| Chọn tháp | Click trái tháp mình (Ctrl+click để chọn thêm) | `Space` chọn tất cả | MVP |
| Gửi từ tháp đang chọn | Click phải lên đích | — | MVP |
| Bỏ chọn | Click nền | `Esc` | MVP |
| Chọn bằng khung | Kéo chuột trái trên nền | — | V1 |
| Tỉ lệ gửi | Cuộn chuột (kể cả khi đang kéo) | `1` 25% · `2` 50% · `3` 75% · `4` 100% | MVP |
| Nâng cấp | Double-click tháp mình | `E` (tháp đang chọn) | MVP |
| Kỹ năng | Click icon kỹ năng, rồi click mục tiêu (nếu cần) | `Q`, `W`. Bấm lại hoặc `Esc` để huỷ ngắm | MVP |
| Xem thông số | Rê chuột lên tháp: tooltip (chủ, cấp, sức chứa, tốc độ sinh) | Giữ `Alt` để hiện cho mọi tháp | V1 |
| Tuyến tiếp tế | `Shift` + kéo giữa 2 tháp mình. Click phải lên tuyến để huỷ | — | V2 |
| Emote | Icon góc dưới phải | `T` rồi `1`–`6` | V1 |
| Menu | — | `Esc` khi không có gì đang chọn. Offline thì tạm dừng | MVP |

- Chặn menu chuột phải mặc định của trình duyệt trên canvas.
- Kéo dưới 6px được coi là click.
- **Vùng bấm của một phòng** là toàn bộ hình chữ nhật của phòng (gồm tường), không chỉ biển số.
- Khi kéo, đường gợi ý vẽ **theo hành lang** (đúng đường nhân viên sẽ đi) và kèm số nhân viên sẽ điều.

## 4. HUD
```
┌──────────────────────────────────────────────────────────────┐
│ ■ Bạn 5  ■ Minh 3  ■ Bot A 2  ■ Bot B 1              ⏱ 04:12 │  thanh trên: các phe (số tháp) + đồng hồ
│                                                              │
│                      (bản đồ văn phòng)                      │
│                                                              │
│ [Q ⏰ ▓▓░] [W ☕ ▓▓▓]        Gửi: ■■□□ 50%       😀 👍 😱 🎉  │  thanh dưới: kỹ năng, tỉ lệ, emote
└──────────────────────────────────────────────────────────────┘
```
- **Thông báo sự kiện** `[V2]`: dải băng ở giữa phía trên, đếm ngược 3 giây.
- **Khi đang kéo:** đường chấm từ tháp nguồn tới con trỏ, kèm số lính sẽ gửi ngay cạnh con trỏ.
  Đích hợp lệ thì sáng viền, không hợp lệ thì con trỏ đổi thành dấu cấm.
- Phe bị loại hiển thị gạch ngang trên thanh trên.

## 5. Hiển thị tháp và đoàn lính
- Tháp: thân 24×24, mái màu đội, icon loại tháp ở giữa, chấm cấp trên mái, **ô số lính** phía trên.
- Tháp đang chọn: khung nét đứt nhấp nháy.
- Đoàn lính: cụm 3–6 chấm màu đội, số lính phía trên, đường đi mờ.
- **Chế độ mù màu** `[MVP]`: mỗi đội có thêm một ký hiệu cờ riêng (● ▲ ■ ◆) trên mái và trên đoàn lính.

## 6. Phản hồi (juice)
| Khoảnh khắc | Hình | Âm | Phạm vi |
|---|---|---|---|
| Gửi lính | Tháp nguồn co nhẹ | "pop" | MVP |
| Lính chạm tháp | Số trên tháp nảy | "tick" nhỏ | MVP |
| Chiếm được tháp | Hạt màu đội bung, rung màn hình 2px (tắt được) | "ting" | MVP |
| Mất tháp | Viền đỏ nhấp nháy | âm trầm | MVP |
| Tháp đầy | Viền nhấp nháy chậm | — | V1 |
| Kỹ năng | Icon to giữa màn hình 0.3s | riêng mỗi kỹ năng | MVP |
| Thắng / thua | Màn hình kết quả với avatar | jingle ngắn | MVP |

## 7. Khả năng tiếp cận
- Chế độ mù màu (ký hiệu cờ). Tắt rung màn hình. Thanh âm lượng tổng.
- Cỡ chữ tối thiểu tương đương 16px màn hình. Mọi chữ dùng font có dấu tiếng Việt (xem Art bible).

## 8. Khi chạy trong iframe (virtual office) `[V2]`
- Click vào canvas để focus. Phím tắt chỉ chạy khi iframe đang focus.
- Menu `Esc` có thêm nút **"Về văn phòng"**, gửi `request-close` (xem [06-embed-contract.md](06-embed-contract.md)).
- Ẩn các nút thừa (ví dụ "Đăng xuất") khi đang nhúng.
