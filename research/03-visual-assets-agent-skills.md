# 03: Visual asset bằng agent skills, và tối ưu performance

> Lưu ý: đây là kết quả khảo sát. **Chưa cài và chưa test** skill nào. Skill cộng đồng có thể chạy script,
> nên phải **đọc kỹ SKILL.md và code trước khi cài**.

> **Chốt: chỉ dùng công cụ miễn phí.** Loại PixelLab (trả phí). Aseprite chỉ dùng nếu tự build từ source (miễn phí theo EULA)
> hoặc thay bằng LibreSprite (fork mã nguồn mở, nhưng các Aseprite MCP **chưa chắc** tương thích). Mặc định đi theo hướng
> **sinh sprite bằng code + script Node** (pngjs/sharp, free-tex-packer-cli), không cần phần mềm vẽ.

## A. Skill / MCP cho pixel art

| Tên | Loại | Cách hoạt động | Hợp cho | Ghi chú |
|---|---|---|---|---|
| **PixelLab MCP** (`pixellab-mcp` trên npm) | MCP + API AI | Sinh pixel art từ text: nhân vật, animation, tileset, inpaint, style transfer | Avatar đồng nghiệp, lính có animation đi, boss | Cần API key pixellab.ai (có phí theo credit). Chất lượng AI pixel art tốt nhất hiện có |
| **Aseprite MCP** (willibrandon Go / letsagents TS / rkdfx Python) | MCP điều khiển Aseprite qua Lua | Vẽ primitive, layer, palette, export spritesheet + JSON | Chỉnh sửa, ép palette, xuất atlas | Cần cài Aseprite (khoảng $20, hoặc tự build từ source) |
| **pixel-art-creator** (willibrandon) | Skill dùng kèm Aseprite MCP | Tạo sprite, layer bằng ngôn ngữ tự nhiên | Icon, tháp đơn giản | Phụ thuộc Aseprite MCP |
| **codixel** (mankidev) | Skill + `core/pixel.js` | Hướng dẫn agent quy trình sprite, animation, hiệu ứng (lửa, khói, tia), có bước tự kiểm tra | Hiệu ứng, sprite bằng code | Khoảng 60 sao GitHub, JS, không cần API trả phí |
| **Pixel Art Generator** | Skill | Agent chọn lưới, palette, rồi xuất toạ độ pixel dạng JSON và render ra PNG | Icon 8×8 / 16×16, UI | Tất định, rẻ, hợp với icon văn phòng |
| **Pixel Art Sprites** (absolutelyskilled) | Skill kiến thức | Quy tắc 8/16-bit: silhouette, palette, đặt pixel có chủ đích | Làm style guide cho agent | Chỉ là kiến thức, không có tool |
| **Agent Sprite Forge** | Skill cho Codex | Sinh ảnh bằng image-gen, rồi script Python hậu kiểm: tách nền, cắt frame, căn ô, xuất PNG/GIF | — | Viết cho Codex, nhưng **ý tưởng hậu kiểm bằng script tất định rất đáng copy** |

### Pipeline asset đề xuất cho agent
```
1. Style bible (người viết, agent đọc)   → /art/STYLE.md + /art/palette.hex
   - Lưới: tháp 24×24, lính 6×6, icon 8×8, avatar 16×16
   - Palette cố định khoảng 24–32 màu (ví dụ Endesga 32) + 4 màu đội + 1 xám trung lập
   - Viền đen 1px, ánh sáng từ trên-trái, không anti-alias, không bán trong suốt
2. Sinh asset
   - Tháp, icon, UI      → sinh bằng code (Pixel Art Generator / codixel), miễn phí và lặp lại được
   - Avatar, lính        → sinh bằng code theo "bộ phận ghép" (đầu, tóc, áo, phụ kiện là các layer bitmap nhỏ ghép lại)
   - Màu đội             → vẽ 1 bản dùng "màu giữ chỗ", lúc chạy thì tint hoặc đổi palette, không vẽ 4 lần
3. Hậu kiểm tất định (script trong repo, agent BẮT BUỘC chạy)
   - Ép về palette (quantize), xoá pixel bán trong suốt
   - Kiểm tra kích thước đúng lưới, không thừa viền trong suốt
   - Gộp atlas (free-tex-packer-cli) → atlas.png + atlas.json
   - Xuất contact sheet (ảnh xem trước) để người duyệt bằng mắt
4. Người duyệt contact sheet → commit
```
Lý do: model AI rất hay sinh pixel "giả" (pixel không đều, anti-alias, lệch palette). Bước 3 biến kết quả
ngẫu nhiên thành asset sạch và thống nhất. Sketch trong `sketches.html` cũng vẽ icon từ bitmap 8×8 dạng chuỗi,
chính là cách "sinh bằng code" ở trên.

