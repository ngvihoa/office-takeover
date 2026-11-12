# 02: Game design document

Hình minh hoạ: [sketchbook](../research/sketches.html) (luật), [map-style-sketches](../research/map-style-sketches.html) (hình bản đồ, hướng 1).
Mọi con số dưới đây là **giá trị khởi điểm**. Chúng nằm
trong một file config của package `sim` và sẽ chỉnh sau playtest.

> **Thuật ngữ.** Trong tài liệu kỹ thuật dùng *tháp* / *lính* / *đoàn*. Trong game và UI, **tháp = phòng (phòng ban)**,
> **lính = nhân viên**, **đoàn = nhóm nhân viên**, gửi lính = *điều nhân viên*, chiếm = *thâu tóm*, sinh lính = *tuyển*.
> Bảng từ vựng đầy đủ ở [09-design-system.md](09-design-system.md) mục 10.

## 1. Vòng lặp cốt lõi `[MVP]`
1. Mỗi tháp mình sở hữu **tự sinh lính** theo thời gian, đến khi đầy.
2. Người chơi gửi một phần lính từ tháp mình sang tháp khác. Lính đi **theo hành lang** (qua cửa phòng) và mọi người đều nhìn thấy.
3. Lính đến tháp **của mình** thì cộng vào. Đến tháp **địch hoặc trung lập** thì trừ lính thủ 1:1.
   Lính thủ về dưới 0 thì tháp **đổi chủ**, số lính dư ở lại giữ tháp. Khi bị chiếm, tháp bị thiệt hại hạ tầng và **giảm 1 cấp độ** (cấp 3 về cấp 2, cấp 2 về cấp 1, tối thiểu cấp 1).
4. Có nhiều tháp thì sinh nhiều lính hơn, nên phải tranh tháp đặc biệt và chọn đúng thời điểm.

## 2. Bối cảnh và bản đồ
- Một tầng văn phòng, **mặt bằng nhìn 3/4 từ trên xuống**. Kích thước logic **640×360**, toà nhà nằm trong `x 6–634, y 20–340`.
- **Mỗi tháp là một phòng ban** hình chữ nhật, có tường, 1–2 cửa, nội thất đúng chức năng. Các phòng nối với nhau bằng **hành lang**.
- 4 góc là **phòng team** của 4 ghế người chơi (Team Dev, Team Design, Team Sales, Team Data). Giữa map là các phòng đặc biệt.
- Map cho chế độ Đấu tự do phải **đối xứng 4 phía** (cả vị trí lẫn độ dài đường đi).
- Tên phòng là dữ liệu trong file map. Có thể đổi theo phòng ban thật của công ty mà không đổi luật.
- Map MVP `office-01` gồm 13 phòng (bố cục như sketch hướng 1):
  | Hàng | Phòng |
  |---|---|
  | Trên | Team Dev (ghế 1) · Kế toán · **Pantry** · Marketing · Team Design (ghế 2) |
  | Giữa | Phòng họp A · **Phòng sếp** · Phòng họp B |
  | Dưới | Team Sales (ghế 3) · HR · **Căng tin** (pantry thứ 2) · QA · Team Data (ghế 4) |
  Có **2 phòng pantry** (Pantry trên, Căng tin dưới) để bản đồ đối xứng 4 phía: mỗi pantry ở giữa 2 phòng team.
  Ở MVP chỉ pantry có cơ chế riêng. Phòng họp và Phòng sếp hoạt động như **phòng thường trung lập** (cơ chế riêng có từ V2).
  Server room dành cho map khác (V2).

### 2.2 Bố cục ngẫu nhiên
Bố cục luôn sinh **tất định từ `seed` của trận**, nên online vẫn đồng bộ và replay vẫn tái tạo được.
Mọi biến thể phải giữ **đối xứng 4 phía** cho chế độ Đấu tự do.

| Mức | Thay đổi mỗi trận | Phạm vi |
|---|---|---|
| 0. Cố định + xáo phòng xuất phát | Một map `office-01`. **Phòng xuất phát của 4 ghế được xáo theo seed** (`seatOrder` / `withSeatOrder`). Màu của bạn luôn là xanh (p1) để dễ nhận ra; chỉ vị trí thay đổi. Công bằng nhờ map đối xứng 4 phía | **MVP** |
| 1. Chọn từ bộ map | Chọn 1 trong N map vẽ tay. Xáo tên phòng ban trung lập (từ danh sách tên), cách bày nội thất | V2 |
| 2. Bán ngẫu nhiên theo khuôn | Map khai báo các **ô** (slot) đối xứng. Phòng đặc biệt (Pantry, Phòng họp, Server) được xáo giữa các ô. Số nhân viên trung lập ±20%, áp đối xứng. Phòng sếp luôn ở trung tâm | V2 |
| 3. Sinh bằng thuật toán | Sinh 1/4 toà nhà (phòng, hành lang) từ seed rồi lật gương. Phải qua bộ kiểm tra: liên thông, khoảng cách đều, kích thước phòng tối thiểu, không quá 16 phòng | Tuỳ chọn (cùng chế độ D) |

