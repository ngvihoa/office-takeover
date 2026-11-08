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

Cần Node và pnpm. `pnpm dev` và `pnpm build` tự sinh/validate atlas từ nguồn trong `art/`.
Audio runtime được lưu trong Git, kèm `sourceHash` trong `sfx.json`. Nguồn không đổi thì build
không ghi lại audio, dù máy có hay không có ffmpeg. Khi sửa preset `art/sfx/`, build cần ffmpeg
có encoder libvorbis/aac để sinh lại; thiếu ffmpeg thì báo lỗi, không dùng âm thanh cũ.
`pnpm art:sfx --force` ép sinh lại khi cần (ví dụ chủ động đổi encoder). Commit cả
`apps/client/public/art/sfx.{json,ogg,m4a}` cùng preset đã sửa; không sửa trực tiếp output.
`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` để kiểm tra toàn dự án.

Kiểm thử trình duyệt: chạy `pnpm exec playwright install --with-deps chromium` một lần,
rồi `pnpm test:e2e`. Bộ test thao tác chơi ở S=1/2 và chụp từng phần `/dev/ui` ở S=1/2/3
(DPR=2), kiểm tra màu DOM theo token và canvas pixelated. Xem ảnh trong `playwright-report/`
qua `pnpm exec playwright show-report`; trace/video chỉ giữ khi lỗi. Có thể dùng Chromium
cài sẵn bằng biến `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Đây không phải phép đo 60fps.

`pnpm deploy` build rồi triển khai Worker và static assets; không chạy tự động trong CI.
Trước khi chạy cần cấu hình D1 và chuẩn bị Cloudflare Access theo [hướng dẫn triển khai](docs/11-deploy.md).
Không chia sẻ URL trước khi Access bảo vệ toàn bộ hostname; các bước trên tài khoản thật chưa được nghiệm thu.
