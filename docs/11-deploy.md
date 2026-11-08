# 11: Chuẩn bị triển khai và vận hành playtest

## Trạng thái và phạm vi

**Đây là hướng dẫn triển khai thủ công, không phải biên bản đã triển khai.** Chỉ dùng
Cloudflare Free: một Worker phục vụ client production và API telemetry, một D1 riêng,
Access cho nhóm đồng nghiệp. Chưa có phòng online, Durable Objects hay đăng nhập V1
trong mã MVP. Không thêm dịch vụ trả phí.

Trong đợt công việc này, agent **chưa chạy hoặc kiểm chứng trên tài khoản thật** các
bước đăng nhập, tạo D1, migration remote, gắn domain, Access/WAF, deploy, truy vấn và rollback.
Kiểm thử Miniflare/D1 local và build dry-run không chứng minh các bước đó thành công.
Không chia sẻ link trước khi hoàn thành cổng kiểm tra Access ở mục 5.

Mọi lệnh dưới đây chạy từ thư mục gốc repository. Không dán token, cookie hay khóa
tài khoản vào git, ảnh chụp, log chia sẻ hoặc tài liệu.

## 1. Kiểm tra local, không tác động cloud

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @ot/server db:migrate:local
```

`pnpm build` tạo client production rồi chạy `wrangler deploy --dry-run` của server;
**không** upload Worker và **không** áp migration remote. Test HTTP tại
`apps/server/test/worker.test.ts` dùng Miniflare và D1 local: validation, giới hạn 2KB,
30 gói/session/giờ, API 204/400/405/413/404, SPA/static, HEAD/304, CSP allowlist và
lỗi database 500 không lộ chi tiết.

## 2. Xác nhận tài khoản và D1, chỉ tạo nếu chưa có

**Chỉ người vận hành đã được phép mới chạy các lệnh cloud này.** Cần quyền quản lý
Workers, D1, Access và security rules; chọn Workers Free và Zero Trust Free
(nhóm không quá 50 người theo thiết kế). Không chọn nâng gói hay add-on trả phí.

```sh
pnpm --filter @ot/server exec wrangler login
pnpm --filter @ot/server exec wrangler whoami
pnpm --filter @ot/server exec wrangler d1 list
```

`apps/server/wrangler.jsonc` hiện đã có UUID D1 production do người vận hành điền;
agent chưa đối chiếu ID đó với account thật. Xác nhận đúng account, tên database và
UUID trong danh sách trước khi migrate/deploy. Không tạo trùng database đã có.

**Chỉ khi database chưa tồn tại**, người vận hành được phép mới chạy:

```sh
pnpm --filter @ot/server exec wrangler d1 create office-takeover-telemetry
```

Nếu cấu hình còn placeholder toàn số 0 hoặc đang chuẩn bị môi trường mới, điền UUID
do lệnh create trả về vào `database_id`; giữ binding `TELEMETRY_DB`, tên database và
`migrations_dir: "migrations"`. UUID không phải khóa bí mật, nhưng không tự thay ID
production đang có bằng ID môi trường khác.

## 3. Domain, Access và rate limit trước khi mở đường truy cập

### Domain và các đường có thể bỏ qua bảo vệ

Để dùng WAF rate limiting của zone Free, cần một **domain sẵn có thuộc tổ chức,
zone đang active trên Cloudflare Free**. Hướng dẫn này không yêu cầu mua domain.
Không có zone thì chưa đáp ứng được checklist WAF này; dừng lại, không thay bằng
dịch vụ trả phí hoặc tuyên bố đã bảo vệ `workers.dev` bằng rule của zone riêng.

Trong `apps/server/wrangler.jsonc`, thêm hostname thật, không dùng hostname ví dụ:

```jsonc
"routes": [{ "pattern": "game.example.com", "custom_domain": true }]
```

Repository mặc định tắt `workers_dev` và `preview_urls`, chưa khai báo domain thật.
Đó là chủ ý: deploy chưa cấu hình route không tự tạo link playtest công khai.
Giữ cả hai giá trị `false` trong cấu hình, không chỉ tắt ở dashboard vì lần deploy
sau có thể bật lại. `workers_dev: false` **không đủ** để tắt mọi loại URL preview.
Kiểm tra cả Version URLs (trước đây gọi preview URLs), alias, Preview/Deployment URLs
nếu tài khoản dùng tính năng preview mới, domain cũ và route phụ.

### Cloudflare Access: phải áp trước khi chia sẻ link

1. Bật Zero Trust Free cho account. Tạo **self-hosted Access application** cho toàn
   hostname game, không giới hạn riêng `/api` hay trang chủ. Thực hiện trước khi
   gắn hostname vào Worker để tránh cửa sổ truy cập công khai.
2. Policy **Allow** chỉ email đồng nghiệp cụ thể hoặc domain email công ty đã xác
   minh; dùng OTP email hoặc IdP công ty. Không dùng `Everyone`, `Bypass` hay bỏ qua
   `/api/telemetry`/asset. Kiểm tra không có policy theo path cụ thể làm mất bảo vệ.
3. Sau khi Worker tồn tại, có thể thêm lớp Worker-level Access:
   **Workers & Pages → office-takeover → Access → Protect this Worker behind Access
   → All traffic** (không chọn chỉ Previews). Theo tài liệu hiện tại, lớp này bảo vệ
   các route, Custom Domain, `workers.dev` và previews của Worker; kiểm tra policy
   hostname ưu tiên cao hơn không tạo bypass. Không bật bảo vệ toàn account nếu
   việc đó vô tình tác động các ứng dụng khác.
4. Nếu cố ý mở lại `workers.dev`/preview, phải bảo vệ chúng bằng Access trước,
   không coi Access trên Custom Domain là tự bảo vệ hostname khác. WAF rule của
   zone riêng không bao phủ `workers.dev`; vì vậy giữ chúng tắt cho playtest này.

MVP không tự xác thực JWT Access và không lưu danh tính Access vào D1: bảo vệ ở
edge phải đúng. Worker-level Access hiện có hạn chế WebSocket; khi triển khai V1
online phải xem lại lựa chọn hostname-based Access, không coi hướng dẫn MVP là
nghiệm thu WebSocket hay embed đăng nhập chéo site.

### Một rate limiting rule trong gói Free

Ở **zone chứa hostname game**, vào **Security → Security rules → Create rule →
Rate limiting rules** (dashboard cũ có thể ghi Security → WAF).

| Thiết lập | Giá trị |
|---|---|
| Tên | `telemetry-burst` |
| Expression | `(http.request.uri.path eq "/api/telemetry")` |
| Counting characteristic | IP |
| Ngưỡng | 60 requests / 10 giây / IP |
| Action | Block |
| Duration | 10 giây |

Chọn **Deploy** rule, không chỉ lưu draft. Free hiện có **1 rule**, chỉ dùng Path
trong expression này; không thêm điều kiện Host/Method (không có trên Free).
Không cấu hình custom counting expression, custom response hay thời gian 1 phút
vì không thuộc lựa chọn Free tương ứng. Nếu rule Free đã dùng cho việc khác, cần
chủ zone quyết định thay thế; không tự xóa rule cũ hoặc mua thêm quota.

Ngưỡng 60/10 giây là điểm khởi đầu cho khoảng 20 người có thể chung NAT; theo dõi
và điều chỉnh nếu chặn nhầm. Đây không phải quota chính xác toàn cầu: counter ở
edge có độ trễ và phạm vi theo data center. Nó giảm burst trước D1; giới hạn nguyên
tử 30 gói/session/cửa sổ trượt một giờ trong SQL vẫn giữ nguyên. Session UUID có thể
giả mạo, không thay thế Access hay WAF. Gói vượt giới hạn session vẫn trả 204 nhưng
không ghi thêm hàng; WAF block có thể trả 429 trước khi Worker chạy.

## 4. Migration remote, CSP và deploy thủ công

Trước mỗi migration/deploy, lưu commit/build version, ID phiên bản Worker đang ổn
định và bookmark D1 hiện tại (nếu đã có database). Không tự chạy remote migration
trong build, CI hay mỗi lần dev.

```sh
pnpm --filter @ot/server exec wrangler d1 time-travel info TELEMETRY_DB
pnpm --filter @ot/server exec wrangler d1 migrations list TELEMETRY_DB --remote
pnpm --filter @ot/server db:migrate:remote
pnpm --filter @ot/server exec wrangler d1 migrations list TELEMETRY_DB --remote
```

Script remote tương đương `wrangler d1 migrations apply TELEMETRY_DB --remote`.
Đọc danh sách migration trước khi xác nhận; migration đầu tiên là
`0001_telemetry_matches.sql`. `--local` không thay thế bước này. Migration bị lỗi
được hoàn tác riêng, các migration trước đã thành công vẫn được áp dụng.

### Header và quyền nhúng

`assets.run_worker_first: true` bắt **mọi** request static/SPA/API đi qua Worker,
sau đó Worker lấy asset bằng `env.ASSETS.fetch(request)` và thêm header vào response,
giữ status/body/header asset khác như Content-Type, ETag và cache headers.
Không đổi về chỉ `/api/*` vì sẽ bỏ qua CSP trên static assets.

Header có CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()` và HSTS một năm
(không includeSubDomains/preload). CSP dùng `script-src 'self'`: **không** cho script
`unsafe-inline` hay `unsafe-eval`. Canvas Phaser không cần nới script; ảnh/cursor
data/blob và media data/blob được phép, font/audio cùng origin được phép;
`style-src 'self' 'unsafe-inline'` giữ style động Preact hoạt động.

Mặc định CSP có `frame-ancestors 'self'`. Nếu thật sự cần cho một office bên ngoài
nhúng game, đặt biến Worker trong `vars` của `apps/server/wrangler.jsonc` rồi deploy:

```jsonc
"vars": {
  "EMBED_ALLOWED_ORIGINS": "https://office.example.com,https://office.example.com:8443"
}
```

Đây là danh sách phân cách bằng dấu phẩy, không phải JSON array; không phải secret
và không phải biến client `VITE_*`. Chỉ nhận HTTPS origin canonical: hostname ASCII
chữ thường (IDN dùng punycode), IPv6 canonical hoặc hostname kèm port không mặc định.
Không có `/` cuối, path, query, fragment, user/password, wildcard, khoảng trắng nội
bộ hay chỉ thị CSP. Ví dụ `https://office.example.com:443` không canonical, dùng
`https://office.example.com`. Khoảng trắng hai đầu được bỏ, bản trùng được gộp;
entry sai bị bỏ riêng, không mở rộng quyền. Bỏ biến hoặc để rỗng chỉ cho `'self'`.
Không đọc/reflect request `Origin` để cấp quyền nhúng. Không có `X-Frame-Options:
SAMEORIGIN` mâu thuẫn với allowlist ngoài site. Không thêm header đó ở zone/Access.

Đây chỉ là quyền iframe, không triển khai giao thức embed V2, CORS hay bỏ qua Access.
Đăng nhập Access trong iframe/cookie bên thứ ba vẫn phải nghiệm thu trên trình duyệt
thật; không tắt Access để sửa lỗi embed.

```sh
pnpm deploy
```

Script root build toàn dự án rồi chạy deploy của `@ot/server`. Lệnh deploy **ghi lên cloud**;
chỉ chạy sau khi có quyền, database ID thật, migration
remote thành công và Access/WAF đúng. Không deploy trực tiếp client dev server.
Do mọi asset đều gọi Worker, request asset cũng tính vào quota Worker Free; vượt
quota có thể trả 429, không fallback static. Theo dõi usage account, không tự nâng gói.

## 5. Cổng nghiệm thu trước khi chia sẻ

- [ ] Cửa sổ ẩn danh, chưa đăng nhập: `/`, route SPA, JS/font/audio asset và
  `/api/telemetry` đều yêu cầu Access hoặc bị chặn, không trả nội dung game/API thành công.
- [ ] Email được phép vào được, email ngoài policy không vào được. Kiểm tra phiên hết hạn.
- [ ] `workers.dev`, mọi URL phiên bản/preview/alias và domain/route cũ đều tắt hoặc
  đòi Access tương đương; không có đường phụ bỏ qua bảo vệ hay WAF.
- [ ] Sau đăng nhập, DevTools Network thấy security headers trên HTML, JS, font,
  audio, SPA fallback, API hợp lệ và API lỗi. CSP không chặn canvas/cursor/style/font/audio;
  không có yêu cầu nới script policy. Chơi một trận và gửi telemetry thật.
- [ ] Iframe cùng origin hoạt động; nếu dùng allowlist, chỉ origin được khai báo nhúng
  được, origin ngoài danh sách bị CSP chặn. Access vẫn bắt buộc.
- [ ] Kiểm tra WAF đã deploy, thử burst có kiểm soát bằng request lỗi nhỏ (để không
  ghi dữ liệu), xem sự kiện Block/429; xét tác động NAT, không flood hay làm cạn quota.
- [ ] Ghi ID deployment, bookmark D1, thời điểm và kết quả kiểm tra; chỉ sau đó chia sẻ.

Response do Access, WAF, router/platform hoặc lỗi quota tạo **trước khi Worker chạy**
không nằm trong quyền sửa header của mã này. Lỗi do Worker/database/asset fetch ném
ra được đổi thành 500 rỗng có security headers, không đưa SQL/stack vào body.
Không tuyên bố đã kiểm chứng toàn bộ edge từ test local.

## 6. Truy vấn D1 cho playtest

Chỉ người vận hành chạy; không xuất session UUID hoặc dữ liệu hàng chi tiết lên link
công khai. Chạy ở D1 Studio hoặc CLI (các lệnh sau chỉ đọc nhưng vẫn truy cập cloud):

```sh
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --remote --command "SELECT COUNT(*) AS packets, MIN(datetime(received_at, 'unixepoch')) AS first_at, MAX(datetime(received_at, 'unixepoch')) AS last_at FROM telemetry_matches;"
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --remote --command "SELECT build_version, mode, COUNT(*) AS packets, ROUND(AVG(fps), 1) AS avg_fps, ROUND(AVG(frame_p95_ms), 1) AS avg_frame_p95_ms FROM telemetry_matches GROUP BY build_version, mode ORDER BY build_version, mode;"
pnpm --filter @ot/server exec wrangler d1 execute TELEMETRY_DB --remote --command "SELECT browser, os, COUNT(*) AS packets FROM telemetry_matches WHERE received_at >= unixepoch() - 86400 GROUP BY browser, os;"
```

Tách `controlled` khỏi `offline`; AVG các p95 từng trận **không phải** p95 gộp mọi
frame. Dữ liệu tự báo từ trình duyệt có thể giả mạo, beacon có thể mất, opt-out có thể
không gửi; không coi số hàng là số người hay số trận đầy đủ. Schema không lưu IP,
email, JWT/cookie Access, full UA hay GPU. Kiểm tra storage/rows read/write trong
dashboard, giảm tần suất query khi gần quota. Free D1 tối đa 500MB/database,
5GB/account; không tự thêm job lưu trữ hay xóa dữ liệu ở bước chuẩn bị deploy.

## 7. Rollback có kiểm soát

1. Giữ Access và WAF bật; nếu cần, tạm chặn người chơi ở Access trong thời gian xử lý.
2. Kiểm tra phiên bản ổn định trước đó trong **Workers & Pages → Deployments** hoặc:
   `pnpm --filter @ot/server exec wrangler deployments list`.
3. Sau khi xác nhận schema/binding còn tương thích, chạy thủ công:
   `pnpm --filter @ot/server exec wrangler rollback <VERSION_ID>`.
   Có thể chọn Rollback tại dashboard. Kiểm tra lại static, API, CSP và các đường phụ.
4. **Rollback Worker không rollback D1**, không xóa các gói telemetry đã ghi, không
   hoàn tác migration. Giữ migration bổ sung tương thích ngược; ưu tiên bản sửa tiến
   thay vì đảo schema phá dữ liệu. Cloudflare chỉ hỗ trợ rollback trong 100 phiên bản
   mới nhất và thay đổi/xóa tài nguyên binding có thể cản rollback.
5. Nếu thật sự phải phục hồi D1, cần phê duyệt riêng vì Time Travel **ghi đè toàn bộ
   database tại chỗ**, hủy query đang chạy và mất các ghi nhận sau bookmark được chọn.
   Free giữ lịch sử **7 ngày**, không phải 30 ngày của Paid. Ghi bookmark hiện tại,
   thời điểm, tác động mất dữ liệu và export cần thiết trước khi khôi phục:

   ```sh
   pnpm --filter @ot/server exec wrangler d1 time-travel info TELEMETRY_DB
   # Chỉ chạy sau phê duyệt mất dữ liệu, thay bằng bookmark đã lưu trước migration:
   pnpm --filter @ot/server exec wrangler d1 time-travel restore TELEMETRY_DB --bookmark=<BOOKMARK>
   ```

   Kiểm tra lại schema, `d1 migrations list --remote`, row count, bản Worker tương
   thích; lưu bookmark hoàn tác do lệnh restore trả về. Không chạy lại migration
   một cách mù quáng và không xóa database để xử lý lỗi deploy.

## Nguồn chính thức đã đối chiếu (08/11/2026)

- [D1 CLI: create, execute, migrations, Time Travel](https://developers.cloudflare.com/d1/wrangler-commands/).
- [Workers static assets: binding và run_worker_first](https://developers.cloudflare.com/workers/static-assets/binding/).
- [Static assets: quota khi run_worker_first](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- [Custom Domain trong Wrangler](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- [Access cho Workers, phạm vi bảo vệ và thứ tự policy](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
- [workers.dev: Access và tắt route](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- [Version URLs và preview_urls](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).
- [WAF rate limiting: bảng tính năng Free](https://developers.cloudflare.com/waf/rate-limiting-rules/).
- [Tạo rate limiting rule tại zone](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/).
- [Rollback Worker và giới hạn tài nguyên binding](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- [D1 Time Travel và tác động khôi phục](https://developers.cloudflare.com/d1/reference/time-travel/).
- [D1 Free: limits và lịch sử 7 ngày](https://developers.cloudflare.com/d1/platform/limits/).

Tên màn hình và quyền khả dụng có thể thay đổi theo account; bảng giá/tài liệu
không thay thế nghiệm thu trên tài khoản thật. Tất cả checkbox cloud ở trên vẫn
**chưa xác minh**, không đánh dấu chỉ vì test/build local xanh.
