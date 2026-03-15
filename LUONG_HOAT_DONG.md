# REALSEARCH - LUỒNG HOẠT ĐỘNG & LOGIC VẬN HÀNH

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng đăng ký & đăng nhập](#2-luồng-đăng-ký--đăng-nhập)
3. [Luồng WebSocket & kết nối client](#3-luồng-websocket--kết-nối-client)
4. [Luồng phân phối task (Job Dispatcher)](#4-luồng-phân-phối-task-job-dispatcher)
5. [Luồng thực thi task trên client](#5-luồng-thực-thi-task-trên-client)
6. [Hệ thống Credit](#6-hệ-thống-credit)
7. [Luồng tạo & quản lý Job](#7-luồng-tạo--quản-lý-job)
8. [Hệ thống thanh toán](#8-hệ-thống-thanh-toán)
9. [Hệ thống cấp bậc (Tier)](#9-hệ-thống-cấp-bậc-tier)
10. [Hệ thống khuyến mãi & Referral](#10-hệ-thống-khuyến-mãi--referral)
11. [Chống phát hiện (Anti-Detection)](#11-chống-phát-hiện-anti-detection)
12. [Lịch hẹn giờ & System Tray](#12-lịch-hẹn-giờ--system-tray)
13. [Tự động cập nhật Client](#13-tự-động-cập-nhật-client)
14. [Giao diện người dùng (Web)](#14-giao-diện-người-dùng-web)
15. [Giao diện quản trị (Admin)](#15-giao-diện-quản-trị-admin)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINUX VPS (36.50.232.108)                    │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ FastAPI   │  │PostgreSQL│  │  Redis  │  │  Next.js Admin  │ │
│  │ + WS     │  │    16    │  │    7    │  │   (port 3000)   │ │
│  │(port 8000)│  │          │  │         │  │                 │ │
│  └─────┬────┘  └──────────┘  └─────────┘  └─────────────────┘ │
│        │                                                        │
│  ┌─────┴────┐  ┌─────────────────┐                             │
│  │  Nginx   │  │ Next.js Web User│                             │
│  │ (SSL)    │  │   (port 3001)   │                             │
│  └─────┬────┘  └─────────────────┘                             │
└────────┼────────────────────────────────────────────────────────┘
         │
         │ HTTPS / WSS
         │
   ┌─────┴──────────────────────────────────────┐
   │              │                │             │
┌──┴────┐  ┌─────┴──────┐  ┌─────┴──────┐  ┌──┴─────┐
│ Admin │  │ Client 1   │  │ Client 2   │  │Web User│
│Browser│  │(Windows PC)│  │(Windows PC)│  │Browser │
└───────┘  └────────────┘  └────────────┘  └────────┘
```

**4 thành phần chính:**

| Thành phần | Công nghệ | Chức năng |
|------------|-----------|-----------|
| **Server** | FastAPI + PostgreSQL + Redis | API, WebSocket, Job Dispatcher, Credit |
| **Web User** | Next.js + shadcn/ui | Giao diện người dùng: tạo job, nạp tiền, quản lý |
| **Admin** | Next.js + shadcn/ui | Quản trị: users, jobs, settings, monitoring |
| **Client** | Python + Playwright + PyInstaller | Ứng dụng Windows chạy task tự động |

**Background tasks chạy khi server khởi động:**
1. **Job Dispatcher** - phân phối task mỗi 5 giây
2. **SePay Poller** - kiểm tra thanh toán SePay tự động
3. **Tier Expiry Checker** - hạ cấp user khi tier hết hạn

---

## 2. LUỒNG ĐĂNG KÝ & ĐĂNG NHẬP

### 2.1. Đăng ký tài khoản

```
Người dùng (Web)                              Server (FastAPI)
     │                                              │
     │── POST /auth/register ──────────────────────>│
     │   {username, email, password,                │
     │    full_name, referral_code}                  │
     │                                              │
     │                                   ┌──────────┤
     │                                   │ Kiểm tra:│
     │                                   │ • Rate limit: max 3 đăng ký/IP/24h
     │                                   │ • Email/username trùng?
     │                                   │ • Hash password (bcrypt 12 rounds)
     │                                   │ • Tạo referral_code 8 ký tự
     │                                   │ • Nếu có referral_code → liên kết referred_by
     │                                   │ • Tạo User trong DB
     │                                   │ • Gọi apply_welcome_bonus()
     │                                   │   → Tìm promotion type=welcome_bonus đang active
     │                                   │   → Cộng 1,000,000 credits
     │                                   │   → Tạo CreditTransaction(PROMOTION)
     │                                   │ • Tạo JWT tokens
     │                                   └──────────┤
     │                                              │
     │<── {access_token (30 phút),  ────────────────│
     │     refresh_token (7 ngày)}                   │
     │                                              │
     │── Lưu tokens vào localStorage ──>            │
     │── Set flag show_welcome_bonus ──>            │
     │── Redirect /dashboard ──────────>            │
     │                                              │
     │   [Dashboard hiện Welcome Dialog]            │
     │   "Chào mừng! +1,000,000 Credits"           │
```

### 2.2. Đăng nhập

```
Người dùng                                   Server
     │                                         │
     │── POST /auth/login ────────────────────>│
     │   {username_or_email, password}         │
     │                                         │
     │                              ┌──────────┤
     │                              │ • Tìm user bằng username HOẶC email
     │                              │ • Verify bcrypt password
     │                              │ • Kiểm tra is_active
     │                              │ • Tạo JWT access + refresh tokens
     │                              └──────────┤
     │                                         │
     │<── {access_token, refresh_token} ───────│
     │── Redirect /dashboard ─────>            │
```

### 2.3. Refresh Token

```
Khi access_token hết hạn (30 phút):

Client                                        Server
  │── POST /auth/refresh ────────────────────>│
  │   {refresh_token}                         │
  │                                ┌──────────┤
  │                                │ • Decode refresh_token
  │                                │ • Verify type == "refresh"
  │                                │ • Kiểm tra user tồn tại & is_active
  │                                │ • Tạo access_token mới + refresh_token mới
  │                                └──────────┤
  │<── {new_access_token, new_refresh_token} ─│
```

---

## 3. LUỒNG WEBSOCKET & KẾT NỐI CLIENT

### 3.1. Kết nối & xác thực

```
Client (Windows App)                          Server (FastAPI WebSocket)
     │                                              │
     │── WSS connect ──────────────────────────────>│
     │   wss://api.realsearch.techreal.vn/ws       │
     │                                              │
     │── Gửi AUTH message ────────────────────────>│
     │   {                                          │
     │     "type": "auth",                          │
     │     "data": {                                │
     │       "token": "jwt_access_token",           │
     │       "machine_id": "sha256(hostname+mac)",  │
     │       "os_info": "Windows 11 x86_64",        │
     │       "browser_mode": "headed_hidden",        │
     │       "enabled_job_types": ["viewlink",       │
     │         "keyword_seo", "backlink", "social"], │
     │       "max_concurrent": 1,                    │
     │       "client_version": "0.8.0"              │
     │     }                                        │
     │   }                                          │
     │                                   ┌──────────┤
     │                                   │ • Verify JWT (access type)
     │                                   │ • Fetch User từ DB
     │                                   │ • Kiểm tra is_active
     │                                   │ • Kiểm tra max_clients (theo tier)
     │                                   │   Bronze=1, Silver=2, Gold=3, Diamond=5
     │                                   │ • Tạo ClientConnection object
     │                                   │ • Lưu session vào DB (is_online=True)
     │                                   │ • Thêm vào connection pool
     │                                   └──────────┤
     │                                              │
     │<── AUTH_RESULT ─────────────────────────────│
     │   {                                          │
     │     "type": "auth_result",                   │
     │     "success": true,                         │
     │     "session_id": "uuid",                    │
     │     "server_config": {                       │
     │       "heartbeat_interval": 30,              │
     │       "task_timeout": 300,                   │
     │       "max_concurrent": 1                    │
     │     }                                        │
     │   }                                          │
     │                                              │
     │                                              │
     │ ┌────── VÒNG LẶP CHÍNH ────────────────────┤
     │ │                                            │
     │ │── Heartbeat mỗi 30 giây ────────────────>│
     │ │   {"type": "heartbeat",                    │
     │ │    "cpu_usage": 35.2,                      │
     │ │    "memory_usage": 48.5}                   │
     │ │                                            │
     │ │<── task_assign (khi có task) ─────────────│
     │ │<── credit_update ─────────────────────────│
     │ │<── broadcast ─────────────────────────────│
     │ │<── force_update ──────────────────────────│
     │ │                                            │
     │ └───────────────────────────────────────────┤
     │                                              │
     │ [KHI NGẮT KẾT NỐI]                         │
     │                                   ┌──────────┤
     │                                   │ • ClientSession.is_online = False
     │                                   │ • Cập nhật stats (completed, failed)
     │                                   │ • Xóa khỏi connection pool
     │                                   │ • Task đang chạy → reset PENDING
     │                                   └──────────┤
```

### 3.2. Auto-reconnect (Client)

```
Khi mất kết nối:
  1. Đợi 5 giây → thử kết nối lại
  2. Thất bại → đợi 10 giây
  3. Thất bại → đợi 20 giây
  4. ... tăng dần, tối đa 60 giây
  5. Khi kết nối lại thành công → reset delay về 5 giây
  6. Trước khi kết nối: refresh token nếu gần hết hạn
```

---

## 4. LUỒNG PHÂN PHỐI TASK (JOB DISPATCHER)

### 4.1. Công thức tính ưu tiên

```
PRIORITY SCORE = job.priority × 10              (user đặt 1-10)
               + tier.priority_level × 5        (bronze=1, silver=3, gold=6, diamond=10)
               + job.admin_priority × 8          (admin boost 0-10)
               + (1 - completion_ratio) × 30     (chưa xong nhiều = ưu tiên cao)
               + min(giờ_từ_lần_cuối × 2, 20)   (lâu không xử lý = tăng ưu tiên)

VÍ DỤ:
• User Kim Cương, priority=8, admin boost=5:
  score = 8×10 + 10×5 + 5×8 + ... = 170+  (rất cao)

• User Đồng, priority=5, không admin boost:
  score = 5×10 + 1×5 + 0×8 + ... = 55+    (thấp hơn nhiều)

→ Job Kim Cương được phân phối TRƯỚC và NHIỀU HƠN
```

### 4.2. Vòng lặp phân phối (mỗi 5 giây)

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISPATCH_ONCE()                              │
│                                                                  │
│  1. Lấy danh sách clients RẢNH                                  │
│     (active_tasks < max_concurrent & heartbeat OK)               │
│                                                                  │
│  2. Lấy jobs ACTIVE (status=ACTIVE, chưa hoàn thành), limit 50  │
│                                                                  │
│  3. Tính priority score cho mỗi job                              │
│     (tra tier từ MembershipTierConfig)                           │
│                                                                  │
│  4. Sắp xếp giảm dần theo score                                 │
│                                                                  │
│  5. Với mỗi client rảnh:                                         │
│     ┌───────────────────────────────────────────────────────┐    │
│     │  slots = max_concurrent - active_tasks                │    │
│     │                                                       │    │
│     │  Với mỗi job (score cao → thấp):                      │    │
│     │    SKIP nếu:                                          │    │
│     │    ✗ Đã assign trong cycle này                        │    │
│     │    ✗ Client không hỗ trợ job_type                     │    │
│     │    ✗ Client là chủ job (không tự view chính mình)     │    │
│     │    ✗ Job đã đạt daily_limit                           │    │
│     │    ✗ Job đã hết credit_budget                         │    │
│     │    ✗ Chủ job không đủ credit trả                      │    │
│     │                                                       │    │
│     │    NẾU OK:                                            │    │
│     │    → Tạo Task(status=ASSIGNED, started_at=now)        │    │
│     │    → Gửi task_assign qua WebSocket đến client         │    │
│     │    → Thêm task_id vào client.active_tasks             │    │
│     │    → slots -= 1                                       │    │
│     │    → Nếu hết slots → chuyển client tiếp theo          │    │
│     └───────────────────────────────────────────────────────┘    │
│                                                                  │
│  6. Commit tất cả vào DB                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3. Xử lý kết quả task

```
Client gửi task_completed
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│  1. CẬP NHẬT TASK                                             │
│     • status = COMPLETED                                      │
│     • completed_at = now                                      │
│     • result_data = {...}                                     │
│     • time_spent = (completed_at - started_at).seconds        │
│                                                               │
│  2. CẬP NHẬT JOB                                             │
│     • completed_count += 1                                    │
│     • today_count += 1                                        │
│     • credit_spent += credit_per_view                         │
│     • Nếu completed_count >= target_count → COMPLETED         │
│                                                               │
│  3. TRỪ CREDIT CHỦ JOB (ATOMIC)                              │
│     • owner.credit_balance -= credit_per_view                 │
│     • owner.total_spent += credit_per_view                    │
│     • Tạo CreditTransaction(SPEND_JOB, -credit)              │
│     • Nếu balance < credit_per_view → AUTO-PAUSE job          │
│       + gửi thông báo cho chủ job                             │
│                                                               │
│  4. CỘNG CREDIT NGƯỜI CHẠY (với hệ số tier)                  │
│     • multiplier = {bronze:1.0, silver:1.2, gold:1.5, dia:2.0}│
│     • credits = int(credit_per_view × multiplier)             │
│     • worker.credit_balance += credits                        │
│     • worker.total_earned += credits                          │
│     • Tạo CreditTransaction(EARN_TASK, +credits)             │
│     • Gửi credit_update qua WebSocket                        │
│                                                               │
│  5. KIỂM TRA REFERRAL BONUS                                  │
│     • Nếu worker có referred_by:                              │
│       - Đếm tasks đã hoàn thành của worker                   │
│       - Nếu >= 10 VÀ chưa có REFERRAL transaction:           │
│         → Cộng 50 credits cho người giới thiệu               │
│         → Tạo CreditTransaction(REFERRAL, +50)               │
│         → Gửi credit_update cho người giới thiệu             │
│                                                               │
│  6. COMMIT TẤT CẢ (atomic)                                   │
│                                                               │
│  7. Cập nhật trạng thái client:                               │
│     • active_tasks.discard(task_id)                           │
│     • tasks_completed += 1                                    │
│     • credits_earned += earned                                │
└───────────────────────────────────────────────────────────────┘
```

### 4.4. Task thất bại / từ chối

```
TASK_FAILED:
  • retry_count += 1
  • Nếu retry_count >= max_retries (mặc định 2):
    → status = FAILED, lưu error_message
  • Nếu chưa hết retry:
    → status = PENDING (chờ gán lại cho client khác)
  • Xóa khỏi client.active_tasks

TASK_REJECTED:
  • status = PENDING (chờ gán lại)
  • Xóa assigned_to, client_session_id
  • Xóa khỏi client.active_tasks
```

---

## 5. LUỒNG THỰC THI TASK TRÊN CLIENT

### 5.1. Nhận và xử lý task

```
Server gửi task_assign
        │
        ▼
┌───────────────────────────────────────────────────┐
│ Client nhận task_assign                            │
│                                                    │
│ Kiểm tra: active_tasks < max_concurrent?           │
│   ├── KHÔNG → Gửi task_rejected (browser_busy)     │
│   │                                                │
│   └── CÓ → Gửi task_accepted                      │
│            → Thêm vào active_tasks                 │
│            → asyncio.create_task(_execute_task())   │
│               (chạy song song, không block)        │
└───────────────────────────────────────────────────┘
```

### 5.2. ViewLink Executor

```
┌───────────────────────────────────────────────────────────────┐
│ VIEWLINK EXECUTOR                                              │
│                                                                │
│ 1. TẠO BROWSER CONTEXT                                        │
│    • Fingerprint ngẫu nhiên (UA, viewport, GPU, hardware)     │
│    • Inject stealth JS (ẩn webdriver, fake plugins, WebGL)    │
│    • Proxy (nếu có cấu hình)                                  │
│                                                                │
│ 2. MÔ PHỎNG REFERER                                           │
│    • 35% → Vào Google trước (Google referer)                  │
│    • 20% → Direct (không referer)                              │
│    • 45% → Set header: Facebook/Twitter/YouTube/News          │
│                                                                │
│ 3. TRUY CẬP TARGET URL                                        │
│    • page.goto(target_url, wait: domcontentloaded)            │
│    • Đợi 1-3 giây                                             │
│                                                                │
│ 4. TƯƠNG TÁC TỰ NHIÊN (lặp cho đến đủ thời gian)            │
│    • 35% Cuộn trang (100-500px, đợi 0.3-1.5s)                │
│    • 30% Đọc nội dung (dừng 3-10 giây)                       │
│    • 15% Di chuyển chuột (Bezier curve)                       │
│    • 20% Nghỉ (2-8 giây)                                     │
│    • 40% chance: micro_movements() 2-5s (rung chuột nhẹ)     │
│                                                                │
│ 5. Ở trên trang chính: min_time/2 đến min_time giây          │
│                                                                │
│ 6. CLICK LINK NỘI BỘ (nếu bật & tier cho phép)               │
│    • Tìm link cùng domain: a[href^=origin]                   │
│    • Lặp tối đa max_internal_clicks lần:                      │
│      → Di chuột Bezier đến link                               │
│      → Đợi 1-3 giây → Click                                  │
│      → Đợi trang mới load                                     │
│      → Cuộn & tương tác 15-60 giây                            │
│                                                                │
│ 7. Đợi thời gian còn lại nếu chưa đủ                         │
│                                                                │
│ 8. THU THẬP KẾT QUẢ                                           │
│    {                                                           │
│      "actual_url_visited": "https://...",                     │
│      "pages_visited": 3,                                      │
│      "internal_clicks": ["url1", "url2"],                     │
│      "time_on_each_page": [47, 23, 38],                      │
│      "total_time": 128,                                       │
│      "scroll_depth": 0.85                                     │
│    }                                                           │
│                                                                │
│ 9. Gửi task_completed → Server                                │
│ 10. Đóng browser context                                       │
└───────────────────────────────────────────────────────────────┘
```

### 5.3. Keyword SEO Executor

```
┌───────────────────────────────────────────────────────────────┐
│ KEYWORD SEO EXECUTOR                                           │
│                                                                │
│ 1. Tạo browser context (fingerprint, stealth, proxy)          │
│                                                                │
│ 2. VÀO GOOGLE (google.com hoặc google.com.vn)                │
│    • Tắt popup đồng ý cookie / location / translate           │
│                                                                │
│ 3. GÕ KEYWORD TỰ NHIÊN                                        │
│    • Từng ký tự, delay 50-200ms                               │
│    • Dấu cách: delay 100-400ms                                │
│    • 3% gõ sai → đợi 0.1-0.3s → Backspace → gõ lại          │
│    • Tiếng Việt Unicode: dùng insert_text() (paste)           │
│                                                                │
│ 4. NHẤN ENTER → Đợi kết quả load + 2-4 giây                  │
│                                                                │
│ 5. LẶP QUA CÁC TRANG (1 → max_search_page):                  │
│    ┌─────────────────────────────────────────────────┐         │
│    │ a. Cuộn tự nhiên qua kết quả                    │         │
│    │                                                  │         │
│    │ b. Tìm link chứa target_domain:                 │         │
│    │    JS: querySelectorAll('#search a, #rso a')    │         │
│    │    filter: href.includes(targetDomain)          │         │
│    │                                                  │         │
│    │ c. NẾU TÌM THẤY:                                │         │
│    │    → Cuộn đến vị trí kết quả                    │         │
│    │    → Đợi 1-3 giây                               │         │
│    │    → Di chuột Bezier đến link                   │         │
│    │    → Click → Đợi trang load                     │         │
│    │    → Ghi nhận: rank = (page-1)×10 + index + 1  │         │
│    │    → Tương tác tự nhiên 30-90 giây              │         │
│    │    → Click link nội bộ (nếu bật)                │         │
│    │    → return SUCCESS                              │         │
│    │                                                  │         │
│    │ d. NẾU KHÔNG TÌM THẤY:                          │         │
│    │    → Tìm nút "Trang tiếp"                       │         │
│    │    → Đợi 2-5 giây → Click next                  │         │
│    │    → Quay lại bước a                             │         │
│    └─────────────────────────────────────────────────┘         │
│                                                                │
│ 6. NẾU HẾT max_search_page MÀ KHÔNG TÌM THẤY:               │
│    → return {clicked: false, search_page_found: 0}            │
│                                                                │
│ 7. KẾT QUẢ:                                                   │
│    {                                                           │
│      "keyword": "từ khóa",                                    │
│      "clicked": true/false,                                   │
│      "search_result_rank": 17,                                │
│      "search_page_found": 2,                                  │
│      "pages_visited": 2,                                      │
│      "scroll_depth": 0.92,                                    │
│      "time_on_site": 58                                       │
│    }                                                           │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. HỆ THỐNG CREDIT

### 6.1. Các loại giao dịch credit

| Loại | Ký hiệu | Mô tả | Hướng |
|------|----------|--------|-------|
| `EARN_TASK` | Cày task | Credit kiếm từ chạy task cho người khác | + |
| `SPEND_JOB` | Chi job | Credit trừ khi task của mình được thực hiện | - |
| `PURCHASE` | Nạp tiền | Credit mua bằng tiền thật (SePay/MoMo) | + |
| `BONUS` | Thưởng | Credit thưởng (bonus hàng ngày, etc.) | + |
| `REFERRAL` | Giới thiệu | Credit thưởng khi giới thiệu bạn bè | + |
| `REFUND` | Hoàn trả | Credit hoàn lại khi job bị huỷ | + |
| `ADMIN_ADJUST` | Admin | Admin điều chỉnh thủ công | ± |
| `PROMOTION` | Khuyến mãi | Credit từ chương trình khuyến mãi | + |

### 6.2. Phân biệt loại credit (quan trọng)

```
CREDITS KIẾM TỪ TASK (EARN_TASK):
  ✓ Dùng để tạo job (spend_job)
  ✗ KHÔNG dùng để nâng cấp tier

CREDITS NẠP TIỀN (PURCHASE, PROMOTION, BONUS, REFERRAL, ADMIN_ADJUST, REFUND):
  ✓ Dùng để tạo job (spend_job)
  ✓ Dùng để nâng cấp tier

→ Khi nâng cấp tier:
  available_purchased = Σ(purchase + promotion + bonus + referral + admin + refund)
                       - Σ(spend_job WHERE reference_type="tier_upgrade")
  available_purchased = min(available_purchased, credit_balance)
  Nếu available_purchased < tier_cost → TỪ CHỐI
```

### 6.3. Hệ số nhân credit theo tier

| Tier | Hệ số | ViewLink (1 credit/view) | Keyword (3 credit/view) |
|------|--------|--------------------------|------------------------|
| Bronze | ×1.0 | Nhận 1 credit | Nhận 3 credit |
| Silver | ×1.2 | Nhận 1 credit | Nhận 3 credit |
| Gold | ×1.5 | Nhận 1 credit | Nhận 4 credit |
| Diamond | ×2.0 | Nhận 2 credit | Nhận 6 credit |

### 6.4. Giá tối thiểu khi tạo job

| Loại job | Credit tối thiểu/lượt | Cấu hình |
|----------|----------------------|----------|
| ViewLink | 10 credits | `min_cost_viewlink` (system_settings) |
| Keyword SEO | 20 credits | `min_cost_keyword` (system_settings) |
| Backlink | 10 credits | Mặc định |
| Social Media | 10 credits | Mặc định |

### 6.5. Chi phí phụ cho tính năng nâng cao

```
CLICK LINK NỘI BỘ:
  • Miễn phí theo tier: Bronze=0, Silver=2, Gold=5, Diamond=10 link/lượt
  • Ngoài quota: +X credits/link (admin cấu hình extra_internal_click_cost)

KEYWORD:
  • Miễn phí theo tier: Bronze=1, Silver=3, Gold=5, Diamond=10 keyword/lượt
  • Ngoài quota: +X credits/keyword (admin cấu hình extra_keyword_cost)

VÍ DỤ: User Silver, job keyword với 5 keyword, extra_keyword_cost = 10
  Miễn phí: 3 keyword (theo tier Silver)
  Phụ thu: 2 keyword × 10 credits = 20 credits/lượt thêm
  Tổng: credit_per_view + 20 credits/lượt
```

---

## 7. LUỒNG TẠO & QUẢN LÝ JOB

### 7.1. Tạo Job

```
User (Web)                                    Server
   │                                            │
   │── GET /jobs/pricing ──────────────────────>│
   │   (lấy tier limits & giá)                  │
   │<── {tier_config, settings} ───────────────│
   │                                            │
   │── POST /jobs ─────────────────────────────>│
   │   {                                        │
   │     "title": "Tên job",                    │
   │     "target_url": "https://...",           │
   │     "job_type": "viewlink",                │
   │     "target_count": 100,                   │
   │     "credit_per_view": 10,                 │
   │     "config": {                            │
   │       "min_time_on_site": 30,              │
   │       "max_time_on_site": 120,             │
   │       "click_internal_links": true,        │
   │       "max_internal_clicks": 3             │
   │     }                                      │
   │   }                                        │
   │                                 ┌──────────┤
   │                                 │ VALIDATE: │
   │                                 │ • credit_per_view >= min_cost (10/20)
   │                                 │ • Tier cho phép job_type?
   │                                 │ • Tier cho phép internal_click?
   │                                 │ • max_internal_clicks <= tier limit?
   │                                 │ • keywords count <= tier limit?
   │                                 │ • User có ít nhất credit_per_view?
   │                                 │ • Tạo Job(status=DRAFT)
   │                                 └──────────┤
   │<── {job_id, status: "draft"} ─────────────│
   │                                            │
   │── POST /jobs/{id}/start ──────────────────>│
   │   (kích hoạt job)                          │
   │                                 ┌──────────┤
   │                                 │ • Kiểm tra status == DRAFT/PAUSED
   │                                 │ • Kiểm tra user còn đủ credit
   │                                 │ • Set status = ACTIVE
   │                                 │ • Job bắt đầu nhận task từ dispatcher
   │                                 └──────────┤
   │<── {status: "active"} ────────────────────│
```

### 7.2. Vòng đời Job

```
                    ┌──────┐
                    │ DRAFT │ (vừa tạo)
                    └───┬──┘
                        │ POST /jobs/{id}/start
                        ▼
                    ┌──────┐
              ┌────>│ACTIVE│<────┐
              │     └───┬──┘     │
              │         │        │ POST /jobs/{id}/resume
              │         │        │
              │   ┌─────┴──────┐ │
              │   │            │ │
              │   ▼            ▼ │
         ┌────────┐    ┌──────────┐
         │COMPLETED│    │  PAUSED  │
         │(tự động)│    │(user/auto)│
         └────────┘    └──────────┘

  COMPLETED: completed_count >= target_count
  PAUSED:    user tạm dừng HOẶC auto-pause khi hết credit
  CANCELLED: user huỷ job (DELETE /jobs/{id})
```

---

## 8. HỆ THỐNG THANH TOÁN

### 8.1. Luồng thanh toán SePay / Chuyển khoản

```
User (Web)                         Server                        SePay/Bank
   │                                 │                              │
   │── POST /payments/create ──────>│                              │
   │   {channel: "sepay",           │                              │
   │    credit_amount: 1200,        │                              │
   │    promotion_code: "ABC"}      │                              │
   │                      ┌─────────┤                              │
   │                      │ • Validate channel                     │
   │                      │ • Tính credit + bonus                  │
   │                      │ • Validate promotion (nếu có)          │
   │                      │ • Tạo transaction_id = RS-XXXX         │
   │                      │ • Tạo Payment(status=pending)          │
   │                      │ • Tạo VietQR URL                       │
   │                      └─────────┤                              │
   │                                │                              │
   │<── {payment_id, transfer_info: │                              │
   │     bank, account, amount,     │                              │
   │     content: "RS-XXXX",        │                              │
   │     qr_url}                    │                              │
   │                                │                              │
   │ [User quét QR / chuyển khoản]  │                              │
   │ ────────────────────────────────────────────────────────────>│
   │                                │                              │
   │                                │<── Webhook callback ────────│
   │                                │    {transferAmount, content} │
   │                      ┌─────────┤                              │
   │                      │ • Verify webhook_key                   │
   │                      │ • Trích transaction_id từ content      │
   │                      │ • Tìm Payment pending                  │
   │                      │ • Verify số tiền                       │
   │                      │ • _complete_payment():                 │
   │                      │   → Cộng credit + bonus                │
   │                      │   → CreditTransaction(PURCHASE)        │
   │                      │   → Nâng tier (nếu mua tier)           │
   │                      │   → Payment.status = completed         │
   │                      └─────────┤                              │
   │                                │                              │
   │                                │──WebSocket: payment_completed│
   │<── (nhận thông báo WS) ───────│                              │
   │                                │                              │
   │ [Web polling /payments/{id}]   │                              │
   │── GET /payments/{id} ────────>│                              │
   │<── {status: "completed"} ─────│                              │
   │                                │                              │
   │ [Hiện "Thanh toán thành công!"]│                              │
```

### 8.2. Luồng thanh toán MoMo

```
Tương tự SePay nhưng:
  1. Server gọi MoMo API tạo đơn hàng → nhận payUrl + qrCodeUrl
  2. User redirect đến payUrl hoặc quét QR trong app MoMo
  3. MoMo gửi IPN (Instant Payment Notification) đến server
  4. Server verify HMAC-SHA256 signature
  5. resultCode == 0 → _complete_payment()
```

---

## 9. HỆ THỐNG CẤP BẬC (TIER)

### 9.1. So sánh quyền lợi

```
┌──────────────────┬────────────┬────────────┬─────────────┬─────────────────┐
│                  │   ĐỒNG     │    BẠC     │    VÀNG     │   KIM CƯƠNG     │
│                  │  (Miễn phí)│ (99K/tháng)│(249K/tháng) │ (499K/tháng)    │
├──────────────────┼────────────┼────────────┼─────────────┼─────────────────┤
│ Ưu tiên          │ 1          │ 3          │ 6           │ 10              │
│ Credit/ngày      │ 50         │ 200        │ 500         │ 9999            │
│ Jobs đồng thời   │ 3          │ 10         │ 30          │ 100             │
│ URLs/job         │ 10         │ 50         │ 100         │ 500             │
│ Clients đồng thời│ 1          │ 2          │ 3           │ 5               │
│ Hệ số credit     │ ×1.0       │ ×1.2       │ ×1.5        │ ×2.0            │
├──────────────────┼────────────┼────────────┼─────────────┼─────────────────┤
│ Keyword SEO      │     ✗      │     ✓      │     ✓       │      ✓          │
│ Backlink         │     ✗      │     ✗      │     ✓       │      ✓          │
│ Social Media     │     ✗      │     ✗      │     ✓       │      ✓          │
│ Click nội bộ     │     ✗      │     ✓      │     ✓       │      ✓          │
│ Proxy            │     ✗      │     ✗      │     ✓       │      ✓          │
│ Hẹn giờ          │     ✗      │     ✗      │     ✓       │      ✓          │
│ Tăng ưu tiên     │     ✗      │     ✗      │     ✗       │      ✓          │
│ Báo cáo chi tiết │     ✗      │     ✗      │     ✓       │      ✓          │
├──────────────────┼────────────┼────────────┼─────────────┼─────────────────┤
│ Link nội bộ free │ 0 link     │ 2 link     │ 5 link      │ 10 link         │
│ Keyword free     │ 1 key      │ 3 key      │ 5 key       │ 10 key          │
└──────────────────┴────────────┴────────────┴─────────────┴─────────────────┘
```

### 9.2. Luồng nâng cấp tier bằng credit

```
User                                          Server
  │                                             │
  │── POST /users/tier/upgrade-by-credit ─────>│
  │   {tier_id: 2, duration: "monthly"}        │
  │                                  ┌──────────┤
  │                                  │ 1. Tìm tier config
  │                                  │ 2. Tính giá: credit_price_monthly
  │                                  │ 3. Tính credit nạp tiền khả dụng:
  │                                  │    purchased = Σ(PURCHASE + PROMOTION
  │                                  │      + BONUS + REFERRAL + ADMIN + REFUND)
  │                                  │    spent_tiers = Σ(SPEND_JOB
  │                                  │      WHERE ref_type="tier_upgrade")
  │                                  │    available = purchased - spent_tiers
  │                                  │    available = min(available, balance)
  │                                  │
  │                                  │ 4. Kiểm tra available >= credit_cost
  │                                  │    (CHỈ credit nạp tiền, KHÔNG earn_task)
  │                                  │
  │                                  │ 5. Trừ credit_balance
  │                                  │ 6. Set tier mới
  │                                  │ 7. Tính tier_expires:
  │                                  │    base = max(tier_expires, now)
  │                                  │    expires = base + months
  │                                  │ 8. Tạo CreditTransaction(SPEND_JOB,
  │                                  │    ref_type="tier_upgrade")
  │                                  └──────────┤
  │                                             │
  │<── {old_tier, new_tier, expires} ──────────│
```

### 9.3. Hết hạn tier

```
Background task (tier_expiry_checker):
  • Chạy định kỳ
  • Tìm users có tier_expires < now VÀ tier != "bronze"
  • Hạ cấp về bronze
  • Gửi thông báo cho user
```

---

## 10. HỆ THỐNG KHUYẾN MÃI & REFERRAL

### 10.1. Welcome Bonus (đăng ký mới)

```
Khi đăng ký:
  1. Server tìm promotion: type="welcome_bonus", is_active=True, trong thời gian
  2. Kiểm tra max_uses (hệ thống) và max_uses_per_user
  3. Cộng value (1,000,000) credits cho user
  4. Tạo CreditTransaction(PROMOTION, +1000000,
     description="Chào mừng thành viên mới - Tặng 1,000,000 credits")
  5. Ghi PromotionUsage
```

### 10.2. Các loại khuyến mãi

| Loại | Mô tả | Cách tính |
|------|--------|----------|
| `credit_bonus_percent` | Bonus % credit khi mua | bonus = credit × value/100 |
| `credit_bonus_flat` | Bonus cố định khi mua | bonus = value |
| `tier_discount_percent` | Giảm giá % gói tier | discount = amount × value/100 |
| `tier_discount_flat` | Giảm giá cố định gói tier | discount = min(value, amount) |
| `free_credits` | Tặng credit miễn phí | bonus = value |
| `welcome_bonus` | Tặng khi đăng ký | bonus = value (tự động) |
| `double_earn` | Nhân đôi credit cày | modifier ×2 |

### 10.3. Referral

```
User A (giới thiệu)                    User B (được giới thiệu)
     │                                       │
     │── Chia sẻ link: /?ref=ABC123 ──────> │
     │                                       │── Đăng ký với referral_code
     │                                       │   → referred_by = User A.id
     │                                       │
     │                                       │── Chạy client, hoàn thành tasks
     │                                       │   task 1, 2, 3... 9
     │                                       │
     │                                       │── Task thứ 10 hoàn thành
     │                                       │
     │                  Server kiểm tra:     │
     │                  • B.referred_by = A  │
     │                  • B completed >= 10  │
     │                  • Chưa có REFERRAL   │
     │                    transaction cho B  │
     │                                       │
     │<── +50 credits (REFERRAL) ────────── │
     │    Gửi credit_update qua WebSocket   │
```

---

## 11. CHỐNG PHÁT HIỆN (ANTI-DETECTION)

### 11.1. Fingerprint ngẫu nhiên mỗi task

```
Mỗi task tạo browser context MỚI với:
  • User-Agent: Chrome 130-135 (random từ pool 12 versions)
  • Viewport: 8 kích thước phổ biến (1920×1080, 1366×768, etc.)
  • WebGL GPU: 10 combo (Intel UHD 630, NVIDIA GTX 1650, AMD RX 580, etc.)
  • Hardware Concurrency: 4 / 8 / 12 / 16 cores
  • Device Memory: 4 / 8 / 16 GB
  • Platform: Win32
  • Timezone: Asia/Ho_Chi_Minh
  • Locale: vi-VN
```

### 11.2. Stealth JavaScript (inject trước mỗi trang)

```javascript
// Ẩn webdriver
navigator.webdriver = undefined

// Fake plugins (giống Chrome thật)
navigator.plugins = [PDF Viewer, Chrome PDF Viewer, Native Client]

// Fake chrome runtime object
window.chrome = { runtime: {...}, loadTimes: {...} }

// Spoof WebGL GPU
WebGLRenderingContext.getParameter(37445) → "Google Inc. (Intel)"
WebGLRenderingContext.getParameter(37446) → "ANGLE (Intel, HD Graphics 630, ...)"

// Spoof hardware
navigator.hardwareConcurrency → 8
navigator.deviceMemory → 16

// Fake network info
navigator.connection.rtt → 50
navigator.connection.effectiveType → "4g"

// Block geolocation
navigator.geolocation → error code 1 (denied)
```

### 11.3. Hành vi tự nhiên

```
DI CHUỘT:
  • Đường cong Bezier bậc 2 (không đi thẳng)
  • Điểm điều khiển ngẫu nhiên
  • 10-25 bước nhỏ, mỗi bước 10-30ms
  • 15% overshoot (đi quá rồi quay lại)

CUỘN TRANG:
  • Cuộn không đều: 100-400px/lần
  • Đợi ngẫu nhiên 0.3-1.5 giây giữa lần cuộn
  • 15% cuộn ngược lên 50-150px

GÕ PHÍM:
  • Delay 50-200ms giữa phím
  • Dấu cách: 100-400ms
  • 3% gõ sai → 0.1-0.3s → Backspace → gõ lại

THỜI GIAN:
  • Phân phối Gaussian (không đều)
  • Không có 2 session giống nhau
```

---

## 12. LỊCH HẸN GIỜ & SYSTEM TRAY

### 12.1. Scheduler Manager

```
Cấu hình:
  schedule_enabled: true/false
  schedule_time: "22:00"           (giờ bắt đầu)
  schedule_stop_time: "08:00"      (giờ dừng, optional)
  schedule_days: [0,1,2,3,4,5,6]   (0=T2, 6=CN)

Hoạt động:
  • Kiểm tra mỗi 30 giây (background thread)
  • Nếu đúng ngày + đúng giờ bắt đầu → auto-start kết nối
  • Nếu đúng giờ dừng → auto-stop kết nối
  • Reset flag mỗi nửa đêm

Ví dụ: "22:00, dừng 08:00, T2-T5"
  → Thứ 2 đến Thứ 5: tự bắt đầu lúc 22:00, tự dừng lúc 08:00
```

### 12.2. System Tray (Windows)

```
Khi minimize:
  • minimize_to_tray = true → ẩn cửa sổ, hiện icon tray
  • Right-click menu: Mở RealSearch / Trạng thái / Thoát
  • Double-click tray icon → mở lại cửa sổ

Khi autostart (--autostart flag):
  • App khởi động cùng Windows
  • Auto-login bằng credentials đã lưu
  • Ẩn vào tray ngay lập tức
  • Tự bắt đầu kết nối và chạy task
```

### 12.3. Windows Autostart

```
Registry Key: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
Value: "RealSearch" = "%APPDATA%\RealSearch\RealSearch.exe --autostart"

enable_autostart()  → Thêm registry entry
disable_autostart() → Xoá registry entry
```

---

## 13. TỰ ĐỘNG CẬP NHẬT CLIENT

```
┌───────────────────────────────────────────────────────────┐
│ 1. KIỂM TRA CẬP NHẬT (khi khởi động)                     │
│    GET https://api.github.com/repos/TechReal89/           │
│        RealSearch/releases/latest                          │
│    → So sánh version: latest > current?                   │
│    → Tìm asset: RealSearch.exe                            │
│                                                           │
│ 2. TẢI VỀ                                                │
│    → Hiện splash screen với progress bar                  │
│    → Stream download ~50MB (65KB chunks)                  │
│    → Kiểm tra integrity: size ±1KB vs expected            │
│    → Minimum 10MB (safety check)                          │
│                                                           │
│ 3. CÀI ĐẶT                                               │
│    → Tạo batch script (%TEMP%\realsearch_update.bat)      │
│    → Script:                                              │
│      a. Kill tất cả process RealSearch                    │
│      b. Xoá temp dirs cũ (_MEI*)                          │
│      c. Copy exe mới → vị trí hiện tại                    │
│      d. Copy → %APPDATA%\RealSearch\RealSearch.exe        │
│      e. Thêm Windows Defender exclusion                   │
│      f. Khởi động lại app                                 │
│    → Chạy batch → App thoát → Batch tiếp tục chạy        │
└───────────────────────────────────────────────────────────┘
```

---

## 14. GIAO DIỆN NGƯỜI DÙNG (WEB)

### 14.1. Các trang chính

| Trang | URL | Chức năng |
|-------|-----|-----------|
| Landing | `/` | Marketing, đăng ký/đăng nhập |
| Dashboard | `/dashboard` | Tổng quan: credit, tier, jobs gần đây |
| Jobs | `/jobs` | Tạo & quản lý công việc |
| Credits | `/credits` | Xem chi tiết credit (nạp/KM/cày) |
| Payments | `/payments` | Nạp tiền mua credit |
| Packages | `/packages` | Gói credit có sẵn |
| Upgrade | `/upgrade` | Nâng cấp tier VIP |
| Referral | `/referral` | Giới thiệu bạn bè |
| Download | `/download` | Tải ứng dụng client |
| Profile | `/profile` | Thông tin cá nhân |

### 14.2. Luồng người dùng chính

**Onboarding mới:**
```
Landing → Đăng ký → Welcome Dialog (1M credits) → Dashboard
  → Tải client (/download) → Cài đặt → Chạy kiếm credit
  → Hoặc: Nạp tiền (/payments) → Tạo job (/jobs)
```

**Tạo job tăng traffic:**
```
Dashboard → "Tạo công việc" → Chọn loại (ViewLink/Keyword/...)
  → Điền form (URL, số lượt, credit/lượt, cấu hình)
  → Tạo (Draft) → Bấm Start → Active
  → Theo dõi tiến độ trên bảng jobs
```

**Nạp tiền:**
```
Dashboard → "Nạp Credit" → Chọn gói → "Mua ngay"
  → Hiện thông tin chuyển khoản + QR
  → User chuyển khoản → Hệ thống tự xác nhận (5s polling)
  → "Thanh toán thành công!" → Credit cộng ngay
```

**Kiếm credit:**
```
Download app → Cài đặt → Đăng nhập → Bấm "Bắt đầu"
  → App kết nối server → Nhận task tự động
  → Thực thi task (ẩn) → Nhận credit
  → Xem credit tăng trên Dashboard
```

---

## 15. GIAO DIỆN QUẢN TRỊ (ADMIN)

### 15.1. Dashboard Admin

```
5 thẻ thống kê (cập nhật mỗi 10 giây):
  • Tổng Users (+ active)
  • Jobs (+ active)
  • Credits lưu thông
  • Doanh thu (VND)
  • Clients online
```

### 15.2. Monitoring (Real-time)

```
Cập nhật mỗi 5 giây:
  • 4 thẻ: Online / Sẵn sàng / Tasks đang chạy / Tổng hoàn thành
  • Broadcast: gửi thông báo đến tất cả clients
  • Bảng clients: Session ID, User, Version, OS, Mode, CPU, RAM,
    Tasks (completed/failed), Credits earned, Health dot, Heartbeat
```

### 15.3. Quản lý

| Trang | Chức năng |
|-------|-----------|
| Users | CRUD users, điều chỉnh credit, thay đổi tier, ban/unban |
| Jobs | Xem tất cả jobs, thay đổi priority, pause/resume |
| Tiers | Cấu hình tier (giá, quyền lợi, limits) |
| Settings | Cấu hình hệ thống (credit/task, rate limit, heartbeat) |
| Payments | Xem giao dịch, xác nhận thủ công, cấu hình kênh |
| Promotions | Tạo/sửa khuyến mãi, xem lịch sử sử dụng |
| Analytics | Thống kê tasks, credit flow, revenue theo thời gian |

---

## TỔNG KẾT: LUỒNG HOẠT ĐỘNG CHÍNH

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  NGƯỜI MUA TRAFFIC          SERVER              NGƯỜI CHẠY CLIENT│
│  (Web User)                                     (Windows App)    │
│                                                                  │
│  1. Đăng ký ──────────> Tạo user ─────────> (Đăng ký)          │
│  2. Nhận 1M credits     + Welcome bonus      Nhận 1M credits    │
│  3. Nạp thêm tiền ───> Cộng credit          Tải app             │
│  4. Tạo job ──────────> Lưu DB              Cài đặt & đăng nhập │
│  5. Start job ────────> Status=ACTIVE        Bấm "Bắt đầu"     │
│                              │                      │            │
│                              ▼                      ▼            │
│                    ┌─────────────────┐    ┌─────────────────┐   │
│                    │  JOB DISPATCHER │    │   WEBSOCKET      │   │
│                    │  (mỗi 5 giây)  │───>│   CONNECTION     │   │
│                    │                 │    │                  │   │
│                    │ Tính priority   │    │ Nhận task_assign │   │
│                    │ Ghép job↔client │    │ Mở browser ẩn   │   │
│                    │ Gán task        │    │ View/Search/Click│   │
│                    └────────┬────────┘    │ Gửi task_done   │   │
│                             │             └────────┬─────────┘   │
│                             ▼                      │            │
│                    ┌─────────────────┐             │            │
│                    │ CREDIT ENGINE    │<────────────┘            │
│                    │                 │                           │
│                    │ Trừ credit owner│                           │
│                    │ Cộng credit     │                           │
│                    │   worker × tier │                           │
│                    │ Kiểm tra refer  │                           │
│                    └─────────────────┘                           │
│                                                                  │
│  6. Xem tiến độ ──> completed_count++   Credit tăng dần         │
│  7. Job hoàn thành   Status=COMPLETED   Tiếp tục nhận task mới  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
