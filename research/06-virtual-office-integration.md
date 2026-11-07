# 06: Nhúng vào virtual office 3D

> Virtual office là dự án tách biệt. Game **không cần biết** office làm bằng gì. Game chỉ công bố một hợp đồng kết nối
> (URL nhúng + postMessage). Phía office chỉ cần: (1) mở iframe, (2) tuỳ chọn gửi danh tính người dùng.
> Không gửi danh tính thì game dùng đăng nhập riêng của nó (Cloudflare Access).

## Cách tiếp cận đề xuất: iframe kèm hợp đồng postMessage
Game vẫn là một web app độc lập. Thêm **chế độ nhúng** `?embed=1`: ẩn header và menu ngoài, canvas co theo khung, nền trong suốt.

Trong văn phòng 3D có một vật thể, ví dụ **"máy arcade"** ở pantry ảo. Người chơi bấm vào thì mở overlay iframe chứa game.

### Hợp đồng tin nhắn (phiên bản 1)
```ts
// office → game
{ type: 'init', v: 1, token: '<JWT do office ký>', user: { id, name, avatarUrl }, roomCode?: string, locale: 'vi' }
{ type: 'close-request' }                       // office muốn đóng overlay

// game → office
{ type: 'ready', v: 1 }
{ type: 'presence', status: 'lobby' | 'in-match' | 'idle', roomCode?: string }
{ type: 'match-end', result: { placement, mode, durationSec } }
{ type: 'request-close' }                       // người chơi bấm "Về văn phòng"
```
- Luôn kiểm tra `event.origin` theo danh sách cho phép, cả hai phía.
- Office dùng `presence` để hiện bong bóng "🎮 đang chơi" trên đầu avatar 3D, và nút "Vào xem / tham gia" khi đứng gần máy arcade.

### Danh tính
- Office ký JWT ngắn hạn (5 phút) chứa `sub`, `name`. Worker của game xác thực bằng khoá công khai (JWKS) của office,
  rồi đổi sang session riêng của game.
- Không truyền token qua URL query. Chỉ truyền qua `postMessage` sau khi kiểm tra origin.

### Lưu ý kỹ thuật
- iframe cần `allow="autoplay; fullscreen"`. Âm thanh chỉ bật sau khi người dùng tương tác (chính sách trình duyệt).
- Bàn phím: game chỉ nhận phím khi iframe đang focus. Văn phòng 3D phải nhả phím di chuyển (WASD) khi overlay mở.
- Header: game cần cho phép bị nhúng bởi domain office (`Content-Security-Policy: frame-ancestors <office-domain>`).
- Cookie bên thứ ba bị chặn trong iframe ở nhiều trình duyệt, nên **dùng token trong bộ nhớ** thay vì cookie session.

## Nâng cao (sau này)
- **Màn hình TV trong văn phòng 3D chiếu trận đang diễn ra:** game có chế độ `?spectate=<room>&embed=1`, render
  vào canvas rồi dùng làm texture (nếu office là Three.js hoặc Babylon và cùng origin), hoặc chỉ hiện ảnh chụp định kỳ.
- **Phòng đấu gắn với vị trí:** 4 máy arcade ở 4 góc, đứng vào thì tự vào phòng tương ứng.

## Thiết kế cho cộng đồng về sau
- Tách lớp auth thành adapter: `cloudflare-access` | `office-jwt` | `oauth-public`.
- Mã phòng ngẫu nhiên, không lộ email. Tên hiển thị qua bộ lọc từ ngữ.
- Rate limit theo IP/user trên Worker. Nâng lên Workers Paid khi vượt free tier.
