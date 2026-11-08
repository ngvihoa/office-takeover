# 09: Design system "Office Pixel"

Hệ thống thiết kế chung cho **bản đồ, HUD (Phaser)** và **menu, lobby (Preact DOM)**.
Hướng hình ảnh đã chốt: **mặt bằng văn phòng 3/4, pixel ấm, tháp = phòng ban** (xem
[map-style-sketches](../research/map-style-sketches.html), hướng 1). Tông sáng duy nhất.
Mọi quy tắc vẽ sprite ở [04-art-audio-bible.md](04-art-audio-bible.md). File này lo phần **giao diện và hệ thống**.

## 0. Nguyên tắc
1. **Bản đồ là nhân vật chính.** UI chỉ chiếm 2 dải 20px trên và dưới, không bao giờ che phòng.
2. **Một ngôn ngữ hình khối:** viền ink 1px, góc vát pixel, bóng đổ cứng xuống dưới. Không blur, không gradient, không bo tròn mượt.
3. **Lấy cảm hứng từ chính văn phòng:** tiêu đề panel giống **mặt tường ghi tên phòng**, con số quan trọng nằm trên **biển cửa**, kết quả trận có **con dấu**.
4. **Màu đội là thiêng liêng.** Màu đội chỉ dùng để chỉ phe. UI không bao giờ dùng màu đội cho nút hay trạng thái.
5. **Không có thông tin chỉ dựa vào màu.** Luôn kèm ký hiệu cờ (● ▲ ■ ◆), chữ hoặc hình.
6. **Không dùng emoji trong sản phẩm.** Emoji hiển thị khác nhau theo hệ điều hành và không phải pixel. Dùng icon pixel tự vẽ (emoji chỉ có trong sketch).

## 1. Hệ toạ độ và tỉ lệ
- **Màn hình logic: 640×360.** Mọi kích thước trong file này là **px logic** (viết `lpx`).
- **Hệ số phóng `S`** = `floor(min(viewportW / 640, viewportH / 360))`, tối thiểu 1. Phần dư là letterbox màu `outside`.
- Canvas Phaser render 640×360 rồi phóng `S`. DOM overlay dùng biến CSS `--s` = S. Mọi kích thước DOM viết dạng `calc(var(--s) * N * 1px)`
  (helper `lpx(N)`), nên menu và canvas **luôn khớp pixel**.
- **Không có giá trị nửa pixel logic.** Tween vị trí luôn làm tròn số nguyên.

### Vùng màn hình trong trận
```
y 0–20     Thanh trên (HUD top): phe + đồng hồ
y 20–340   Toà nhà (bản đồ). Tường ngoài nằm ở y=20 và y=340
y 340–360  Thanh dưới (HUD bottom): kỹ năng, tỉ lệ gửi, emote
x 0–6, 634–640  lề ngoài toà nhà
```
Map phải thiết kế để mọi phòng nằm trong `x 6–634, y 20–340`.

## 2. Token màu
Mọi màu lấy từ ENDESGA 32. Tên token dùng chung cho TypeScript (Phaser) và CSS (DOM). Định nghĩa duy nhất ở `packages/design/src/tokens.ts`.

### 2.1 Primitive (một phần palette hay dùng)
| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `ink` | `#181425` | | `white` | `#ffffff` |
| `gray-100` | `#c0cbdc` | | `gray-300` | `#8b9bb4` |
| `gray-500` | `#5a6988` | | `gray-700` | `#3a4466` |
| `sand` | `#ead4aa` | | `tan` | `#e4a672` |
| `wood` | `#b86f50` | | `wood-dark` | `#733e39` |
| `clay` | `#c28569` | | `skin` | `#e8b796` |
| `plum` | `#68386c` | | `magenta` | `#b55088` |
| `green-900` | `#265c42` | | `green-700` | `#3e8948` |
| `red-700` | `#a22633` | | `orange` | `#f77622` |
| `navy` | `#124e89` | | `cyan` | `#2ce8f5` |