- Chủ phòng có thể chọn "Ngẫu nhiên" (mặc định) hoặc một map cụ thể `[V2]`.
- Mọi bộ sinh đều có test tự động chạy hàng nghìn seed (xem roadmap V2).

### Hành lang và đường đi `[MVP]`
- File map khai báo **đồ thị hành lang**: các điểm nút (góc hành lang, cửa phòng) và cạnh nối. Mỗi phòng gắn với 1–2 nút cửa.
- Đường đi giữa hai phòng là **đường ngắn nhất** trên đồ thị (từ cửa phòng nguồn đến cửa phòng đích, chọn cặp cửa ngắn nhất).
  Được **tính sẵn một lần khi nạp map** (Dijkstra, độ dài cạnh làm tròn số nguyên), lưu thành bảng `path[from][to]`.
- Hai phòng có cùng độ dài đường đi: chọn theo thứ tự id nút nhỏ hơn (tất định).
- Đoàn lính đi dọc polyline của đường đi. Luật chỉ quan tâm **độ dài** (`dist`). Hình polyline chỉ để render.

## 3. Thông số cơ bản
| Thông số | Giá trị | Phạm vi |
|---|---|---|
| Tick | 100ms (10 tick/giây) | MVP |
| Lính khởi đầu ở phòng team của người chơi | 10 | MVP |
| Lính phòng trung lập | Kế toán, Marketing, HR, QA: 5 · phòng họp 8 · pantry/căng tin 12 · phòng sếp 40 | MVP |
| Sinh lính cấp 1 / 2 / 3 | +1 mỗi 10 / 8 / 6 tick | MVP |
| Sức chứa cấp 1 / 2 / 3 | 30 / 50 / 80. Đã đầy thì ngừng sinh. Lính gửi đến vẫn cộng được, vượt sức chứa | MVP |
| Nâng cấp | cấp 2 tốn 10 lính, cấp 3 tốn 20 lính (trừ từ chính tháp đó) | MVP |
| Tháp trung lập | **không** sinh lính | MVP |
| Tốc độ lính | 5 px/tick (50 px/giây) dọc hành lang. Đi qua hành lang dài hơn đường thẳng nên tốc độ cao hơn bản cũ | MVP |
| Tỉ lệ gửi | 25 / 50 / 75 / 100%, mặc định 50%. Số gửi = `floor(lính × %)`, tối thiểu 1 | MVP |
| Thời lượng trận Đấu tự do | 3600 tick (6 phút) | MVP |

### Luật chi tiết `[MVP]`
- **Đoàn lính** (squad): `{owner, count, from, to, dist, traveled}`, với `dist = path[from][to].length`. Mỗi tick `traveled += speed`.
  Khi `traveled ≥ dist` thì đến nơi. Dùng toàn **số nguyên** để mô phỏng tất định.
- **Không có va chạm giữa các đoàn trên đường** ở MVP (đoàn đi xuyên qua nhau). Va chạm giữa đường thuộc `[Backlog]`.
- **Thứ tự xử lý trong một tick:** (1) áp lệnh người chơi theo thứ tự server nhận → (2) di chuyển đoàn → (3) đoàn đến nơi,
  xử lý theo `squadId` tăng dần → (4) sinh lính → (5) kỹ năng và sự kiện hết hạn → (6) kiểm tra loại và thắng.
- Tháp đổi chủ thì **giữ nguyên cấp**. Đoàn đã gửi đi vẫn thuộc chủ cũ.
- Chỉ gửi được từ tháp **mình sở hữu** và có ít nhất 1 lính. Không gửi sang chính nó.
- **Bị loại:** không còn tháp nào và không còn đoàn lính nào trên đường.
- **Thắng:** là người cuối cùng chưa bị loại. Hết giờ thì so **số tháp**, rồi **tổng lính** (tháp cộng đường), rồi xử **hoà**.

