# Office Pixel — nguồn và hợp đồng asset MVP

Nguồn chuẩn: `docs/04-art-audio-bible.md`, `docs/09-design-system.md` và
`packages/design/src/`. Chỉ dùng công cụ miễn phí (tsx, pngjs; không dịch vụ ngoài).

## Quy tắc vẽ

- Mặt bằng văn phòng 3/4, ánh sáng trên-trái, viền ink 1px; pixel nguyên.
- ENDESGA 32 trong `palette.hex` phải khớp token design. Chỉ `carpet_<team>` được
  dùng 5 màu sàn `[derived]`. Alpha chỉ 0 hoặc 255, không khử răng cưa.
- Nguồn `src/manifest.ts` gọi trực tiếp painter thuần của design cho nội thất,
  icon và glyph. Không sao chép hình học của các painter sang bitmap khác.
- Nguồn mới: con trỏ và sao cấp trong `src/bitmaps.json` (`.` trong suốt,
  `#` ink, `w` trắng, `y` vàng). `src/label-font.ts` chỉ dùng cho nhãn ảnh duyệt.
- Nhân viên giữ silhouette của painter `person`, bổ sung hướng mặt, 3 sắc áo và
  chân bước xen kẽ để có đủ 4 hướng × 2 frame. Không thêm font runtime.
- Nguồn màu đội sinh một lần vào `out/source/` bằng placeholder `ff00ff`,
  `ff80ff`, `800080`. So sánh hai lần gọi painter với đội p1/p2 để xác định
  chính xác pixel đội (không vô tình nhuộm cả màn hình PC màu cyan).
  `recolor.ts` thay đúng các placeholder, không pha màu, sinh đủ 5 đội.
- Canvas không tự trim: biên trống chỉ được chấp nhận với `canvas.reason` và
  `canvas.pivot` nguyên được khai báo trong nguồn (icon/glyph, hoạt ảnh, con trỏ).
  Chỉ glyph dấu cách có `canvas.blank`. Không thêm ngoại lệ để giấu sprite lỗi.

## Lệnh tái tạo

```sh
pnpm install --frozen-lockfile
pnpm art:build
pnpm art:validate
pnpm art:typecheck
pnpm lint
```

`pnpm dev` và `pnpm build` cũng gọi `art:build` trước client. Không cần trình
duyệt, Canvas, font hệ thống hay dịch vụ mạng khi build. Mỗi bước có thể chạy
riêng bằng `pnpm exec tsx art/scripts/<tên>.ts`:

1. `build-sprites`: painter/bitmap → PNG nguồn + `out/source/manifest.json`.
2. `validate source`: chỉ sprite đội được có placeholder, bắt buộc có ít nhất
   một; nhân viên phải đủ cả 3. Mọi pixel khác theo palette.
3. `recolor`: PNG nguồn → `out/sprites/`, manifest biến thể.
4. `validate output`: cấm mọi placeholder, kiểm alpha, màu, kích thước, biên,
   metadata; thiếu/thừa file hoặc sửa manifest khác nguồn đều thất bại.
5. `pack`: kiểm lại output, xếp atlas, kiểm byte của từng frame, xuất runtime.
6. `contact-sheet`: `out/contact-sheet.png`, đủ tên frame và kích thước, preview
   ×2 trên caro. Không dùng font hệ thống để vẽ nhãn.

Validator nhận thư mục tùy chọn làm đối số thứ ba để kiểm bản sao thử nghiệm:
`pnpm exec tsx art/scripts/validate.ts output /tmp/art-probe`.
`pnpm typecheck` kiểm cả script art. Lệnh lint bật hỗ trợ gitignore để không
format lại JSON sinh tự động trong `out/` và bản copy public (nguồn vẫn được lint).

### Sai khác nhỏ so với bible cần ghi decision log