### 2.2 Semantic (UI)
| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg.app` | `gray-500` | Nền ngoài màn hình menu, letterbox (`outside`) |
| `surface.panel` | `white` | Panel, thẻ, chip |
| `surface.sunken` | `gray-100` | Ô nhập, rãnh slider, vùng chìm |
| `surface.wall` | `clay` | Dải tiêu đề panel kiểu "mặt tường" |
| `text.primary` | `ink` | Chữ chính (tương phản 18:1 trên trắng) |
| `text.muted` | `gray-500` | Chữ phụ (5.5:1 trên trắng) |
| `text.inverse` | `white` | Chữ trên nền tối hoặc accent |
| `border` | `ink` | Mọi viền |
| `accent` | `magenta` | Nút chính, focus, mục đang chọn (chữ trắng 4.7:1) |
| `accent.pressed` | `plum` | Nút chính khi nhấn |
| `success` | `green-900` (chữ trên trắng) / `green-500` (nền + chữ ink, 8.4:1) | "Sẵn sàng", thành công |
| `danger` | `red-700` | Lỗi, rời phòng, mất phòng (chữ trắng 7.3:1) |
| `warning` | `orange` | Cảnh báo, sắp hết giờ (chữ ink 6.5:1) |
| `info` | `navy` | Thông báo trung tính, sự kiện (chữ trắng 8.5:1) |
| `focus.ring` | `accent` 1lpx ngoài + `white` 1lpx trong | Viền focus bàn phím |
| `scrim` | `ink` opacity 60% | Nền mờ sau modal (chỉ DOM) |

> `green-700` không đạt 4.5:1 với cả chữ trắng lẫn chữ ink, nên **không dùng làm nền chữ**. Badge "Sẵn sàng" là nền `green-500` + chữ `ink`, hoặc chữ `green-900` trên trắng.

### 2.3 Team (chỉ dùng để chỉ phe)
| Token | Main | Light | Dark | Thảm sàn (tint) | Ký hiệu |
|---|---|---|---|---|---|
| `team.p1` | `#0099db` | `#2ce8f5` | `#124e89` | `#a8c3b8` | ● |
| `team.p2` | `#e43b44` | `#f6757a` | `#a22633` | `#e8a98d` | ▲ |
| `team.p3` | `#63c74d` | `#fee761` | `#3e8948` | `#c4d090` | ■ |
| `team.p4` | `#feae34` | `#fee761` | `#f77622` | `#f0c989` | ◆ |
| `team.neutral` | `#8b9bb4` | `#c0cbdc` | `#5a6988` | `#dccbac` | (không) |

- **Thảm sàn** là màu tính sẵn (sand pha 28% màu đội, trung lập pha 15%). Đây là **ngoại lệ duy nhất** ngoài palette, được khai báo
  trong `palette.hex` mục `derived`. Không dùng opacity để nhuộm lúc chạy.
- Chữ trên nền màu đội: **không đặt chữ trực tiếp lên màu đội**. Dùng biển số (ink + chữ trắng, viền màu đội).

### 2.4 Bản đồ
| Token | Giá trị | Dùng cho |
|---|---|---|
| `map.outside` | `gray-500` | Ngoài toà nhà |
| `map.corridor` | `gray-100`, kẻ ô `gray-300` mỗi 16lpx | Sàn hành lang |
| `map.wall` | `gray-700` | Tường nhìn từ trên (3lpx) |
| `map.wallFace` | `clay`, mép trên `gray-700` 3lpx, đường sáng `skin` 1lpx, chân tường `wood-dark` 1lpx | Mặt tường phía trên (12lpx) |
| `map.carpet` | `sand`, hoa văn caro `tan` 4×4 cách 8 | Sàn phòng (trước khi nhuộm màu đội) |
| `map.path` | màu đội, nét đứt 4/3 | Đường đi của nhóm nhân viên |

