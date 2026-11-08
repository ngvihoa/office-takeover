# Office Takeover

Game pixel 2D chiến thuật chiếm tháp, bối cảnh văn phòng, cho đồng nghiệp chơi cùng nhau trên trình duyệt máy tính.
Tối đa 4 người mỗi trận, ghế trống có bot.

- 📘 Tài liệu: [docs/](docs/README.md)
- 🎨 Sketch ý tưởng: [research/sketches.html](research/sketches.html)
- 🔎 Ghi chú nghiên cứu: [research/](research/README.md)

Trạng thái: đã có bản MVP offline chơi với 1–3 bot, thiết lập độ khó, cài đặt lưu trên máy,
âm thanh/hiệu ứng, kết quả và tải báo cáo JSON. Chưa có chơi online.
Chưa nghiệm thu 60fps trên laptop thật và chưa có kết quả chơi thử từ 3 đồng nghiệp.
Xem [roadmap](docs/07-roadmap.md) và [hướng dẫn đo/chơi thử](docs/10-performance-playtest.md).

```bash
pnpm install --frozen-lockfile
pnpm dev   # mở http://localhost:5173 để chơi; /dev/ui để xem design system
```

Cần Node, pnpm và ffmpeg có encoder libvorbis/aac. `pnpm dev` và `pnpm build`
tự sinh/validate atlas và audio từ nguồn trong `art/`; không cần sửa output sinh tự động.
`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` để kiểm tra toàn dự án.