Dùng shelf packer TypeScript đơn giản thay `free-tex-packer-cli/core`: bộ MVP nhỏ
(164 frame, atlas 512×256), không cần thuật toán đóng gói tổng quát hay dependency
native. Thứ tự tên ASCII cố định, không xoay, không trim, toạ độ nguyên; mỗi cạnh
có 1px extrude + 1px trống. Không ghi thời gian hay đường dẫn máy vào output.
Định dạng JSON hash tương thích Phaser/TexturePacker. Có thể thay packer về sau
mà giữ nguyên tên frame và manifest; không tối ưu thêm ngoài phạm vi MVP.

## Runtime và tích hợp

Build ghi vào `art/out/` rồi copy đúng 4 file vào `apps/client/public/art/`:
`atlas.png`, `atlas.json`, `manifest.json`, `digits.xml`. Các file sinh này đều
gitignore, **không commit**. Contact sheet chỉ ở `art/out/`, không tải lên client.

```ts
// Phaser preload (đường dẫn theo public root):
this.load.atlas('office', '/art/atlas.png', '/art/atlas.json');
this.load.bitmapFont('digits', '/art/atlas.png', '/art/digits.xml');
this.load.json('art-manifest', '/art/manifest.json');
// create:
this.add.image(x, y, 'office', 'person_p1_down_0').setOrigin(0.4, 1);
this.add.bitmapText(x, y, 'digits', '12:34', 7);
```

`atlas.json.frames[name]`: `frame: {x,y,w,h}`, `rotated:false`, `trimmed:false`,
`spriteSourceSize`, `sourceSize`; `meta.image = atlas.png`, kích thước, scale 1.
`manifest.json = {version:1, atlas:'atlas.json', frames: FrameSpec[]}`. Tất cả
metadata tùy chỉnh ở manifest, không dựa vào parser Phaser giữ các field lạ:

- `name`, `width`, `height`: tên và canvas nguyên, không tính padding atlas.
- `team:false` ở output (không còn placeholder); tên frame mang đội nếu có.
- `derived:true` chỉ sàn nhuộm.
- `canvas:{reason,pivot:[x,y],blank?}`: pivot tính bằng pixel từ góc trái-trên;
  nếu cần origin Phaser thì chia lần lượt cho width/height. Không phải pivot
  normalized ngầm trong atlas. Glyph dùng baseline y=7; nhân viên pivot [2,7].
- `hotspot:[x,y]`: con trỏ, tọa độ local. Có PNG riêng trong `out/sprites/` nếu
  client cần trích ra data URL CSS cursor; mặc định [0,0], pointer [4,0], còn lại [5,5].
- `nineSlice:{left,right,top,bottom}`: biên cố định nguyên để gọi Phaser NineSlice;
  panel/nút 3 mỗi cạnh; count plate 3/3/3/4, gồm bóng dưới 1px.
- `animation:{direction,frame,fps:6}`: 2 frame tuần hoàn, không bake phòng.
- `glyph:{codepoint,xAdvance}`: BMFont XML dùng cùng PNG atlas, lineHeight 8,
  size/base 7; advance giữ đúng `digits()` (dấu `:` advance 2, dấu cách advance 4).
- `painterOrigin:[ox,oy]`: gốc `(x,y)` của painter nội thất bên trong sprite.
  Thay lời gọi painter tại `(x,y)` bằng image origin (0,0) tại `(x-ox,y-oy)`.
  Không nhầm field này với pivot chân nhân viên. Bàn PC/phone/tablet/chart/paper,
  sofa, boss_desk, bug_board, easel: [1,1]; cabinet/plant/rack/boss_rug: [0,0];
  pantry: [1,5]; meeting_table: [1,7]; round_table: [9,1]. Pantry nguồn dùng
  counter rộng 38, meeting_table mặt bàn 30×14, boss_rug 40×28: chỉ thay lời gọi
  có đúng kích thước này, lời gọi kích thước khác giữ painter hoặc lắp ghép riêng.

Icon giữ màu native từ `iconPixels(name)`; chỉ các ô `o` trong bitmap `ICONS`
được đổi khi tint, không đổi cả viền ink. Glyph đục luôn trắng để runtime tint.
Raster không có phương thức `sprite`, để các painter gọi lại rect mà không đệ quy.