## 3. Typography
| Font | Dùng cho | Ghi chú |
|---|---|---|
| **VT323** (OFL, có tiếng Việt) | Mọi chữ: DOM và chữ tĩnh trong canvas | Monospace, số thẳng cột sẵn |
| **Digits 5×7** (bitmap tự sinh) | Số thay đổi liên tục trong canvas: số nhân viên, đồng hồ, số trên nhóm | `0-9 + - / : % ?` |

Thang chữ (lpx, VT323 cần cỡ lớn hơn font thường):
| Token | Cỡ | Line-height | Dùng cho |
|---|---|---|---|
| `type.caption` | 9 | 10 | Tên phòng trên tường, nhãn phụ |
| `type.body` | 11 | 12 | Chữ thường, chip, nút M |
| `type.label` | 13 | 14 | Nút L, tiêu đề thẻ |
| `type.title` | 18 | 18 | Tiêu đề panel |
| `type.display` | 32 | 32 | Logo, mã phòng, kết quả |
| `type.hero` | 44 | 44 | Màn hình chính |

- Chữ in hoa cho tên phòng, nút L, tiêu đề. Chữ thường cho mô tả.
- Một dòng mô tả tối đa khoảng 48 ký tự. Đoạn văn tối đa 3 dòng. Hướng dẫn dài thì chia bước.
- **Kiểm tra dấu:** mọi chuỗi UI chạy qua test hiển thị với bộ ký tự `ẮẰẲẴẶẤẦẨẪẬĐƠƯỚỜỞỠỢỨỪỬỮỰ`.

## 4. Spacing, viền, góc, độ nổi
- **Spacing (lpx):** `0, 2, 4, 6, 8, 12, 16, 24, 32`. Không có giá trị khác.
- **Viền:** luôn 1lpx `ink`.
- **Góc vát pixel:** các panel, nút, chip bỏ **1 pixel ở mỗi góc** (góc "notch"), thay cho bo tròn.
  DOM: `clip-path` theo bước lpx. Canvas: 9-slice có sẵn góc vát.
- **Highlight trong:** 1lpx `white` ở cạnh trên (panel trên nền tối) hoặc 1lpx `gray-100` ở cạnh dưới (đáy nút trắng).
- **Độ nổi** (bóng đổ cứng, chỉ dịch xuống, màu `ink`, không blur):
| Token | Bóng | Dùng cho |
|---|---|---|
| `elev.0` | không | Phần tử chìm, phần tử trên bản đồ |
| `elev.1` | 1lpx | Chip, biển số, tooltip |
| `elev.2` | 2lpx | Nút, panel, thẻ ghế |
| `elev.3` | 3lpx + scrim | Modal |
- **Nhấn nút:** dịch xuống đúng bằng độ nổi (2lpx), bóng còn 0. Đây là "click" vật lý của cả hệ thống.

## 5. Iconography
| Cỡ | Dùng cho |
|---|---|
| 8×8 | Icon trong chữ, trong chip, cờ phe |
| 12×12 | Emote, icon nút M |
| 16×16 | Kỹ năng, icon nút L, icon menu |
- Viền ngoài 1px ink, tối đa 4 màu mỗi icon (không tính ink), ánh sáng từ trên-trái.
- Bộ icon MVP: `play, plus, key, book, gear, copy, check, cross, back, sound-on, sound-off, bot, person, crown, lock, flag-●▲■◆,
  skill-deadline, skill-coffee, clock`.

## 6. Chuyển động
| Token | Thời lượng | Dùng cho |
|---|---|---|
| `motion.instant` | 0ms | Nhấn nút (dịch xuống) |
| `motion.fast` | 80ms | Hover, đổi trạng thái nhỏ |
| `motion.base` | 160ms | Panel hoặc modal vào/ra, tooltip |
| `motion.slow` | 320ms | Banner sự kiện, chuyển màn hình |
| `motion.pulse` | chu kỳ 600ms | Nhấp nháy: phòng hợp lệ khi kéo, kỹ năng sẵn sàng, phòng sắp đầy |