## 4. Các loại tháp
| Tháp | Hiệu ứng | Khắc chế | Phạm vi |
|---|---|---|---|
| Phòng team / phòng ban thường | Tháp thường | — | MVP |
| ☕ Pantry | Sinh nhanh gấp đôi (chia đôi chu kỳ sinh) | Nằm giữa map, dễ bị đánh | MVP |
| 📅 Phòng họp | Đoàn **địch** đến phải đứng chờ 30 tick ở cửa rồi mới đánh | Đánh hai hướng cùng lúc, hoặc dùng Deadline | V2 |
| 🖥️ Server room | Mỗi 10 tick giết 1 lính của một đoàn địch trong bán kính 80px | Đi vòng, hoặc dồn một đoàn lớn | V2 |
| 👑 Phòng sếp | Chủ sở hữu được +20% tốc độ toàn quân | Tốn quân, dễ bị đánh úp nhà | V2 |
| 📋 HR (cơ chế tuyển dụng) | Mỗi 50 tick hút 1 lính từ mỗi tháp trung lập trong bán kính 120px | Chiếm phòng trung lập trước | Backlog |
| 🧑‍💻 Thực tập sinh | Tháp tạm 5 lính do kỹ năng tạo ra | Dễ chiếm | Backlog |

## 5. Kỹ năng
Mỗi người chọn 2 kỹ năng trước trận (ở MVP chỉ có 2 nên dùng cả hai). Đầu trận mọi kỹ năng đang hồi **300 tick (30 giây)**.

| Kỹ năng | Phím | Hiệu ứng | Hồi chiêu | Phạm vi |
|---|---|---|---|---|
| ⏰ Deadline | Q | Mọi đoàn của mình chạy nhanh gấp đôi trong 50 tick | 400 tick | MVP |
| ☕ Coffee Break | W | +15 lính tức thì cho 1 tháp của mình (được vượt sức chứa) | 600 tick | MVP |
| 📅 Họp đột xuất | — | Khoá 1 tháp địch 60 tick: không sinh lính, không gửi được | 450 tick | V2 |
| 📧 Reply All | — | Mọi đoàn địch đang chạy chậm 50% trong 40 tick | 500 tick | V2 |
| 🏠 Work From Home | — | Ẩn số lính 1 tháp mình với địch trong 100 tick | 600 tick | Backlog |
| 🧑‍💻 Thực tập sinh | — | Đặt 1 tháp 5 lính ở ô trống | 300 tick | Backlog |

## 6. Sự kiện ngẫu nhiên `[V2]`
- Khoảng mỗi **900 tick** (±150, theo PRNG có seed) xảy ra một sự kiện. Báo trước **30 tick**. Tác động lên mọi phe như nhau.
- Chủ phòng có thể tắt sự kiện trong cài đặt phòng.

| Sự kiện | Hiệu ứng | Vai trò | Phạm vi |
|---|---|---|---|
| 🎂 Bánh sinh nhật | Mỗi tháp trung lập gửi 3 lính về Pantry | Tạo điểm nóng | V2 |
| 🧹 Dọn dẹp | Tháp > 50 lính bị cắt còn 50 | Chống snowball | V2 |
| 🍕 Pizza | Một phòng trung lập ngẫu nhiên +20 lính trung lập | Cuộc đua | V2 |
| 👔 Sếp đi ngang | Tháp trên đường sếp đi ngừng sinh 50 tick | Xáo trộn | Backlog |
| 🔌 Mất điện | Sương mù 100 tick, chỉ thấy trong bán kính 100px quanh tháp mình | Đánh úp | Backlog |
| 📶 Wifi chập chờn | Huỷ mọi tuyến tiếp tế | Phạt chơi thụ động | Backlog |

## 7. Tuyến tiếp tế `[V2]`
`Shift` + kéo từ tháp A (của mình) sang tháp B (của mình) tạo tuyến. Mỗi khi A sinh 1 lính, lính đó tự đi sang B.
Mỗi tháp tối đa 1 tuyến ra. Tháp A đổi chủ thì tuyến bị huỷ.

## 8. Chế độ chơi
**Định nghĩa:** chế độ chơi là luật của **một trận**. Mọi chế độ dùng chung **lobby 4 ghế**, ghế trống do bot ngồi.
Bảng xếp hạng, mùa giải… là lớp meta, không phải chế độ.

