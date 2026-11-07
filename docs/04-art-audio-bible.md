# 04: Art & audio bible

Tài liệu này dành cho cả người và agent sinh asset. **Mọi asset phải tuân theo đúng các quy tắc dưới đây và chạy qua script hậu kiểm.**

## 1. Phong cách
- **Mặt bằng văn phòng 3/4** (nhìn từ trên, thấy mặt tường phía trên), tông ấm, vui, hơi hài hước. Tham chiếu hình: [map-style-sketches](../research/map-style-sketches.html) hướng 1.
- Quy tắc giao diện (token, component) ở [09-design-system.md](09-design-system.md).
- Độ phân giải logic **640×360**. Hiển thị phóng to theo số nguyên (×2 ở 1280×720, ×3 ở 1920×1080).
- **Không anti-alias, không pixel bán trong suốt** (alpha chỉ có 0 hoặc 255), không xoay sprite theo góc lẻ.
- Viền ngoài **1px màu ink** (`#181425`). Ánh sáng từ **trên-trái**.

## 2. Palette: ENDESGA 32 (miễn phí)
File chuẩn: `art/palette.hex`. Mọi pixel phải thuộc palette này.
Ngoại lệ duy nhất là 5 màu **thảm sàn nhuộm màu đội** (mục `derived` trong `palette.hex`: `a8c3b8 e8a98d c4d090 f0c989 dccbac`), xem design system mục 2.3.
```
be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633
e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e
124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466
262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569
```
| Vai trò | Màu chính | Sáng | Tối | Ký hiệu mù màu |
|---|---|---|---|---|
| P1 (xanh dương) | `0099db` | `2ce8f5` | `124e89` | ● |
| P2 (đỏ) | `e43b44` | `f6757a` | `a22633` | ▲ |
| P3 (xanh lá) | `63c74d` | `fee761`* | `3e8948` | ■ |
| P4 (vàng) | `feae34` | `fee761` | `f77622` | ◆ |
| Trung lập | `8b9bb4` | `c0cbdc` | `5a6988` | — |
| Ink / viền | `181425` | | | |
| Sàn | `ead4aa` / `e4a672` | | | |

\* Có thể chỉnh sau khi xem thực tế. Quy tắc là **mỗi màu đội có 3 sắc (chính, sáng, tối)**.

### Đổi màu theo đội
Sprite có phần màu đội (ghế, áo nhân viên, thảm cửa) được vẽ **một lần** bằng 3 màu giữ chỗ **nằm ngoài palette**:
`ff00ff` (chính), `ff80ff` (sáng), `800080` (tối). Script build sinh 5 biến thể (P1–P4, trung lập) bằng cách thay đúng 3 màu này.
**Không vẽ tay 5 lần.** Vì màu giữ chỗ nằm ngoài palette, `validate.ts` bắt được nếu bản build còn sót.

## 3. Lưới kích thước
| Loại | Kích thước | Ghi chú |
|---|---|---|
| Phòng | theo map (khoảng 100–144 × 78–90) | **Không phải một sprite.** Lắp ghép lúc chạy: thảm sàn + nội thất + tường + mặt tường 12px + cửa 18px |
| Tile thảm sàn | 8×8 | Nền `sand` + caro `tan`. Bản nhuộm màu đội là màu tính sẵn (xem design system 2.3) |
| Mảnh tường | 16×3 (ngang), 3×16 (dọc), mặt tường 16×12, góc 3×3 | Tile lặp. Có mảnh khung cửa |
| Nội thất | 8–40 × 8–28 | Bàn PC, bàn điện thoại, bàn tablet, bàn biểu đồ, bàn giấy, ghế (màu đội), tủ hồ sơ, cây, rack server, bàn họp, bàn tròn, quầy pantry (máy pha cà phê, tủ lạnh), sofa, bàn sếp, thảm sếp, bảng bug, giá vẽ |
| Nhân viên (lính) | 5×7 | Tóc, da, áo màu đội. 2 frame đi × 4 hướng (lên, xuống, trái, phải) |
| Icon kỹ năng | 16×16 | |
| Icon emote | 12×12 | |
| Avatar | 16×16 | Ghép từ layer: đầu, tóc, kính, áo, phụ kiện `[V2]` |
| Tile sàn / tường | 16×16 | |
| Font số | 5×7 mỗi ký tự | Bitmap font chỉ gồm `0-9 + - / : % ?`, sinh bằng code |
| Hạt hiệu ứng | 2×2 | |