- Easing: `steps(n)` hoặc ease-out, **vị trí luôn làm tròn lpx**. Không dùng hiệu ứng nảy (overshoot) cho UI DOM. Nảy chỉ dùng trong canvas (số nhân viên nảy khi thay đổi).
- Vào màn: trượt 8lpx từ dưới cộng fade (DOM được phép fade opacity, canvas thì không).
- Không rung màn hình khi chiếm phòng; phản hồi chỉ tại phòng bằng màu, hạt và âm báo.
- **Giảm chuyển động** (cài đặt): tắt hạt và nảy, thay trượt bằng xuất hiện ngay, nhấp nháy đổi thành viền tĩnh.

## 7. Âm thanh UI
| Token | Khi nào |
|---|---|
| `ui.click` | Nhấn nút, chọn phòng |
| `ui.confirm` | Sẵn sàng, bắt đầu, xác nhận |
| `ui.back` | Huỷ, quay lại, đóng |
| `ui.error` | Thao tác không hợp lệ (kéo vào phòng không hợp lệ, mã phòng sai) |
| `ui.toggle` | Bật/tắt, đổi tỉ lệ gửi |
Không có âm thanh khi hover (văn phòng). Âm lượng UI theo thanh âm lượng tổng.

## 8. Component

Ký hiệu nơi dùng: **DOM** (Preact) · **CV** (Phaser canvas) · **Cả hai** (phải trông giống hệt nhau).

### 8.1 Button (DOM, CV ở menu tạm dừng)
**Cấu tạo:** viền ink 1 · góc vát · nền · highlight đáy 1 · bóng `elev.2` · [icon 12/16] + nhãn.
| Biến thể | Nền / chữ | Dùng cho |
|---|---|---|
| `primary` | `accent` / `white`, highlight đáy `plum` | Một hành động chính mỗi màn hình |
| `secondary` | `white` / `ink`, highlight đáy `gray-100` | Hành động khác |
| `danger` | `red-700` / `white` | Rời phòng, thoát trận |
| `ghost` | trong suốt / `ink`, không viền, không bóng | Liên kết phụ, "Huỷ" trong modal |

| Cỡ | Cao | Padding ngang | Chữ | Icon |
|---|---|---|---|---|
| `M` | 20 | 8 | `type.body` | 12 |
| `L` | 28 | 12 | `type.label` in hoa | 16 |

| Trạng thái | Hiển thị |
|---|---|
| default | như trên |
| hover | highlight đáy dày lên 2lpx (primary: `plum`, secondary: `gray-100`). Không đổi màu nền (giữ đúng palette) |
| pressed | dịch xuống 2, bỏ bóng, primary đổi nền `plum` |
| focus (bàn phím) | `focus.ring` bao ngoài |
| disabled | nền `gray-100`, chữ `gray-500`, không bóng, con trỏ cấm. **Luôn có lý do** ở tooltip hoặc dòng chữ bên dưới ("Chờ Minh sẵn sàng") |
| loading | nhãn thay bằng 3 chấm chạy theo `steps(3)`, không bấm được |

### 8.2 Icon button (Cả hai)
Vuông 20 (M) hoặc 28 (L), chỉ có icon, **bắt buộc có tooltip**. Trạng thái giống Button secondary.

### 8.3 Panel (DOM)
- Nền `surface.panel`, viền ink, góc vát, `elev.2`.
- **Header kiểu mặt tường** (tuỳ chọn): dải cao 14, nền `surface.wall`, mép trên `gray-700` 3, chữ `type.caption` in hoa màu ink.
  Panel trông như "một căn phòng".
- Padding 8 (gọn) hoặc 12 (thường). Khoảng cách giữa các nhóm bên trong là 8.