## B. Skill cho engine và performance

| Tên | Nội dung |
|---|---|
| **Phaser official skills** (thư mục `skills/` trong repo `phaserjs/phaser`) | 28 skill chính thức cho Phaser 4: scene, animation, camera, input, physics, tween, filter/postFX, tilemap, particle, setup; có skill migrate v3→v4. MIT |
| **phaser-gamedev** (chongdashu/phaserjs-tinyswords) | Skill cộng đồng có phần performance: pooling, batching, culling, texture atlas |
| **cloudflare/skills** (`durable-objects`, Workers…) | Skill chính thức của Cloudflare cho backend: DO, WebSocket, SQLite, alarms |

> Phaser AE (phaser.io/cli/agents) là sản phẩm **thương mại** của Phaser Studio, license khác. Không cần dùng.

### Checklist performance cho game này
- `pixelArt: true` và `roundPixels: true`, phóng to theo số nguyên. Canvas logic 640×360.
- **Một texture atlas** (≤ 2048²) cho toàn bộ sprite, giảm draw call.
- **Object pool** cho lính. Mỗi đoàn lính là một nhóm nhỏ sprite (hoặc particle emitter), không tạo/huỷ liên tục.
- Không vẽ lại `Graphics` mỗi frame. Đường gửi lính tĩnh thì vẽ một lần vào RenderTexture.
- Số và chữ dùng **BitmapText** (font bitmap có dấu tiếng Việt), không dùng `Text` (rất tốn khi đổi số liên tục).
- Mạng: server gửi **sự kiện** ("đoàn lính X xuất phát tick T từ A đến B"), client tự nội suy vị trí. Không stream toạ độ.
- Âm thanh: sprite âm thanh (một file, nhiều đoạn).
- Mục tiêu: 60fps trên laptop văn phòng, bundle < 2MB, tải < 2 giây.

## Nguồn
- [codixel – GitHub](https://github.com/mankidev/codixel) · [codixel – skillsllm](https://skillsllm.com/skill/codixel)
- [Pixel Art Generator skill](https://mcpmarket.com/tools/skills/pixel-art-generator) · [PixelForge skill](https://mcpmarket.com/tools/skills/pixelforge-game-asset-generator)
- [Pixel Art Creator skill](https://www.skillsdirectory.com/skills/willibrandon-pixel-art-creator) · [Pixel Art Sprites](https://claudemarketplaces.com/skills/absolutelyskilled/absolutelyskilled/pixel-art-sprites)
- [Agent Sprite Forge](https://www.skillsdirectory.com/skills/reason-machines-agent-sprite-forge)
- [PixelLab MCP – npm](https://npmjs.com/package/pixellab-mcp)
- [aseprite-mcp (rkdfx)](https://github.com/rkdfx/aseprite-mcp) · [aseprite-mcp (letsagents)](https://github.com/letsagents/aseprite-mcp)
- [Phaser repo (skills/)](https://github.com/phaserjs/phaser) · [Phaser skills mirror](https://skills-hub.ai/sources/phaser)
- [phaser-gamedev skill](https://agent-skills.md/skills/chongdashu/phaserjs-tinyswords/phaser-gamedev)
- [cloudflare/skills – durable-objects](https://claudemarketplaces.com/skills/cloudflare/skills/durable-objects)
