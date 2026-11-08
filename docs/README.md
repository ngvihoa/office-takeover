# Office Takeover: tài liệu dự án

Game pixel 2D chiến thuật chiếm tháp (thể loại Tower Takeover / Galcon), bối cảnh văn phòng, dành cho đồng nghiệp chơi cùng nhau trên máy tính.

**`docs/` là nguồn sự thật (source of truth).** `research/` chỉ chứa ghi chú khảo sát và nguồn tham khảo.
Khi docs và research mâu thuẫn, **docs thắng**.

| # | Tài liệu | Trả lời câu hỏi |
|---|---|---|
| 01 | [Product brief](01-product-brief.md) | Làm cái gì, cho ai, ràng buộc gì, không làm gì |
| 02 | [Game design (GDD)](02-game-design.md) | Luật chơi, số liệu, tháp, kỹ năng, sự kiện, chế độ, bot |
| 03 | [UX spec](03-ux-spec.md) | Màn hình, luồng, điều khiển, HUD, phản hồi |
| 04 | [Art & audio bible](04-art-audio-bible.md) | Palette, lưới, quy tắc vẽ, danh sách asset, pipeline sinh asset |
| 05 | [Technical design](05-technical-design.md) | Kiến trúc, monorepo, sim, netcode, giao thức, dữ liệu, deploy |
| 06 | [Embed contract](06-embed-contract.md) | Cách virtual office 3D kết nối vào game |
| 07 | [Roadmap](07-roadmap.md) | Các giai đoạn, phạm vi, tiêu chí hoàn thành, backlog |
| 08 | [Decision log](08-decision-log.md) | Các quyết định đã chốt và lý do |
| 09 | [Design system](09-design-system.md) | Token màu, chữ, spacing, chuyển động, component, trạng thái, bố cục màn hình, giọng văn |
| 10 | [Hiệu năng và chơi thử](10-performance-playtest.md) | Đo frame thật, giới hạn kết quả trong orb và quy trình lấy phản hồi người chơi |
| 11 | [Triển khai](11-deploy.md) | Build, D1, Worker, Access, giới hạn request, CI và rollback |
| — | [Sketchbook](../research/sketches.html) | Minh hoạ luật chơi (hình tháp trong đây đã cũ) |
| — | [Map style sketches](../research/map-style-sketches.html) | **Hướng hình ảnh đã chốt** (hướng 1: mặt bằng 3/4) |

## Ký hiệu phạm vi
Mỗi tính năng trong docs được gắn nhãn giai đoạn:
`[MVP]` · `[V1]` · `[V2]` · `[Tuỳ chọn]` · `[Backlog]`. Chi tiết từng giai đoạn ở [07-roadmap.md](07-roadmap.md).

## Quy ước
- Ngôn ngữ tài liệu và UI: **tiếng Việt**. Code, tên biến, commit: tiếng Anh.
- Đơn vị thời gian trong luật chơi: **tick** (1 tick = 100ms, 10 tick = 1 giây).
- Đơn vị khoảng cách: **px logic** trên bản đồ 640×360.