### 8.4 Count plate: biển số (Cả hai, component quan trọng nhất)
Biển cửa hiển thị **số nhân viên** của một phòng. Dùng trên bản đồ, trong lobby (số ghế), trong kết quả.
- Viền ink 1 → khung màu đội 1 → lõi ink → số trắng (digits 5×7). Rộng 20 (1 chữ số) / 26 (2) / 32 (3), cao 15.
- Đặt ở **góc trên phải của phòng**, nhô lên tường 5lpx. Vị trí giống nhau ở mọi phòng.
- Trạng thái trên bản đồ:
| Trạng thái | Hiển thị |
|---|---|
| bình thường | như trên |
| thay đổi số | số nảy lên 1lpx trong 80ms (CV) |
| đầy (≥ sức chứa) | khung nhấp nháy `motion.pulse` |
| đang bị tấn công (nhóm địch đang tới) | ô nhỏ cảnh báo 6×6 `danger` bên trái biển |
| bị khoá (Họp đột xuất) `[V2]` | icon `lock` 8×8 thay ô cảnh báo |
| ẩn (WFH) `[Backlog]` | số đổi thành `?` |

### 8.5 Room: phòng trên bản đồ (CV)
Cấu tạo theo thứ tự vẽ: thảm sàn (tint đội) → nội thất (ghế màu đội) → tường (3) + mặt tường trên (12) → cửa (khoảng hở 18, thảm cửa màu đội) → tên phòng trên mặt tường (`type.caption`) + sao cấp → biển số.
| Trạng thái tương tác | Hiển thị |
|---|---|
| hover (phòng mình) | viền trong 1lpx `white` quanh phòng |
| hover (phòng khác) | không đổi (tránh nhiễu) và tooltip sau 400ms |
| được chọn | viền ngoài nét đứt 2/2 màu đội, chạy "kiến bò" `steps` mỗi 160ms |
| đích hợp lệ khi kéo | viền ngoài 1lpx `accent` nhấp nháy `pulse` |
| đích không hợp lệ | con trỏ cấm, không đổi phòng |
| vừa đổi chủ | hạt màu đội bung từ biển số, thảm sàn đổi màu theo `steps(4)` trong 320ms |
| mất phòng | viền đỏ `danger` nhấp nháy 2 lần |
- **Vùng bấm** là toàn bộ hình chữ nhật của phòng (gồm tường), không chỉ biển số.

### 8.6 Nhóm nhân viên (CV)
- 3–6 người 5×7 (tóc, da, áo màu đội), xếp theo đội hình mũi tên hướng đi, bước 2 frame.
- Nhãn số phía trên: hộp ink 18×10, digits trắng.
- Đường đi theo hành lang (`map.path`) chỉ hiện với nhóm **của mình** và nhóm **đang tới phòng của mình**, để giảm nhiễu.

### 8.7 Player chip (Cả hai)
Cao 14: viền ink, nền trắng, cờ phe 6×6 (màu đội + ký hiệu), tên `type.body`, số phòng.
Trạng thái: bình thường · **là bạn** (chữ đậm hơn bằng cách gạch chân 1lpx màu đội) · bị loại (mờ 50% bằng nền `gray-100` + chữ `gray-500`, gạch ngang) · mất kết nối (icon `bot` nhỏ, "bot đang thay").

### 8.8 Skill button (CV)
Vuông 20 (HUD): icon 16, phím tắt góc trên trái (`type.caption`), viền ink, `elev.1`.
| Trạng thái | Hiển thị |
|---|---|
| sẵn sàng | nền trắng, nhấp nháy viền accent 1 lần khi vừa hồi xong |
| đang hồi | lớp ink 60% che từ trên xuống, co dần theo `steps(10)`, số giây ở giữa |
| đang ngắm (cần chọn phòng) | nền `accent`, con trỏ ngắm. `Esc` hoặc click phải để huỷ |
| không dùng được | nền `gray-100` (ví dụ chưa có phòng hợp lệ) |

### 8.9 Send ratio meter (CV)
4 ô 8×8 (25/50/75/100%), ô bật màu `accent`, nhãn % bên phải. Cuộn chuột hoặc phím 1–4 để đổi. Đổi thì ô nảy và phát `ui.toggle`.

### 8.10 Timer (CV)
Chip có icon `clock`. Dưới 60 giây: nền `warning`. Dưới 10 giây: nhấp nháy `pulse`.

