# 10: Hiệu năng và chơi thử MVP

## Đo lặp lại được

1. `pnpm install --frozen-lockfile`, `pnpm dev`.
2. Mở `/dev/perf` ở cửa sổ đang focus. Đây là **route chỉ có trong dev**: seed 7,
   4 bot (Thường, Dễ, Thường, Dễ), vẫn chạy renderer và tick thật, không tăng tốc sim.
3. Đặt viewport 1280×720 (S=2), DPR=2. Không quay video/chụp ảnh trong lúc đo.
4. Để chạy ít nhất 30 giây sau khởi động. Trong console trình duyệt:
   `window.officeBenchmark()`.
5. Tải lại trang rồi lặp ở 1920×1080 (S=3). Ghi máy, trình duyệt, DPR và trạng thái tăng tốc GPU.

Bộ đo bỏ 120 frame đầu, lưu tối đa 3600 frame, chỉ lấy frame trong trận đang chạy.
FPS tính từ thời gian thực giữa các `prestep`, **không lấy delta đã làm mượt của Phaser**.
`cpuP95Ms` đo từ `prestep` tới `postrender`, không phải thời gian GPU trình bày frame.
`maxSquads` cho biết tải quan sát được; trận seed này không thay cho kiểm tra tải cực đại.
Không so sánh hai lần đo có viewport, DPR hoặc cách chạy trình duyệt khác nhau.

## Điều kiện nghiệm thu 60fps

- Chưa nghiệm thu chỉ bằng Chromium headless trong orb (GPU phần mềm, máy chủ chia sẻ).
- Cần đo trên ít nhất một laptop văn phòng thật, cửa sổ đang focus, cả S=2 và S=3 nếu màn hình hỗ trợ.
- Ghi FPS, p50/p95 thời gian frame, CPU p95 và số đoàn nhân viên tối đa.
- Kiểm tra thêm lúc kéo gom quân, đổi chủ phòng, dùng kỹ năng, âm thanh/hiệu ứng và cuối trận.
- Mục tiêu màn hình 60Hz: xấp xỉ 60fps, phần lớn frame nằm trong ngân sách 16,7ms,
  không giật kéo dài. Ghi nhận frame trễ, không chỉ báo FPS trung bình.

## Kết quả baseline

Ngày 08/11/2026, orb Linux x64, Xeon 2,60GHz, Chromium headless 157,
WebGL ANGLE/SwiftShader (GPU phần mềm), DPR=2, dev build. Không quay video trong lúc đo.

| Viewport | Mẫu / thời gian sau warm-up | FPS | Frame p50 / p95 | CPU p95 | Max squads |
|---|---|---|---|---|---|
| 1280×720 | 766 / 40,5s | 18,9 | 48,5 / 84,2ms | 16,6ms | 8 |
| 1920×1080 | 326 / 35,4s | 9,2 | 103,9 / 151,3ms | 31,8ms | 8 |

Baseline **không đạt 60fps trong môi trường này**. Đây là số nền để so sánh cùng orb,
không phải kết luận về laptop thật. Chưa đánh dấu tiêu chí 60fps hoàn thành.

## Sau khi nối atlas

Cùng môi trường và kịch bản, vẫn dev build, không quay video trong lúc đo:

| Viewport | Mẫu / thời gian sau warm-up | FPS | Frame p50 / p95 | CPU p95 | Max squads |
|---|---|---|---|---|---|
| 1280×720 | 896 / 39,5s | 22,7 | 40,5 / 68,5ms | 14,3ms | 8 |
| 1920×1080 | 357 / 30,6s | 11,7 | 86,0 / 105,6ms | 22,3ms | 7 |

Có cải thiện quan sát được; tải ở S=3 không hoàn toàn giống nhau (7 so với 8 đoàn).
Máy chia sẻ nên không dùng một cặp lần đo để khẳng định mức tăng cố định.
Vẫn chưa đạt 60fps trong orb và chưa nghiệm thu laptop thật.