## 4. Font
- **Số thay đổi liên tục** (số lính, đồng hồ): bitmap font 5×7 tự sinh, dùng `BitmapText`.
- **Chữ tiếng Việt** (menu, tooltip, thông báo): **VT323** (Google Fonts, giấy phép OFL, có subset Vietnamese).
  Trong canvas chỉ dùng cho chữ tĩnh. Menu và lobby là DOM nên dùng font web trực tiếp.
- **Cấm** dùng font pixel không có dấu tiếng Việt (ví dụ Press Start 2P).

## 5. Danh sách asset theo giai đoạn
| Asset | Phạm vi |
|---|---|
| Tile hành lang, thảm sàn, tường, mặt tường, khung cửa, thảm cửa (màu đội) | MVP |
| Nội thất cho đủ 13 phòng của `office-01` (danh sách ở mục 3) | MVP |
| Biển số (count plate) 9-slice, sao cấp | MVP |
| Nhân viên 5×7 (2 frame × 4 hướng) | MVP |
| Icon kỹ năng: Deadline, Coffee Break | MVP |
| Con trỏ: mặc định, kéo, cấm, ngắm kỹ năng | MVP |
| Bitmap font số 5×7 | MVP |
| Hạt hiệu ứng thâu tóm phòng | MVP |
| Khung UI 9-slice, nút | MVP |
| Logo "Office Takeover" | V1 |
| Icon emote ×6 | V1 |
| Icon kỹ năng V2, icon sự kiện, sprite "sếp" | V2 |
| Bộ phận avatar | V2 |

## 6. Pipeline sinh asset (toàn bộ miễn phí)
```
art/
  STYLE.md           ← bản rút gọn của file này để agent đọc nhanh
  palette.hex
  src/               ← nguồn: bitmap dạng text hoặc JSON (ma trận ký tự), hoặc PNG vẽ tay
  scripts/
    build-sprites.ts ← src → PNG
    recolor.ts       ← sinh biến thể màu đội
    validate.ts      ← hậu kiểm (bắt buộc)
    pack.ts          ← free-tex-packer-cli → atlas.png + atlas.json
    contact-sheet.ts ← ảnh xem trước toàn bộ asset để duyệt
  out/               ← sản phẩm build (gitignore), copy sang apps/client/public
```
**Nguồn ưu tiên là "bitmap dạng chữ"** (như sketchbook: mỗi ký tự là một màu trong bảng ký hiệu).
Agent sửa dễ, diff git đọc được, kết quả tất định. Có thể dùng skill miễn phí (codixel, Pixel Art Generator) để hỗ trợ.
Cũng có thể vẽ tay PNG bằng phần mềm miễn phí (LibreSprite, Piskel, GIMP).

### `validate.ts` phải kiểm
1. Mọi pixel có alpha ∈ {0, 255}.
2. Mọi màu đục thuộc `palette.hex`.
3. Kích thước đúng theo bảng lưới (theo tiền tố tên file: `tower_`, `icon8_`, `skill_`…).
4. Sprite màu đội có dùng ít nhất 1 màu giữ chỗ. Sprite thường không dùng màu giữ chỗ.
5. Không có hàng hoặc cột trong suốt thừa ở biên (trừ khi khai báo pivot).
Lỗi thì **build thất bại**. Agent phải sửa đến khi qua và kèm contact sheet khi báo kết quả.

## 7. Âm thanh
- Sinh bằng **jsfxr** (miễn phí). Lưu cả tham số preset (JSON) trong `art/sfx/` để tái tạo được.
- Danh sách MVP: `send`, `arrive`, `capture`, `lose`, `skill_deadline`, `skill_coffee`, `countdown`, `win`, `lose_match`, `click`.
- Gộp thành một audio sprite (ogg + m4a). Âm lượng mặc định 40%.
- Nhạc nền `[Backlog]`: chiptune nhẹ có giấy phép CC0, mặc định tắt.