### 8.11 Segmented control (DOM)
Thay cho dropdown (dễ dùng hơn, ít code). Ví dụ độ khó bot: `[Dễ | Thường]`, tỉ lệ gửi mặc định.
Các ô liền nhau, ô đang chọn nền `accent` chữ trắng và chìm xuống 1 (không bóng), ô khác nền trắng.

### 8.12 Room code input (DOM)
4 ô vuông 24×28 (`type.display`), tự viết hoa, chỉ nhận ký tự trong bảng mã phòng, tự nhảy ô, dán được.
Sai: rung ngang 2lpx × 3 lần (`ui.error`) và dòng lỗi `danger` bên dưới.

### 8.13 Toggle, checkbox, slider (DOM)
- Toggle 20×10: rãnh `gray-100`, núm trắng viền ink. Bật: rãnh `accent`. Nhãn bên trái.
- Checkbox 10×10: dấu `check` 8×8.
- Slider (âm lượng): rãnh 4 cao `surface.sunken`, phần đã chọn `accent`, núm 8×12 có bóng `elev.1`, bước 10%.

### 8.14 Seat card: thẻ ghế lobby (DOM)
Rộng 132, cao 150, kiểu Panel. Header mặt tường **màu đội của ghế** (ngoại lệ: header ghế được dùng màu đội vì nó *là* phe).
Nội dung: avatar 16×16 phóng ×3 (48) · tên · badge loại (Người / Bot Dễ / Bot Thường / Trống) · trạng thái sẵn sàng.
| Trạng thái | Hiển thị |
|---|---|
| người, chưa sẵn sàng | badge xám, chữ "chưa sẵn sàng" `text.muted` |
| người, sẵn sàng | badge `green-500` + chữ ink "Sẵn sàng" + icon check |
| bot | avatar robot, segmented control chọn độ khó (chỉ chủ phòng thấy) |
| trống | viền nét đứt, nút "+ Thêm bot" và "Mời" (copy link) |
| là bạn | chip "Bạn" ở header |
| mất kết nối | lớp mờ cùng dòng "Đang chờ… 12s" |

### 8.15 Tooltip (Cả hai)
Nền `ink`, chữ trắng `type.body`, padding 4, mũi tên 3lpx, `elev.1`, hiện sau 400ms, rộng tối đa 160.
Tooltip phòng: tên phòng · chủ (cờ + tên) · `nhân viên / sức chứa` · tốc độ tuyển (+1/1s) · cấp.

### 8.16 Banner (CV) và Toast (DOM)
- **Banner sự kiện** `[V2]`: dải cao 20 ở giữa phía trên toà nhà (y 24), nền `info`, chữ trắng in hoa, icon 16, thanh đếm ngược 2lpx. Vào/ra `motion.slow`.
- **Toast** (DOM): góc dưới giữa, Panel nhỏ, tự tắt sau 3 giây. Biến thể `info`/`success`/`danger` bằng dải 3lpx bên trái. Tối đa 2 toast cùng lúc.

### 8.17 Modal (DOM)
Panel có header mặt tường, rộng 280, nằm giữa, scrim, `elev.3`. Luôn có nút Huỷ (ghost) và một nút chính.
`Esc` để đóng, focus bị giữ trong modal. Ví dụ: "Rời trận? Bot sẽ thay bạn." [Ở lại] [Rời trận].

### 8.18 Keycap (Cả hai)
Hộp viền ink, đáy dày 2, `type.caption` in hoa. Dùng trong hướng dẫn, tooltip, nút kỹ năng.

### 8.19 Emote bubble (CV) `[V1]`
Bong bóng trắng viền ink 16×14 cùng icon 12×12, mọc trên **phòng có biển số lớn nhất của người gửi**, sống 2 giây, mỗi người 1 emote mỗi 3 giây.

### 8.20 Result stamp (DOM)
Con dấu xoay **đúng 0°** (không xoay để giữ pixel): khung kép 2lpx, chữ `type.display` in hoa.
`HẠNG 1: THÂU TÓM THÀNH CÔNG` (`danger`), `HẠNG 2–4` (`gray-500`). Vào bằng "đóng dấu": phóng 2→1 theo `steps(3)` cùng rung 1lpx.

