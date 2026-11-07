# 06: Embed contract (kết nối virtual office) `[V2]`

Virtual office 3D là **dự án tách biệt**. Game không cần biết office làm bằng công nghệ gì.
Game chỉ công bố hợp đồng dưới đây. Phía office chỉ cần làm 2 việc:
1. Mở iframe tới URL nhúng của game.
2. (Tuỳ chọn) gửi danh tính người dùng.

Nếu office không gửi danh tính, game tự dùng đăng nhập Cloudflare Access như bình thường.

## URL nhúng
```
https://<game-domain>/?embed=1[&room=ABCD][&lang=vi]
```
- `embed=1`: ẩn chrome thừa, nền trong suốt, menu `Esc` có nút "Về văn phòng".
- `room`: vào thẳng lobby của phòng đó (ví dụ mỗi máy arcade trong office gắn một mã phòng).

### Thẻ iframe gợi ý
```html
<iframe src="https://<game-domain>/?embed=1"
        allow="autoplay; fullscreen"
        style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```
Game trả header `Content-Security-Policy: frame-ancestors <office-origin>`. Danh sách origin được phép nằm trong cấu hình Worker.

## Tin nhắn postMessage (phiên bản 1)
```ts
// office → game
{ type: 'ot:init',  v: 1, token?: string, user?: { id: string; name: string; avatarUrl?: string } }
{ type: 'ot:close-request' }                 // office muốn đóng; game hỏi xác nhận nếu đang trong trận

// game → office
{ type: 'ot:ready', v: 1 }                   // game sẵn sàng nhận init
{ type: 'ot:presence', status: 'menu' | 'lobby' | 'in-match', room?: string }
{ type: 'ot:match-end', placement: 1 | 2 | 3 | 4, mode: 'ffa', durationSec: number }
{ type: 'ot:request-close' }                 // người chơi bấm "Về văn phòng"
```
Trình tự: iframe tải xong → game gửi `ot:ready` → office gửi `ot:init` → game vào trang chủ hoặc lobby.

## Quy tắc bảo mật
- Hai phía đều **kiểm tra `event.origin`** theo danh sách cho phép. Gửi tin bằng `targetOrigin` cụ thể, không dùng `'*'`.
- `token` là JWT do office ký, sống ngắn (≤ 5 phút), chứa `sub` và `name`. Game gửi token này lên Worker để xác thực
  bằng khoá công khai (JWKS) của office, rồi đổi lấy session riêng của game, **giữ trong bộ nhớ**
  (cookie bên thứ ba thường bị chặn trong iframe).
- Không bao giờ đặt token trong URL.
- Không có `token` thì bỏ qua `user` (không tin danh tính chưa ký) và dùng Access.

## Việc phía office cần làm (tóm tắt để gửi team office)
1. Thêm một vật thể tương tác (ví dụ máy arcade). Bấm vào thì mở overlay chứa iframe trên.
2. Nhả phím di chuyển (WASD…) khi overlay mở. Đóng overlay khi nhận `ot:request-close`.
3. (Tuỳ chọn) ký JWT ngắn hạn và gửi `ot:init`. Công bố JWKS.
4. (Tuỳ chọn) hiện bong bóng "🎮 đang chơi" trên avatar khi nhận `ot:presence` với `in-match`.

## Mở rộng sau này `[Backlog]`
- `?spectate=<room>&embed=1`: chế độ xem để chiếu lên TV trong văn phòng 3D.
- Đổi phiên bản hợp đồng: tăng `v`. Game hỗ trợ ngược ít nhất 1 phiên bản.
