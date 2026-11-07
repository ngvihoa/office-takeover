# Office Takeover: hướng dẫn cho agent

Game pixel 2D chiếm tháp realtime, bối cảnh văn phòng, tối đa 4 người mỗi trận (có bot), desktop-first.

## Đọc trước khi làm

- `docs/` là nguồn sự thật. Bắt đầu từ `docs/README.md`. `research/` chỉ để tham khảo.
- Làm đúng phạm vi giai đoạn hiện tại trong `docs/07-roadmap.md`. Không làm tính năng gắn nhãn `[Backlog]` nếu chưa được yêu cầu.
- Có quyết định kiến trúc mới thì ghi thêm vào `docs/08-decision-log.md`.

## Quy tắc cứng

- **Chỉ dùng công cụ và dịch vụ miễn phí** (Cloudflare Free tier). Không thêm dịch vụ hay thư viện trả phí.
- **Không** tích hợp Slack/Teams, không thông báo đẩy, không chat tự do.
- `packages/sim` phải **thuần và tất định**: chỉ số nguyên, PRNG có seed, không `Math.random`/`Date.now`/DOM/Phaser.
  Mọi con số luật chơi nằm trong `packages/sim/src/config.ts`. Sửa luật thì phải sửa test.
- Renderer chỉ **đọc** state của sim, không sửa.
- UI (DOM và HUD) theo `docs/09-design-system.md`: chỉ dùng token, không border-radius, blur, gradient hay emoji.
- Asset phải theo `docs/04-art-audio-bible.md` và **qua `art/scripts/validate.ts`**. Kèm contact sheet khi báo kết quả.
- UI tiếng Việt có dấu đầy đủ. Code, tên biến, commit dùng tiếng Anh.

## Lệnh

- `pnpm dev`: client (Vite) tại http://localhost:5173. Design system: **http://localhost:5173/dev/ui**
- `pnpm test` (Vitest) · `pnpm typecheck` (tsc -b) · `pnpm lint` (Biome) · `pnpm build`
- Component mới phải có mặt trên `/dev/ui` ở mọi trạng thái.