## 9. Mẫu bố cục màn hình

### Trang chủ (DOM trên nền mặt bằng toà nhà mờ, không tương tác)
```
┌─────────────────────────────────────────── 640 ─┐
│                                   [chip: Hoà ●] │  y 8
│            OFFICE TAKEOVER (hero)               │  y 60
│         Thâu tóm văn phòng, từng phòng một      │
│              ┌─────────────────┐                │
│              │ ▶ CHƠI VỚI BOT  │ primary L      │  y 150, rộng 200
│              │   TẠO PHÒNG     │ secondary L    │  cách nhau 8
│              │   VÀO BẰNG MÃ   │ secondary L    │
│              └─────────────────┘                │
│ [Hướng dẫn] [Cài đặt]                     v0.1  │  y 336, M
└─────────────────────────────────────────────────┘
```
### Thiết lập trận offline
Panel 400 rộng ở giữa, header "PHÒNG TẬP". 3 hàng ghế bot (cờ + segmented Dễ/Thường + nút bỏ), chọn map, nút `BẮT ĐẦU` primary L.
### Lobby `[V1]`
Panel header "PHÒNG K7QM" + mã (display) + nút copy · 4 seat card ngang (khoảng cách 12) · hàng dưới: kỹ năng (chip) trái, `Rời phòng` (danger M) + `Sẵn sàng` / `BẮT ĐẦU` phải.
### Trong trận
Thanh trên: 4 player chip trái (cách nhau 4), timer phải. Thanh dưới: skill Q, W giữa trái · send meter giữa · emote phải.
### Kết quả
Bản đồ cuối trận mờ phía sau. Panel 420: con dấu · bảng xếp hạng 4 dòng (cờ, tên, phòng cuối, nhân viên đã điều, phòng đã chiếm) · [Chơi lại] primary · [Trang chủ] secondary.
### Cài đặt
Modal: âm lượng (slider), giảm chuyển động (toggle), ký hiệu mù màu (toggle, mặc định bật), tỉ lệ gửi mặc định (segmented).

## 10. Giọng văn (copy)
- Xưng **"bạn"**, câu ngắn, động từ đứng đầu: "Kéo từ phòng của bạn sang phòng khác để điều nhân viên."
- Dùng từ vựng văn phòng nhất quán:
| Khái niệm game | Từ trong UI |
|---|---|
| tháp | **phòng** |
| lính | **nhân viên** |
| gửi lính | **điều nhân viên** |
| chiếm tháp | **thâu tóm phòng** |
| sinh lính | **tuyển** |
| nâng cấp | **mở rộng phòng** |
| bị loại | **bị giải thể** |
- Lỗi: nói cái gì sai và làm gì tiếp. "Không tìm thấy phòng K7QM. Kiểm tra lại mã nhé."
- Hài hước nhẹ ở trạng thái rảnh (loading, kết quả), **không** ở thông báo lỗi.

## 11. Truy cập và nhập liệu
- Tương phản chữ ≥ 4.5:1 (đã kiểm ở mục 2). Kích thước chữ tối thiểu `type.body` × S ≥ 22px thật ở S=2.
- Mọi thứ trong DOM đi được bằng `Tab`, có `focus.ring`. Trong trận dùng phím tắt (UX spec).
- Ký hiệu cờ phe bật mặc định. Bảng màu đội đã chọn để phân biệt được cả khi mù màu đỏ-lục nhờ ký hiệu.
- Con trỏ pixel: `default`, `drag` (khi kéo), `target` (ngắm kỹ năng), `no` (không hợp lệ), `pointer` (DOM). Tất cả 12×12 có hotspot.

