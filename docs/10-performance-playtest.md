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

## Chơi thử với người: chưa thực hiện

MVP hiện là **mỗi người chơi trên máy mình với bot**, không phải nhiều người trong
cùng trận. Chưa có server/lobby online; không dùng buổi này để nghiệm thu V1.
Chưa chỉnh số liệu luật chơi: trận bot Thường × 4 trước đây có trung vị khoảng
60 giây, p90 khoảng 80 giây, chưa chứng minh trải nghiệm của người mới cũng vậy.

Kiểm tra luồng bằng Chromium trong orb: seed 1137046465, một ghế người gần như
không điều quân, 3 bot mặc định, kết thúc do hết giờ ở tick 3600 (360 giây).
Kết quả: Bot An 11 phòng, ghế người 1 phòng, hai bot còn lại 0 phòng.
Chơi lại tạo một canvas mới; về trang chủ không còn game host. Không coi trận
thụ động này là đánh giá độ vui/độ khó, cũng không phủ định vấn đề rush/snowball.

### Một buổi 15–20 phút / người

Mời ít nhất 3 đồng nghiệp; ghi mã A/B/C thay tên thật. Dùng cùng một build,
trình duyệt đang focus, ghi máy, viewport, DPR và bật/tắt hiệu ứng. Không giải thích
chiến thuật trước trận đầu; chỉ chỉ ra cách mở game.

1. Trận đầu: 1 bot Dễ (bỏ Bot Bình và Bot Chi). Quan sát 30 giây đầu:
   người chơi có tự gửi được nhân viên, hiểu màu phe và phòng trung lập không?
   Ghi lúc cần trợ giúp, thao tác nhầm, chỗ không đọc được.
2. Trận hai: mặc định 3 bot (Dễ / Thường / Dễ). Chơi tới kết quả, không bỏ giữa
   trận chỉ vì đã mất lợi thế. Ghi thời điểm người chơi thấy đã thắng/thua chắc.
3. Nếu còn thời gian, chơi lại cùng thiết lập sau khi đã hiểu điều khiển.
   Không gộp trận đầu và trận đã quen tay khi phân tích độ khó.
4. Ở màn kết quả bấm **Tải báo cáo JSON**. File có seed, ghế/độ khó bot,
   lý do kết thúc, tick kết thúc, thứ hạng, phòng còn lại, nhân viên đã điều và
   số lần chiếm phòng (có tính chiếm lại). Không có lịch sử lệnh nên **không phải replay**.
5. Hỏi ngắn: vui ở đâu, khó chịu ở đâu, trận quá ngắn/vừa/quá dài, muốn thử lại không?
   Nếu quá nhanh: thua vì chưa biết thao tác, bị rush, snowball, hay vì không kịp phản ứng?

| Người / lượt | Thiết lập bot | Seed / file JSON | Thời gian trận | Hiểu gửi trong 30s? | Lúc thắng/thua chắc | Nhận xét / muốn chơi lại? |
|---|---|---|---|---|---|---|
| A / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |
| B / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |
| C / 1–3 | Chưa chơi | — | — | — | — | Chờ phản hồi |

### Quyết định về thời lượng sau buổi thử

- Tách thời gian sim (`endTick / 10`) khỏi thời gian nghỉ/tạm dừng thực tế.
- Tổng hợp trung vị, khoảng thời gian và phản hồi theo thiết lập bot / mức quen tay;
  mẫu 3 người chỉ giúp tìm vấn đề, không đủ kết luận cân bằng thống kê.
- So với mục tiêu 4–6 phút, nhưng không kéo dài trận chỉ để đạt con số nếu người chơi
  thấy trận ngắn vẫn vui. Ghi riêng thời gian từ lúc hết cơ hội tới kết quả để nhận diện snowball.
- Nếu cần chỉnh luật, chọn một giả thuyết và một nhóm tham số trong
  `packages/sim/src/config.ts`, sửa test, chạy lại tất định/đối xứng và 1000 trận bot,
  rồi cho người chơi thử lại. Không đổi đồng thời nhiều luật để tránh mất dấu nguyên nhân.
- Chỉ đánh dấu playtest hoàn thành khi đã có người thật và xử lý phản hồi; các ô trống
  ở trên không phải kết quả.