### Tên frame đầy đủ theo họ

Đội `<team>` luôn là `p1 | p2 | p3 | p4 | neutral`.

| Tên                                                                                                                  | Canvas                                   |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `icon_<IconName>` — mọi key của `packages/design/src/icons.ts` (camelCase, gồm `skillDeadline`, `skillCoffee`, 4 cờ) | canvas gốc: 12×12, kỹ năng 16×16, cờ 7×7 |
| `digit_<codepoint>` — `0–9 + - / : % ? s` và dấu cách, mã Unicode thập phân                                          | 5×7, riêng dấu cách 3×7                  |
| `person_<team>_<up/down/left/right>_<0/1>`                                                                           | 5×7                                      |
| `desk_<pc/phone/tablet/chart/paper>_<team>` (gồm ghế)                                                                | 20×17                                    |
| `meeting_table_<team>`, `round_table_<team>`, `boss_desk_<team>`                                                     | 32×28, 30×14, 38×28                      |
| `cabinet`, `plant`, `rack`, `sofa`, `pantry`                                                                         | 10×16, 11×12, 12×20, 26×11, 40×15        |
| `boss_rug`, `bug_board`, `easel`                                                                                     | 40×28, 22×14, 16×14                      |
| `tile_corridor`, `tile_carpet`, `carpet_<team>`                                                                      | 16×16, 8×8, 8×8                          |
| `wall_horizontal`, `wall_vertical`, `wall_corner`, `wall_face`, `door_frame`                                         | 16×3, 3×16, 3×3, 16×12, 3×12             |
| `door_mat_<team>`                                                                                                    | 18×3                                     |
| `count_plate_<team>` (không bake số)                                                                                 | 20×16                                    |
| `ui_panel`, `ui_button` (không bake nhãn)                                                                            | 12×12                                    |
| `ui_button_pressed` (không bóng, đặt thấp hơn 2px lúc nhấn)                                                          | 12×10                                    |
| `particle_<team>`                                                                                                    | 2×2                                      |
| `cursor_<default/drag/no/target/pointer>`                                                                            | 12×12                                    |
| `level_star`                                                                                                         | 7×7                                      |

Phòng phải lắp ghép lúc chạy. Pantry và bàn họp là mảnh lặp/tái sử dụng, không
sprite toàn phòng. Không bao gồm avatar, emote, logo, nhạc hoặc nội dung V1/V2.

## Âm thanh MVP

`art/sfx/*.json` chứa 10 preset jsfxr 1.4.1 đã chốt tham số, không sinh preset
ngẫu nhiên/noise. `build-sfx.ts` nối PCM mono 44.100Hz/16-bit ở biên sample nguyên,
chừa 250ms im lặng trước/giữa/sau marker, rồi encode **một lần** thành Ogg và M4A.
`pnpm art:build` gọi bước này; cần **ffmpeg có libvorbis và aac** trong PATH.
Output `sfx.json`, `sfx.ogg`, `sfx.m4a` được copy vào public/art và gitignore.
WAV gốc và WAV từng cue chỉ nằm trong `art/out/` để kiểm tra.

Tham số/PCM/marker tất định. Byte codec đã được so sánh qua 2 lần build với
ffmpeg 5.1.9; phiên bản encoder khác có thể sinh byte khác. AAC có padding ở
đuôi, nằm trong khoảng im lặng, không thay đổi vị trí marker.

Runtime dùng sự kiện **đã được sim xác nhận**, không phát âm/hiệu ứng chỉ vì
người chơi gửi yêu cầu. Âm lượng mặc định 40%; HUD tắt âm ngay, không xếp hàng
âm cũ trước khi trình duyệt cho phép phát. Giảm chuyển động mặc định theo hệ
điều hành nếu chưa lưu lựa chọn; tắt rung, hạt, nảy và hoạt ảnh bước chân.
Không thêm nhạc nền hay âm thanh hover.