## 12. Triển khai
```
packages/design/
  src/tokens.ts          ← nguồn duy nhất: màu, type, spacing, elev, motion (export const)
  src/css.ts             ← tokensCss(): sinh biến CSS cho DOM
  src/icons.ts           ← icon pixel dạng bitmap chữ
  src/paint/painter.ts   ← interface Painter (rect, text) + digits 5×7, góc vát, dither, viền nét đứt
  src/paint/hud.ts       ← countPlate, playerChip, skillButton, sendMeter, timerChip, tooltip
  src/paint/map.ts       ← room (nội thất tự bố trí theo dept), squad, person, path, corridor
apps/client/src/ui/components/   ← Button, Panel, Chip, Segmented, RoomCodeInput, SeatCard, Toggle, Slider, Modal, Toast, Tooltip, Keycap, Stamp
apps/client/src/render/hud/      ← PlayerChip, SkillButton, SendMeter, Timer, Banner (Phaser)
apps/client/src/render/map/      ← Room, CountPlate, Squad
```
- **CSS bắt buộc** cho DOM UI: `image-rendering: pixelated; -webkit-font-smoothing: none; font-smooth: never;`,
  không `border-radius`, không `box-shadow` có blur, không `linear-gradient`.
- **Component canvas là hàm vẽ thuần** gọi qua `Painter`. `/dev/ui` dùng adapter Canvas2D, Phaser sẽ dùng adapter riêng,
  nên hai nơi vẽ giống hệt nhau. Adapter vẽ **trực tiếp ở tỉ lệ S** (toạ độ × S) thay vì vẽ 640×360 rồi phóng, để chữ VT323 sắc nét.
- **Không dùng alpha trong canvas:** lớp phủ "mờ" (hồi chiêu, nền trang chủ) dùng **dither caro** (`dither()`).
- **Trang `/dev/ui`** (chỉ build dev, chạy `pnpm dev` rồi mở `http://localhost:5173/dev/ui`): hiển thị mọi component ở mọi trạng thái, ở S=1, 2, 3. Đây là bản "storybook" miễn phí và là
  điều kiện nghiệm thu cho component mới.
- **Kiểm thử hình** `[V1]`: Playwright (free) chụp `/dev/ui` và so ảnh với bản chuẩn để bắt thay đổi ngoài ý muốn.
- Thêm token hay component mới thì cập nhật file này **trước**, rồi mới code.

## 13. Danh sách component theo giai đoạn

### Giới thiệu trận và ân hạn (MVP)
- Trước tick đầu: 3 giây bản đồ đứng yên, không scrim. Viền `accent` 2lpx quanh
  phòng có seat 0; nhấp nháy mỗi 500ms, giảm chuyển động giữ tĩnh. Nhãn nền trắng,
  chữ ink "PHÒNG CỦA BẠN" và mũi tên pixel nằm bên trong phòng, cạnh dưới (vị trí biển tên bot), để không che
  biển số quân của phòng bên cạnh.
- Bot đang hoạt động có biển tên nền trắng bên trong phòng xuất phát. Đếm ngược
  3–2–1 ở bảng góc vát giữa màn hình, kèm "Click / Space / Enter để bỏ qua";
  "Bắt đầu!" hiện ngắn khi bắt đầu, không giữ khóa lệnh. Sau đó viền accent mảnh
  tĩnh quanh phòng xuất phát giữ trong 10 giây theo tick.
- Thanh dưới thay lời nhắc kỹ năng bằng "Bot chưa tấn công bạn: Ns" trong ân hạn;
  hết ân hạn trả lại lời nhắc. Không dùng màu đội cho các thông báo này.
- `/dev/ui`: 3/2/1, bắt đầu, giảm chuyển động, viền 10 giây, ân hạn 45/1/0 giây.

| Component | Giai đoạn |
|---|---|
| Button, Icon button, Panel, Count plate, Room, Squad, Player chip, Skill button, Send meter, Timer, Segmented, Toggle, Slider, Tooltip, Modal, Keycap, Result stamp | MVP |
| Room code input, Seat card, Toast, Emote bubble, Checkbox | V1 |
| Banner sự kiện, trạng thái khoá phòng | V2 |