| Chế độ | Mô tả | Thắng khi | Phạm vi |
|---|---|---|---|
| **A. Đấu tự do** | 4 phe, mỗi người một mình; 1–4 người thật, còn lại là bot | Xem mục 3 | **MVP** (offline với bot) · **V1** (online) |
| D. Thử thách ngày | Puzzle 1 người, cả công ty cùng một map mỗi ngày, map sinh từ seed theo ngày, giới hạn số lượt gửi | Chiếm hết với ít lượt nhất, rồi nhanh nhất | Tuỳ chọn |
| B. Đồng đội 2 vs 2 | Hai đội cùng màu, được tiếp viện tháp đồng đội | Đội kia bị loại hết / nhiều tháp hơn lúc hết giờ | Backlog |
| C. Đánh Boss | 1–3 người đấu với Boss AI chiếm sẵn 60% map | Chiếm Phòng sếp trong 8 phút | Backlog |

**Chế độ D dùng để làm gì:** chơi không cần hẹn nhau (20 người khó rảnh cùng lúc), so tài công bằng kiểu Wordle,
luyện cơ chế cho người mới, không tốn server. Chỉ làm sau khi chế độ A đã chơi vui.

## 9. Bot AI
Bot là "utility AI" chỉ đọc state qua API của `sim` và phát **lệnh giống hệt người chơi**. Không được gian lận (ví dụ thấy qua sương mù).

Mỗi lần ra quyết định (chu kỳ tuỳ độ khó):
1. Nếu một tháp mình sắp bị chiếm (đoàn địch đang đến lớn hơn số lính thủ), gửi tiếp viện từ tháp gần nhất có dư lính.
2. Ngược lại, với mỗi tháp mình có lính > ngưỡng, chấm điểm từng đích:
   `score = value(target) / (troopsNeeded + distance × k)`.
   `value`: pantry 3 · phòng sếp 2 · phòng team 1,4 · phòng thường 1; +0,4 nếu là phòng của phe khác.
   **Không hùa:** phòng đang bị một phe thứ ba đánh thì giá trị × 0,6 (bỏ điểm cộng "đánh phe sắp chết" cũ, vốn khiến
   cả 3 bot cùng dồn vào người chơi đang yếu). `troopsNeeded` = lính thủ + lính sinh thêm trong lúc đoàn đi + 2.
3. Chỉ gửi khi số gửi đủ để chiếm.
4. Dùng kỹ năng khi có cơ hội (Deadline khi đang đánh tháp giá trị cao, Coffee khi tháp sắp mất).
5. **Ân hạn đầu trận:** trong **450 tick (45 giây)** đầu, bot không gửi quân vào phòng của người chơi thật,
   chỉ chiếm phòng trung lập và đánh nhau. Mục đích: người chơi có thời gian định hướng (playtest 08/11: người thật bị loại ở giây 105).

| Độ khó | Chu kỳ quyết định | Chọn mục tiêu | Gom quân | Nâng cấp / kỹ năng | Phản ứng phòng thủ | Gửi thiếu (sai sót) | Phạm vi |
|---|---|---|---|---|---|---|---|
| Dễ | 40 ± 8 tick | Ngẫu nhiên trong top 4 | Không | Không | 60% số lần | 20% | MVP |
| Thường | 15 ± 3 tick | Trong 5% của nước tốt nhất | Có | Có | Luôn | 0% | MVP |
| Khó | 10 tick | Phối hợp đánh 2 hướng | Có | Có | Luôn | 0% | V2 |

Có thêm hồ sơ `novice` (45 ± 10 tick, top 5, phòng thủ 50%, gửi thiếu 25%) **chỉ dùng trong test** để đóng vai
người chơi lần đầu. Mục tiêu cân bằng: `novice` ở ghế người chơi thắng **25–45%** trước đội hình mặc định
Dễ/Thường/Dễ (đo được 31,5% trên 600 trận, vị trí xuất phát ngẫu nhiên). Không có ân hạn thì chỉ thắng khoảng 6%.

Ở online, người chơi mất kết nối **> 15 giây** thì bot "Dễ" tạm thay ghế đó, cho đến khi người chơi vào lại `[V1]`.

## 10. Lớp meta
| Tính năng | Phạm vi |
|---|---|
| Lịch sử trận cá nhân | V1 |
| Hồ sơ: tên hiển thị + avatar pixel ghép (đầu, tóc, kính, áo, phụ kiện) | V2 |
| Replay (lưu seed + danh sách lệnh) | V2 |
| Thành tích vui ("Chiếm phòng sếp 50 lần", "Lật kèo từ 1 tháp"…) | Backlog |
| Elo / bảng xếp hạng | Backlog |
| Map editor, skin theo mùa | Backlog |
