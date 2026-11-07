# Research: Office Takeover (game pixel 2D kiểu Tower Takeover)

Ghi chú nghiên cứu, cập nhật ngày 2026-11-07.

> **Tài liệu chính thức nằm ở [`../docs/`](../docs/README.md).** Khi hai bên mâu thuẫn, docs thắng.
> Sketchbook chỉ minh hoạ ý tưởng: số liệu và màu sắc chính xác theo docs.

## Mục tiêu (do chủ dự án đặt)
- **Ngắn hạn:** hoàn thiện một game cho đồng nghiệp chơi cùng nhau. Mỗi trận **tối đa 4 người**, có thể trộn người với bot.
- **Trung hạn:** nhúng được vào **virtual office 3D** của công ty.
- **Dài hạn (rất xa):** mở cho cộng đồng.
- Ưu tiên **desktop** (mọi người chơi bằng máy tính).
- **Không** tích hợp bot Slack/Teams, vì gây sao lãng công việc.
- Hosting: chỉ dùng free tier (đang quen Convex free và Cloudflare free).

## Mục lục
| File | Nội dung |
|---|---|
| [01-genre-references.md](01-genre-references.md) | Thể loại tower conquest, game tham khảo, luật cốt lõi |
| [02-ux-desktop-controls.md](02-ux-desktop-controls.md) | UX desktop-first: chuột, phím tắt, HUD |
| [03-visual-assets-agent-skills.md](03-visual-assets-agent-skills.md) | Agent skills và MCP để tạo pixel art, tối ưu performance, pipeline asset |
| [04-tech-stack-hosting.md](04-tech-stack-hosting.md) | So sánh Convex và Cloudflare, stack đề xuất, tính toán free tier |
| [05-game-design.md](05-game-design.md) | Tháp, kỹ năng, sự kiện, chế độ chơi (đã gọn lại), bot |
| [06-virtual-office-integration.md](06-virtual-office-integration.md) | Cách nhúng vào virtual office 3D |
| [sketches.html](sketches.html) | **Sketch trực quan** gameplay: mở bằng trình duyệt để xem |
| [map-style-sketches.html](map-style-sketches.html) | Bản đồ "tháp = phòng ban": mặt bằng 3/4, Blueprint, ghi chú về Isometric |
| [ui-style-sketches.html](ui-style-sketches.html) | So sánh 3 hướng phong cách UI (Retro OS / Pixel game / Văn phòng phẩm) |

## Quyết định chính (đề xuất)
1. **Engine:** Phaser 4 (hiện là 4.2.1, MIT) + TypeScript + Vite. Phaser có bộ agent skills chính thức.
2. **Backend:** toàn bộ trên Cloudflare. Workers phục vụ static assets, **Durable Object cho mỗi phòng đấu**, D1 cho dữ liệu meta. Convex không hợp với vòng lặp game realtime (xem file 04).
3. **Bot:** chạy chung code mô phỏng với server. Trận solo hoặc toàn bot chạy hẳn trên máy người chơi, không tốn server.
4. **Chế độ chơi:** A. Đấu tự do (MVP) → D. Thử thách ngày (tuỳ chọn) → backlog: B. 2v2, C. Đánh Boss.
5. **Asset:** viết style bible trước, rồi sinh sprite bằng code (công cụ miễn phí). Mọi asset qua một script hậu kiểm tất định.

## Đã chốt (2026-11-07)
- Virtual office là **dự án tách biệt**. Game chỉ cần đưa ra một "cổng kết nối" chuẩn (iframe + postMessage), không phụ thuộc office làm bằng gì.
- Khoảng **20 người chơi**, nên Cloudflare Access (miễn phí đến 50 user) là đủ.
- **Chỉ dùng công cụ miễn phí.** Không dùng PixelLab, không mua Aseprite.
- Phạm vi đợt đầu: **chế độ A (Đấu tự do + bot)**. Chế độ D để tuỳ chọn ngay sau MVP. **B (2v2) và C (Đánh Boss) đưa vào backlog.**
