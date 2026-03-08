# REALSEARCH - KE HOACH DU AN CHI TIET

## 1. TONG QUAN DU AN

### 1.1. Mo ta
RealSearch la he thong Traffic Exchange & SEO Automation tien tien, cho phep nguoi dung tang luot truy cap website, tang thu hang keyword tren Google, va tuong tac mang xa hoi. He thong hoat dong theo mo hinh **Exchange** (trao doi luot view) ket hop **SaaS** (tra phi premium).

### 1.2. So sanh voi iClick (phan mem cu)

| Tieu chi | iClick (cu) | RealSearch (moi) |
|----------|-------------|------------------|
| Backend | WCF Service (.NET) tren Windows | FastAPI (Python) tren Linux VPS |
| Client | VB.NET + Selenium/BAS | Python + Playwright + PyInstaller |
| Database | SQL Server (?) | PostgreSQL + Redis |
| Giao tiep | HTTP Polling | WebSocket (real-time) |
| Admin UI | Tich hop trong app desktop | Web UI rieng (Next.js) |
| Cap bac | Khong co | Dong, Bac, Vang, Kim Cuong |
| Thanh toan | Khong ro | MoMo, SePay, Bank Transfer |
| Trinh duyet | Headed (hien thi) | Headless/Headed Hidden (an) |
| Scale | Nho | 500+ clients dong thoi |

### 1.3. Tech Stack

| Tang | Cong nghe | Ly do |
|------|-----------|-------|
| Backend API | FastAPI (Python) | Nhanh, async, WebSocket native, auto docs |
| Database | PostgreSQL 16 | JSONB, full-text search, on dinh |
| Cache/Queue | Redis 7 | Job queue, session cache, pub/sub |
| Admin Web UI | Next.js + Shadcn/ui | React ecosystem, SSR, UI dep |
| Auth | JWT Token | Dung cho ca web lan client |
| Realtime | WebSocket | Server push lenh xuong client ngay lap tuc |
| Windows Client | Python + Playwright | Nhanh hon Selenium, stealth tot, PyInstaller |
| Reverse Proxy | Nginx | SSL, rate limiting, WebSocket proxy |
| Container | Docker Compose | De deploy, scale, quan ly |
| Mobile (sau) | Flutter | 1 code chay ca Android + iOS |

---

## 2. KIEN TRUC HE THONG

### 2.1. Tong quan kien truc

```
+--------------------------------------------------------------+
|                    LINUX VPS (Server)                         |
|                                                              |
|  +----------+  +----------+  +---------+  +---------------+ |
|  | FastAPI   |  |PostgreSQL|  |  Redis  |  | Next.js Admin | |
|  | + WS     |  |    16    |  |    7    |  |   Dashboard   | |
|  | Server   |  |          |  | (Queue/ |  |               | |
|  | (4 workers)|          |  |  Cache) |  |               | |
|  +-----+----+  +----------+  +---------+  +---------------+ |
|        |                                                     |
|  +-----+----+                                                |
|  |  Nginx   |  (Reverse Proxy + SSL + Rate Limiting)        |
|  +-----+----+                                                |
+---------+----------------------------------------------------+
          |
          | WSS / HTTPS
          |
   +------+----------------------------------------+
   |                    |                           |
+--+------+   +--------+-------+   +--------+------+
| Admin   |   | Client 1 (PC)  |   | Client 2 (PC) |  ... 500+
| Web UI  |   | Playwright     |   | Playwright     |
| (Browser)|  | (Headed Hidden)|   | (Headless)     |
+---------+   +----------------+   +----------------+
```

### 2.2. Luong hoat dong chinh

```
NGUOI DUNG (Mua view):               NGUOI CHAY CLIENT (Kiem credit):
  1. Dang ky tai khoan                  1. Dang ky tai khoan
  2. Mua credit (MoMo/SePay/Bank)      2. Tai va cai dat app client
  3. Tao job:                           3. Dang nhap, chay app
     - Add link can view                4. App tu dong:
     - Add keyword + target URL            - Ket noi server (WebSocket)
     - Cau hinh: thoi gian, tuong tac      - Nhan task tu server
  4. He thong phan phoi cho clients        - Mo trinh duyet AN
  5. Theo doi tien do tren web             - View link / Search keyword / Click
                                           - Tuong tac: scroll, click noi bo
                                           - Bao cao ket qua
                                        5. Nhan credit -> dung de view nguoc lai

ADMIN:
  1. Quan ly users, cap bac
  2. Cau hinh gia credit, khuyen mai
  3. Cau hinh kenh thanh toan
  4. Uu tien task cho cap bac cao
  5. Theo doi he thong real-time
```

---

## 3. CAU TRUC DU AN (MONOREPO)

```
D:\Projects\RealSearch\
|
|-- README.md
|-- docker-compose.yml                # Dev environment
|-- docker-compose.prod.yml           # Production
|-- .env.example                      # Mau bien moi truong
|-- .github/
|   |-- workflows/
|       |-- ci.yml                    # Test + Lint
|       |-- deploy-server.yml         # Deploy backend len VPS
|       |-- build-client.yml          # Build PyInstaller
|
|-- server/                           # ===== FASTAPI BACKEND =====
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- alembic/                      # Database migrations
|   |   |-- alembic.ini
|   |   |-- env.py
|   |   |-- versions/
|   |
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py                   # FastAPI app entry point
|   |   |-- config.py                 # Settings (pydantic-settings)
|   |   |-- database.py               # SQLAlchemy async engine + session
|   |   |-- dependencies.py           # Dependency injection
|   |   |
|   |   |-- models/                   # SQLAlchemy ORM models
|   |   |   |-- __init__.py
|   |   |   |-- user.py               # User + MembershipTier
|   |   |   |-- job.py                # Job + Task
|   |   |   |-- credit.py             # CreditTransaction
|   |   |   |-- session.py            # ClientSession
|   |   |   |-- package.py            # MembershipPackage
|   |   |   |-- payment.py            # Payment
|   |   |   |-- proxy.py              # Proxy
|   |   |   |-- setting.py            # SystemSetting
|   |   |
|   |   |-- schemas/                  # Pydantic request/response schemas
|   |   |   |-- __init__.py
|   |   |   |-- user.py
|   |   |   |-- job.py
|   |   |   |-- credit.py
|   |   |   |-- websocket.py
|   |   |   |-- payment.py
|   |   |   |-- admin.py
|   |   |
|   |   |-- api/                      # REST API routes
|   |   |   |-- __init__.py
|   |   |   |-- v1/
|   |   |       |-- __init__.py
|   |   |       |-- router.py         # Aggregated router
|   |   |       |-- auth.py           # Dang nhap, dang ky, refresh token
|   |   |       |-- users.py          # User profile, settings
|   |   |       |-- jobs.py           # CRUD jobs
|   |   |       |-- credits.py        # So du, lich su, mua credit
|   |   |       |-- payments.py       # Thanh toan MoMo, SePay, Bank
|   |   |       |-- packages.py       # Goi thanh vien
|   |   |       |-- stats.py          # Thong ke
|   |   |       |-- admin/            # ===== ADMIN ROUTES =====
|   |   |           |-- __init__.py
|   |   |           |-- dashboard.py  # Tong quan he thong
|   |   |           |-- users.py      # Quan ly users + cap bac
|   |   |           |-- jobs.py       # Quan ly jobs + uu tien
|   |   |           |-- credits.py    # Dieu chinh credit
|   |   |           |-- settings.py   # Cau hinh he thong
|   |   |           |-- payments.py   # Quan ly thanh toan
|   |   |           |-- packages.py   # Quan ly goi thanh vien
|   |   |           |-- promotions.py # Quan ly khuyen mai
|   |   |
|   |   |-- ws/                       # WebSocket handlers
|   |   |   |-- __init__.py
|   |   |   |-- manager.py            # Connection manager (500+ clients)
|   |   |   |-- handler.py            # Message router
|   |   |   |-- job_dispatcher.py     # Job distribution + priority logic
|   |   |
|   |   |-- services/                 # Business logic
|   |   |   |-- __init__.py
|   |   |   |-- auth_service.py       # JWT, password hashing
|   |   |   |-- job_service.py        # Job CRUD + lifecycle
|   |   |   |-- credit_service.py     # Credit earn/spend (atomic)
|   |   |   |-- user_service.py       # User management
|   |   |   |-- payment_service.py    # Payment processing
|   |   |   |-- package_service.py    # Membership packages
|   |   |   |-- stats_service.py      # Statistics
|   |   |   |-- promotion_service.py  # Khuyen mai
|   |   |   |-- job_scheduler.py      # Job queue + priority logic
|   |   |
|   |   |-- core/                     # Core utilities
|   |       |-- __init__.py
|   |       |-- security.py           # JWT, hashing
|   |       |-- exceptions.py         # Custom exceptions
|   |       |-- middleware.py          # Rate limiting, logging, CORS
|   |       |-- redis_client.py       # Redis connection
|   |
|   |-- tests/
|       |-- conftest.py
|       |-- test_auth.py
|       |-- test_jobs.py
|       |-- test_credits.py
|       |-- test_websocket.py
|       |-- test_payments.py
|
|-- admin/                            # ===== ADMIN WEB UI (Next.js) =====
|   |-- Dockerfile
|   |-- package.json
|   |-- next.config.js
|   |-- tailwind.config.js
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx            # Root layout
|   |   |   |-- page.tsx              # Dashboard chinh
|   |   |   |-- login/page.tsx        # Dang nhap admin
|   |   |   |
|   |   |   |-- users/                # Quan ly nguoi dung
|   |   |   |   |-- page.tsx          # Danh sach users
|   |   |   |   |-- [id]/page.tsx     # Chi tiet user
|   |   |   |
|   |   |   |-- jobs/                 # Quan ly jobs
|   |   |   |   |-- page.tsx          # Danh sach tat ca jobs
|   |   |   |   |-- viewlink/page.tsx
|   |   |   |   |-- keyword/page.tsx
|   |   |   |   |-- backlink/page.tsx
|   |   |   |   |-- social/page.tsx
|   |   |   |
|   |   |   |-- credits/              # Quan ly credit
|   |   |   |   |-- page.tsx          # Tong quan credit he thong
|   |   |   |   |-- transactions/page.tsx
|   |   |   |
|   |   |   |-- payments/             # Quan ly thanh toan
|   |   |   |   |-- page.tsx          # Danh sach giao dich
|   |   |   |   |-- settings/page.tsx # Cau hinh kenh thanh toan
|   |   |   |
|   |   |   |-- packages/             # Quan ly goi thanh vien
|   |   |   |   |-- page.tsx          # Danh sach goi (Dong/Bac/Vang/KimCuong)
|   |   |   |   |-- create/page.tsx   # Tao/sua goi
|   |   |   |
|   |   |   |-- promotions/           # Quan ly khuyen mai
|   |   |   |   |-- page.tsx          # Danh sach khuyen mai
|   |   |   |   |-- create/page.tsx
|   |   |   |
|   |   |   |-- settings/             # Cau hinh he thong
|   |   |   |   |-- page.tsx          # Cau hinh chung
|   |   |   |   |-- pricing/page.tsx  # Gia credit, don gia
|   |   |   |   |-- tiers/page.tsx    # Cau hinh cap bac
|   |   |   |
|   |   |   |-- monitoring/           # Giam sat real-time
|   |   |       |-- page.tsx          # Clients online, tasks dang chay
|   |   |
|   |   |-- components/
|   |   |   |-- ui/                   # Shadcn/ui components
|   |   |   |-- layout/               # Sidebar, header, footer
|   |   |   |-- charts/               # Bieu do thong ke
|   |   |   |-- tables/               # Data tables
|   |   |   |-- forms/                # Form components
|   |   |
|   |   |-- lib/
|   |   |   |-- api.ts                # API client (axios/fetch)
|   |   |   |-- ws.ts                 # WebSocket client (admin)
|   |   |   |-- auth.ts               # JWT auth helpers
|   |   |   |-- utils.ts
|   |   |
|   |   |-- hooks/                    # Custom React hooks
|   |   |-- types/                    # TypeScript types
|   |   |-- stores/                   # State management (Zustand)
|
|-- client/                           # ===== WINDOWS CLIENT =====
|   |-- build.spec                    # PyInstaller spec
|   |-- requirements.txt
|   |-- src/
|   |   |-- __init__.py
|   |   |-- main.py                   # Entry point + system tray
|   |   |-- config.py                 # Client settings (luu local)
|   |   |-- auth.py                   # JWT auth + auto-refresh
|   |   |
|   |   |-- network/
|   |   |   |-- __init__.py
|   |   |   |-- api_client.py         # REST API calls
|   |   |   |-- ws_client.py          # WebSocket persistent connection
|   |   |
|   |   |-- browser/
|   |   |   |-- __init__.py
|   |   |   |-- manager.py            # Browser lifecycle + stealth scripts
|   |   |   |-- fingerprint.py        # Anti-detection fingerprinting
|   |   |   |-- humanizer.py          # Human-like behavior simulation
|   |   |   |-- proxy_manager.py      # Proxy rotation
|   |   |
|   |   |-- jobs/
|   |   |   |-- __init__.py
|   |   |   |-- base.py               # Abstract job executor
|   |   |   |-- viewlink.py           # View Link executor
|   |   |   |-- keyword_seo.py        # Keyword SEO executor
|   |   |   |-- backlink.py           # Backlink executor
|   |   |   |-- social_media.py       # Social media executor
|   |   |
|   |   |-- ui/                       # GUI (tkinter hoac PyQt5)
|   |   |   |-- __init__.py
|   |   |   |-- main_window.py        # Cua so chinh
|   |   |   |-- login_window.py       # Man hinh dang nhap
|   |   |   |-- tray_icon.py          # System tray icon
|   |   |   |-- log_viewer.py         # Xem log real-time
|   |   |   |-- settings_dialog.py    # Cai dat (headless/headed, proxy...)
|   |   |
|   |   |-- utils/
|   |       |-- __init__.py
|   |       |-- logger.py             # Logging system
|   |       |-- updater.py            # Auto-update mechanism
|   |       |-- system_info.py        # Hardware/OS fingerprint (machine_id)
|
|-- shared/                           # ===== SHARED CONSTANTS =====
|   |-- job_types.py                  # Job type enums
|   |-- ws_messages.py                # WebSocket message types
|   |-- error_codes.py                # Error code definitions
|   |-- tier_config.py                # Membership tier constants
|
|-- docs/                             # ===== TAI LIEU =====
    |-- api.md                        # API documentation
    |-- deployment.md                 # Huong dan deploy
    |-- client-protocol.md            # WebSocket protocol spec
    |-- admin-guide.md                # Huong dan admin
```

---

## 4. DATABASE SCHEMA (PostgreSQL)

### 4.1. Bang Users (Nguoi dung)

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'user',          -- 'admin', 'user'
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,

    -- Credit
    credit_balance  INTEGER DEFAULT 0,                   -- So credit hien tai
    total_earned    INTEGER DEFAULT 0,                   -- Tong credit da kiem
    total_spent     INTEGER DEFAULT 0,                   -- Tong credit da tieu

    -- Cap bac thanh vien
    tier            VARCHAR(20) DEFAULT 'bronze',        -- 'bronze', 'silver', 'gold', 'diamond'
    tier_expires    TIMESTAMP,                           -- Ngay het han cap bac

    -- Referral
    referral_code   VARCHAR(20) UNIQUE,
    referred_by     INTEGER REFERENCES users(id),

    -- Metadata
    avatar_url      VARCHAR(500),
    phone           VARCHAR(20),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    last_login_at   TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_referral_code ON users(referral_code);
```

### 4.2. Bang Membership Tiers (Cap bac thanh vien)

```sql
CREATE TABLE membership_tiers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,         -- 'bronze', 'silver', 'gold', 'diamond'
    display_name    VARCHAR(100) NOT NULL,               -- 'Cap Dong', 'Cap Bac', 'Cap Vang', 'Cap Kim Cuong'
    color           VARCHAR(7),                          -- '#CD7F32', '#C0C0C0', '#FFD700', '#B9F2FF'
    icon            VARCHAR(50),                         -- emoji hoac icon name

    -- Gia
    price_monthly   DECIMAL(12,0) DEFAULT 0,             -- VND/thang
    price_yearly    DECIMAL(12,0) DEFAULT 0,             -- VND/nam

    -- Quyen loi
    priority_level      INTEGER DEFAULT 1,               -- 1=thap nhat, 10=cao nhat
    daily_credit_limit  INTEGER DEFAULT 50,              -- Credit toi da kiem/ngay
    max_jobs            INTEGER DEFAULT 3,               -- So job dong thoi
    max_urls_per_job    INTEGER DEFAULT 10,              -- So URL moi job
    max_clients         INTEGER DEFAULT 1,               -- So client dong thoi
    credit_earn_multiplier DECIMAL(3,1) DEFAULT 1.0,     -- He so nhan credit (1.0x, 1.5x, 2.0x)

    -- Tinh nang
    allow_keyword_seo       BOOLEAN DEFAULT FALSE,
    allow_backlink          BOOLEAN DEFAULT FALSE,
    allow_social_media      BOOLEAN DEFAULT FALSE,
    allow_internal_click    BOOLEAN DEFAULT FALSE,
    allow_proxy             BOOLEAN DEFAULT FALSE,
    allow_scheduling        BOOLEAN DEFAULT FALSE,       -- Hen gio chay job
    allow_priority_boost    BOOLEAN DEFAULT FALSE,       -- Tang uu tien job
    allow_detailed_report   BOOLEAN DEFAULT FALSE,       -- Bao cao chi tiet

    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Du lieu mac dinh cho 4 cap bac
INSERT INTO membership_tiers (name, display_name, color, price_monthly, price_yearly,
    priority_level, daily_credit_limit, max_jobs, max_urls_per_job, max_clients,
    credit_earn_multiplier, allow_keyword_seo, allow_backlink, allow_social_media,
    allow_internal_click, allow_proxy, allow_scheduling, allow_priority_boost,
    allow_detailed_report, sort_order) VALUES

('bronze', 'Cap Dong', '#CD7F32', 0, 0,
    1, 50, 3, 10, 1, 1.0,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1),

('silver', 'Cap Bac', '#C0C0C0', 99000, 990000,
    3, 200, 10, 50, 2, 1.2,
    TRUE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, 2),

('gold', 'Cap Vang', '#FFD700', 249000, 2490000,
    6, 500, 30, 100, 3, 1.5,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 3),

('diamond', 'Cap Kim Cuong', '#B9F2FF', 499000, 4990000,
    10, 9999, 100, 500, 5, 2.0,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 4);
```

### 4.3. Bang Jobs (Cong viec)

```sql
CREATE TYPE job_type AS ENUM (
    'viewlink', 'keyword_seo', 'backlink', 'social_media'
);

CREATE TYPE job_status AS ENUM (
    'draft', 'active', 'paused', 'completed', 'cancelled', 'expired'
);

CREATE TABLE jobs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    job_type        job_type NOT NULL,
    status          job_status DEFAULT 'draft',
    title           VARCHAR(255) NOT NULL,

    -- Target
    target_url      TEXT NOT NULL,                        -- URL chinh
    target_count    INTEGER NOT NULL DEFAULT 100,         -- So luot can thuc hien
    completed_count INTEGER DEFAULT 0,                    -- So luot da hoan thanh
    daily_limit     INTEGER,                              -- Gioi han/ngay (null = ko gioi han)
    today_count     INTEGER DEFAULT 0,

    -- Credit
    credit_per_view INTEGER DEFAULT 1,                    -- Credit tra cho moi luot
    total_credit_budget INTEGER,                          -- Tong ngan sach credit
    credit_spent    INTEGER DEFAULT 0,

    -- Thoi gian
    start_date      TIMESTAMP,
    end_date        TIMESTAMP,

    -- Cau hinh nang cao (JSONB - linh hoat theo job_type)
    config          JSONB DEFAULT '{}',
    /*
    === VIEWLINK config ===
    {
        "min_time_on_site": 30,          // giay toi thieu tren trang
        "max_time_on_site": 120,         // giay toi da tren trang
        "click_internal_links": true,    // co click link noi bo khong
        "max_internal_clicks": 3,        // so link noi bo toi da
        "scroll_behavior": "natural",    // "none", "natural", "full"
        "allowed_countries": ["VN", "US"],
        "referer_sources": ["google", "facebook", "direct"],
        "device_types": ["desktop", "mobile"]
    }

    === KEYWORD_SEO config ===
    {
        "keywords": ["tu khoa 1", "tu khoa 2"],
        "search_engine": "google",       // "google", "google.com.vn"
        "target_domain": "example.com",
        "max_search_page": 5,            // Tim toi trang may
        "min_time_on_site": 30,
        "max_time_on_site": 90,
        "click_internal_links": true,
        "geo_target": "VN"
    }

    === BACKLINK config ===
    {
        "anchor_texts": ["text 1", "text 2"],
        "target_sites": ["dir1.com", "dir2.com"],
        "backlink_type": "directory",    // "directory", "forum", "comment"
        "nofollow_ok": true
    }

    === SOCIAL_MEDIA config ===
    {
        "platform": "youtube",           // "youtube", "facebook", "tiktok"
        "action": "view",               // "view", "like", "share"
        "video_url": "...",
        "min_watch_time": 30,
        "max_watch_time": 120
    }
    */

    -- Uu tien
    priority        INTEGER DEFAULT 5,                    -- 1-10, cao = uu tien
    admin_priority  INTEGER DEFAULT 0,                    -- Bonus uu tien tu admin (0-10)
    is_exchange      BOOLEAN DEFAULT TRUE,                -- TRUE = exchange, FALSE = paid

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type_status ON jobs(job_type, status);
CREATE INDEX idx_jobs_priority ON jobs(priority DESC, admin_priority DESC);
```

### 4.4. Bang Tasks (Moi luot thuc hien)

```sql
CREATE TYPE task_status AS ENUM (
    'pending', 'assigned', 'executing', 'completed', 'failed', 'timeout'
);

CREATE TABLE tasks (
    id              BIGSERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES jobs(id),
    assigned_to     INTEGER REFERENCES users(id),         -- Client nao thuc hien
    client_session_id VARCHAR(64),

    status          task_status DEFAULT 'pending',

    -- Ket qua
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    time_spent      INTEGER,                              -- So giay thuc hien
    result_data     JSONB DEFAULT '{}',
    /*
    result_data:
    {
        "actual_url_visited": "https://example.com",
        "pages_visited": 3,
        "internal_clicks": ["url1", "url2"],
        "time_on_each_page": [45, 23, 67],
        "scroll_depth": 0.85,
        "error": null,
        "ip_address": "...",
        "user_agent": "...",
        "country": "VN"
    }
    */

    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 2,
    credits_earned  INTEGER DEFAULT 0,

    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_tasks_job_id ON tasks(job_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 4.5. Bang Credit Transactions (Lich su giao dich credit)

```sql
CREATE TYPE credit_type AS ENUM (
    'earn_task',          -- Kiem duoc tu thuc hien task
    'spend_job',          -- Chi cho job cua minh
    'purchase',           -- Mua bang tien
    'bonus',              -- Thuong
    'referral',           -- Thuong gioi thieu
    'refund',             -- Hoan tra
    'admin_adjust',       -- Admin dieu chinh
    'promotion'           -- Khuyen mai
);

CREATE TABLE credit_transactions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    type            credit_type NOT NULL,
    amount          INTEGER NOT NULL,                     -- + kiem, - chi
    balance_after   INTEGER NOT NULL,

    reference_type  VARCHAR(50),                          -- 'task', 'job', 'payment', etc.
    reference_id    BIGINT,
    description     TEXT,

    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at);
CREATE INDEX idx_credit_tx_type ON credit_transactions(type);
```

### 4.6. Bang Client Sessions

```sql
CREATE TABLE client_sessions (
    id              VARCHAR(64) PRIMARY KEY,              -- UUID
    user_id         INTEGER NOT NULL REFERENCES users(id),

    machine_id      VARCHAR(255),                         -- Hardware fingerprint
    os_info         VARCHAR(255),
    ip_address      INET,
    country         VARCHAR(5),

    is_online       BOOLEAN DEFAULT TRUE,
    last_heartbeat  TIMESTAMP DEFAULT NOW(),
    connected_at    TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP,

    tasks_completed INTEGER DEFAULT 0,
    tasks_failed    INTEGER DEFAULT 0,
    credits_earned  INTEGER DEFAULT 0,

    client_version  VARCHAR(20),
    browser_mode    VARCHAR(20) DEFAULT 'headed_hidden',  -- 'headless', 'headed_hidden', 'headed'
    enabled_job_types TEXT[],
    max_concurrent  INTEGER DEFAULT 1
);

CREATE INDEX idx_sessions_user ON client_sessions(user_id);
CREATE INDEX idx_sessions_online ON client_sessions(is_online);
```

### 4.7. Bang Payments (Thanh toan)

```sql
CREATE TABLE payment_channels (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,                 -- 'momo', 'sepay', 'bank_transfer', 'zalopay'
    display_name    VARCHAR(100) NOT NULL,                -- 'MoMo', 'SePay', 'Chuyen khoan ngan hang'
    icon_url        VARCHAR(500),

    -- Cau hinh (JSON)
    config          JSONB DEFAULT '{}',
    /*
    MoMo: {
        "partner_code": "...",
        "access_key": "...",
        "secret_key": "...",
        "endpoint": "https://payment.momo.vn/v2/gateway/api"
    }
    SePay: {
        "api_key": "...",
        "bank_account": "...",
        "bank_name": "..."
    }
    Bank Transfer: {
        "bank_name": "Vietcombank",
        "account_number": "...",
        "account_name": "...",
        "branch": "..."
    }
    */

    is_active       BOOLEAN DEFAULT TRUE,
    fee_percent     DECIMAL(5,2) DEFAULT 0,              -- Phi giao dich (%)
    min_amount      DECIMAL(12,0) DEFAULT 10000,         -- So tien toi thieu (VND)
    max_amount      DECIMAL(12,0) DEFAULT 10000000,      -- So tien toi da (VND)
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    channel_id      INTEGER NOT NULL REFERENCES payment_channels(id),

    amount          DECIMAL(12,0) NOT NULL,               -- So tien VND
    fee             DECIMAL(12,0) DEFAULT 0,              -- Phi giao dich
    net_amount      DECIMAL(12,0) NOT NULL,               -- So tien thuc nhan

    -- Muc dich
    purpose         VARCHAR(50) NOT NULL,                 -- 'buy_credit', 'buy_tier', 'buy_both'
    credit_amount   INTEGER,                              -- Credit nhan duoc
    tier_id         INTEGER REFERENCES membership_tiers(id),
    tier_duration   INTEGER,                              -- So thang

    -- Trang thai
    status          VARCHAR(20) DEFAULT 'pending',        -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    payment_ref     VARCHAR(255),                         -- Ma giao dich tu cong thanh toan
    transaction_id  VARCHAR(255) UNIQUE,                  -- Ma giao dich noi bo

    -- Khuyen mai ap dung
    promotion_id    INTEGER REFERENCES promotions(id),
    bonus_credit    INTEGER DEFAULT 0,                    -- Credit bonus tu khuyen mai

    note            TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
```

### 4.8. Bang Credit Pricing (Gia credit)

```sql
CREATE TABLE credit_packages (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,                -- 'Goi 500', 'Goi 1200', etc.
    credit_amount   INTEGER NOT NULL,                     -- So credit co ban
    bonus_credit    INTEGER DEFAULT 0,                    -- Credit bonus
    price           DECIMAL(12,0) NOT NULL,               -- Gia VND

    -- Hien thi
    description     TEXT,
    badge           VARCHAR(50),                          -- 'hot', 'best_value', 'popular'

    -- Dieu kien
    min_tier        VARCHAR(20),                          -- Cap bac toi thieu de mua (null = tat ca)

    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Du lieu mac dinh
INSERT INTO credit_packages (name, credit_amount, bonus_credit, price, badge, sort_order) VALUES
('Goi Co Ban',      500,    0,     50000,  NULL, 1),
('Goi Tiet Kiem',   1200,   200,   100000, 'popular', 2),     -- +20% bonus
('Goi Chuyen Nghiep', 7000, 2800,  500000, 'best_value', 3), -- +40% bonus
('Goi Doanh Nghiep', 15000, 7500,  1000000, 'hot', 4);       -- +50% bonus
```

### 4.9. Bang Promotions (Khuyen mai)

```sql
CREATE TABLE promotions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50) UNIQUE,                   -- Ma khuyen mai (null = tu dong ap dung)

    -- Loai khuyen mai
    type            VARCHAR(50) NOT NULL,
    /*
    'credit_bonus_percent'  - Bonus % credit khi mua
    'credit_bonus_flat'     - Bonus so credit co dinh khi mua
    'tier_discount_percent' - Giam gia % goi cap bac
    'tier_discount_flat'    - Giam gia so tien co dinh goi cap bac
    'free_credits'          - Tang credit mien phi (dang ky moi, su kien...)
    'double_earn'           - Nhan gap doi credit khi cay view
    */

    value           DECIMAL(10,2) NOT NULL,               -- Gia tri (% hoac so tien/credit)

    -- Dieu kien
    min_purchase    DECIMAL(12,0),                        -- So tien mua toi thieu
    min_tier        VARCHAR(20),                          -- Cap bac toi thieu
    max_uses        INTEGER,                              -- So lan su dung toi da (toan he thong)
    max_uses_per_user INTEGER DEFAULT 1,                  -- So lan su dung toi da moi user
    current_uses    INTEGER DEFAULT 0,

    -- Thoi gian
    start_date      TIMESTAMP NOT NULL,
    end_date        TIMESTAMP NOT NULL,

    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE promotion_usage (
    id              SERIAL PRIMARY KEY,
    promotion_id    INTEGER NOT NULL REFERENCES promotions(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    payment_id      INTEGER REFERENCES payments(id),
    used_at         TIMESTAMP DEFAULT NOW(),

    UNIQUE(promotion_id, user_id, payment_id)
);
```

### 4.10. Bang Proxies

```sql
CREATE TABLE proxies (
    id              SERIAL PRIMARY KEY,
    host            VARCHAR(255) NOT NULL,
    port            INTEGER NOT NULL,
    username        VARCHAR(255),
    password        VARCHAR(255),
    protocol        VARCHAR(10) DEFAULT 'http',           -- 'http', 'socks5'
    country         VARCHAR(5),

    is_active       BOOLEAN DEFAULT TRUE,
    last_checked    TIMESTAMP,
    success_rate    DECIMAL(5,2) DEFAULT 100.0,
    avg_response_ms INTEGER,

    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.11. Bang System Settings (Cau hinh he thong)

```sql
CREATE TABLE system_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT NOT NULL,
    category        VARCHAR(50) NOT NULL,                 -- 'general', 'credit', 'payment', 'task', 'security'
    display_name    VARCHAR(255),
    description     TEXT,
    value_type      VARCHAR(20) DEFAULT 'string',         -- 'string', 'number', 'boolean', 'json'
    updated_at      TIMESTAMP DEFAULT NOW(),
    updated_by      INTEGER REFERENCES users(id)
);

-- === CAU HINH MAC DINH ===

-- Credit
INSERT INTO system_settings (key, value, category, display_name, description, value_type) VALUES
('credit_per_viewlink',     '1',    'credit', 'Credit/ViewLink',       'Credit kiem duoc khi hoan thanh 1 viewlink', 'number'),
('credit_per_keyword',      '3',    'credit', 'Credit/Keyword SEO',    'Credit kiem duoc khi hoan thanh 1 keyword SEO (tim thay)', 'number'),
('credit_per_keyword_miss', '1',    'credit', 'Credit/Keyword (miss)', 'Credit kiem duoc khi keyword SEO khong tim thay', 'number'),
('credit_per_backlink',     '2',    'credit', 'Credit/Backlink',       'Credit kiem duoc khi tao 1 backlink', 'number'),
('credit_per_social',       '2',    'credit', 'Credit/Social',         'Credit kiem duoc khi hoan thanh 1 social view', 'number'),
('credit_referral_bonus',   '50',   'credit', 'Credit/Gioi thieu',     'Credit thuong khi gioi thieu thanh cong', 'number'),
('credit_daily_bonus',      '10',   'credit', 'Credit/Bonus ngay',     'Credit thuong khi hoan thanh 10+ tasks/ngay', 'number'),
('credit_daily_bonus_min_tasks', '10', 'credit', 'Tasks/Bonus ngay',  'So tasks toi thieu de nhan bonus ngay', 'number'),

-- Task
('min_time_on_site',            '15',   'task', 'Thoi gian toi thieu',    'Thoi gian toi thieu tren trang (giay)', 'number'),
('max_concurrent_tasks',        '2',    'task', 'Tasks dong thoi',        'So task dong thoi toi da moi client', 'number'),
('task_timeout_seconds',        '300',  'task', 'Timeout task',           'Thoi gian timeout cho task (giay)', 'number'),
('task_max_retries',            '2',    'task', 'So lan thu lai',         'So lan thu lai toi da khi task fail', 'number'),
('client_rate_limit_per_hour',  '30',   'task', 'Rate limit/gio',        'So tasks toi da moi gio cho moi client', 'number'),
('delay_between_tasks_min',     '30',   'task', 'Delay min (giay)',       'Thoi gian delay toi thieu giua 2 tasks', 'number'),
('delay_between_tasks_max',     '120',  'task', 'Delay max (giay)',       'Thoi gian delay toi da giua 2 tasks', 'number'),

-- Server
('heartbeat_interval',      '30',   'general', 'Heartbeat interval',  'Chu ky heartbeat (giay)', 'number'),
('heartbeat_timeout',       '90',   'general', 'Heartbeat timeout',   'Timeout khi mat heartbeat (giay)', 'number'),
('max_clients_per_user',    '3',    'general', 'Max clients/user',    'So client toi da dong thoi moi user', 'number'),
('max_clients_per_ip',      '2',    'general', 'Max clients/IP',      'So client toi da tu cung IP', 'number'),

-- Security
('min_task_time_ratio',     '0.5',  'security', 'Ti le thoi gian min', 'Task bi reject neu time < min_time * ratio', 'number'),
('suspicious_success_rate', '0.99', 'security', 'Success rate nghi van', 'Canh bao neu success rate > gia tri nay', 'number');
```

---

## 5. API ENDPOINTS

### 5.1. REST API

```
BASE URL: https://api.realsearch.vn/api/v1

========== AUTH ==========
POST   /auth/register              Dang ky tai khoan
POST   /auth/login                 Dang nhap -> access_token + refresh_token
POST   /auth/refresh               Refresh access token
POST   /auth/logout                Huy refresh token
GET    /auth/me                    Thong tin user hien tai
POST   /auth/change-password       Doi mat khau
POST   /auth/forgot-password       Quen mat khau (gui email)
POST   /auth/reset-password        Reset mat khau bang token

========== USER ==========
GET    /users/profile              Profile cua minh
PUT    /users/profile              Cap nhat profile
GET    /users/stats                Thong ke cua minh
GET    /users/tier                 Thong tin cap bac hien tai

========== JOBS ==========
GET    /jobs                       Danh sach jobs cua minh
POST   /jobs                       Tao job moi
GET    /jobs/{id}                  Chi tiet job
PUT    /jobs/{id}                  Cap nhat job
DELETE /jobs/{id}                  Xoa/huy job
POST   /jobs/{id}/start            Bat dau job
POST   /jobs/{id}/pause            Tam dung
POST   /jobs/{id}/resume           Tiep tuc
GET    /jobs/{id}/tasks            Danh sach tasks cua job
GET    /jobs/{id}/stats            Thong ke chi tiet

========== CREDITS ==========
GET    /credits/balance            So du credit hien tai
GET    /credits/history            Lich su giao dich (paginated)
GET    /credits/packages           Danh sach goi credit co the mua
POST   /credits/purchase           Mua credit

========== PAYMENTS ==========
GET    /payments/channels          Danh sach kenh thanh toan
POST   /payments/create            Tao giao dich thanh toan
GET    /payments/{id}              Trang thai giao dich
POST   /payments/callback/{channel} Callback tu cong thanh toan (MoMo, SePay...)
GET    /payments/history           Lich su thanh toan

========== TIERS ==========
GET    /tiers                      Danh sach cap bac + gia
POST   /tiers/subscribe            Dang ky/nang cap cap bac
GET    /tiers/current              Cap bac hien tai + quyen loi

========== PROMOTIONS ==========
GET    /promotions                 Khuyen mai dang co
POST   /promotions/apply           Ap dung ma khuyen mai

========== CLIENT APP ==========
POST   /client/register            Dang ky client machine
GET    /client/config              Lay cau hinh tu server
POST   /client/update-check        Kiem tra cap nhat

========== STATS ==========
GET    /stats/overview             Tong quan (cho user)
GET    /stats/daily                Thong ke theo ngay

========================================
     ADMIN ROUTES (role = admin)
========================================

========== ADMIN DASHBOARD ==========
GET    /admin/dashboard            Tong quan he thong (users, jobs, credits, revenue)
GET    /admin/dashboard/realtime   Du lieu real-time (clients online, tasks running)

========== ADMIN USERS ==========
GET    /admin/users                Danh sach users (filter, search, paginate)
GET    /admin/users/{id}           Chi tiet user
PUT    /admin/users/{id}           Cap nhat user (ban, cap bac, credit...)
PUT    /admin/users/{id}/tier      Thay doi cap bac user
POST   /admin/users/{id}/credit    Dieu chinh credit (cong/tru)
DELETE /admin/users/{id}           Vo hieu hoa user

========== ADMIN JOBS ==========
GET    /admin/jobs                 Tat ca jobs
GET    /admin/jobs/{id}            Chi tiet job
PUT    /admin/jobs/{id}/priority   Thay doi uu tien admin
POST   /admin/jobs/{id}/pause      Tam dung job (admin)
POST   /admin/jobs/{id}/resume     Tiep tuc job (admin)
DELETE /admin/jobs/{id}            Xoa job (admin)

========== ADMIN TIERS ==========
GET    /admin/tiers                Danh sach cap bac
POST   /admin/tiers                Tao cap bac moi
PUT    /admin/tiers/{id}           Sua cap bac (gia, quyen loi, uu tien...)
DELETE /admin/tiers/{id}           Xoa cap bac

========== ADMIN CREDIT PRICING ==========
GET    /admin/credit-packages      Danh sach goi credit
POST   /admin/credit-packages      Tao goi credit moi
PUT    /admin/credit-packages/{id} Sua goi credit (gia, bonus...)
DELETE /admin/credit-packages/{id} Xoa goi credit

========== ADMIN PAYMENTS ==========
GET    /admin/payments             Tat ca giao dich
GET    /admin/payments/stats       Thong ke doanh thu
GET    /admin/payment-channels     Danh sach kenh thanh toan
POST   /admin/payment-channels     Them kenh thanh toan
PUT    /admin/payment-channels/{id} Sua cau hinh kenh
DELETE /admin/payment-channels/{id} Xoa kenh
POST   /admin/payments/{id}/confirm Thu cong xac nhan thanh toan (bank transfer)
POST   /admin/payments/{id}/refund  Hoan tien

========== ADMIN PROMOTIONS ==========
GET    /admin/promotions           Danh sach khuyen mai
POST   /admin/promotions           Tao khuyen mai moi
PUT    /admin/promotions/{id}      Sua khuyen mai
DELETE /admin/promotions/{id}      Xoa khuyen mai
GET    /admin/promotions/{id}/usage Lich su su dung khuyen mai

========== ADMIN SETTINGS ==========
GET    /admin/settings             Tat ca settings (grouped by category)
PUT    /admin/settings             Cap nhat settings (batch update)
GET    /admin/settings/{category}  Settings theo nhom

========== ADMIN SYSTEM ==========
GET    /admin/clients              Danh sach clients dang online
POST   /admin/broadcast            Gui thong bao toi tat ca clients
GET    /admin/logs                 System logs
GET    /admin/proxies              Danh sach proxy
POST   /admin/proxies              Them proxy
DELETE /admin/proxies/{id}         Xoa proxy
```

### 5.2. WebSocket Protocol

```
ENDPOINT: wss://api.realsearch.vn/ws?token={jwt_token}

=== CLIENT -> SERVER ===

// Xac thuc
{ "type": "auth", "data": {
    "token": "jwt_token",
    "client_version": "1.0.0",
    "machine_id": "hw_fingerprint",
    "os_info": "Windows 11",
    "browser_mode": "headed_hidden",
    "enabled_job_types": ["viewlink", "keyword_seo"],
    "max_concurrent": 2
}}

// Heartbeat (moi 30 giay)
{ "type": "heartbeat", "data": {
    "session_id": "uuid",
    "cpu_usage": 45,
    "memory_usage": 60,
    "active_tasks": 1
}}

// Chap nhan task
{ "type": "task_accepted", "data": { "task_id": 12345 }}

// Bao cao tien do
{ "type": "task_progress", "data": {
    "task_id": 12345,
    "progress": 50,
    "current_step": "clicking_internal_link_2"
}}

// Hoan thanh task
{ "type": "task_completed", "data": {
    "task_id": 12345,
    "result": {
        "actual_url_visited": "https://example.com",
        "pages_visited": 3,
        "time_spent": 67,
        "scroll_depth": 0.85,
        "internal_clicks": ["url1", "url2"]
    }
}}

// Task that bai
{ "type": "task_failed", "data": {
    "task_id": 12345,
    "error_code": "TIMEOUT",
    "error_message": "Page load timeout after 30s"
}}

// Tu choi task
{ "type": "task_rejected", "data": {
    "task_id": 12345,
    "reason": "browser_busy"
}}


=== SERVER -> CLIENT ===

// Ket qua xac thuc
{ "type": "auth_result", "data": {
    "success": true,
    "session_id": "uuid",
    "server_config": {
        "heartbeat_interval": 30,
        "task_timeout": 300,
        "max_concurrent": 2
    }
}}

// Giao task
{ "type": "task_assign", "data": {
    "task_id": 12345,
    "job_type": "viewlink",
    "config": {
        "target_url": "https://example.com",
        "min_time_on_site": 30,
        "max_time_on_site": 120,
        "click_internal_links": true,
        "max_internal_clicks": 3,
        "scroll_behavior": "natural",
        "referer": "google"
    },
    "priority": 7,
    "timeout": 300
}}

// Huy task
{ "type": "task_cancel", "data": {
    "task_id": 12345,
    "reason": "job_paused"
}}

// Cap nhat credit
{ "type": "credit_update", "data": {
    "balance": 1500,
    "earned": 3,
    "reason": "Task #12345 completed"
}}

// Cap nhat cau hinh
{ "type": "config_update", "data": {
    "heartbeat_interval": 30,
    "max_concurrent": 2
}}

// Thong bao tu admin
{ "type": "broadcast", "data": {
    "message": "Server bao tri luc 23:00",
    "level": "warning"
}}

// Yeu cau cap nhat app
{ "type": "force_update", "data": {
    "version": "1.1.0",
    "download_url": "https://...",
    "required": true
}}

// Loi
{ "type": "error", "data": {
    "code": "RATE_LIMIT",
    "message": "Too many requests"
}}
```

---

## 6. HE THONG CAP BAC THANH VIEN

### 6.1. Cac cap bac

```
+==============+============+============+=============+=================+
|              | DONG       | BAC        | VANG        | KIM CUONG       |
|              | (Free)     | (99K/thang)| (249K/thang)| (499K/thang)    |
+==============+============+============+=============+=================+
| Uu tien      | 1          | 3          | 6           | 10              |
| Credit/ngay  | 50         | 200        | 500         | Khong gioi han  |
| Jobs dong thoi| 3         | 10         | 30          | 100             |
| URLs/job     | 10         | 50         | 100         | 500             |
| Clients      | 1          | 2          | 3           | 5               |
| He so credit | 1.0x       | 1.2x       | 1.5x        | 2.0x            |
+--------------+------------+------------+-------------+-----------------+
| Keyword SEO  |     X      |     V      |     V       |      V          |
| Backlink     |     X      |     X      |     V       |      V          |
| Social Media |     X      |     X      |     V       |      V          |
| Click noi bo |     X      |     V      |     V       |      V          |
| Proxy        |     X      |     X      |     V       |      V          |
| Hen gio      |     X      |     X      |     V       |      V          |
| Tang uu tien |     X      |     X      |     X       |      V          |
| Bao cao chi tiet|  X      |     X      |     V       |      V          |
+==============+============+============+=============+=================+
```

### 6.2. Cach uu tien hoat dong

```
CONG THUC UU TIEN (Priority Score):

score = job.priority * 10                      // Uu tien job (1-10, user dat)
      + tier.priority_level * 5                // Uu tien cap bac (1-10)
      + admin_priority * 8                     // Uu tien tu admin (0-10)
      + (1 - completion_ratio) * 30            // Job chua xong nhieu = uu tien cao
      + min(hours_since_last * 2, 20)          // Job lau khong xu ly = uu tien cao
      - recent_tasks_last_hour * 0.5           // Job vua xu ly nhieu = giam uu tien

VD: User Kim Cuong tao job priority=8, admin boost=5:
    score = 8*10 + 10*5 + 5*8 + ... = 170+  (rat cao)

VD: User Dong tao job priority=5, khong co admin boost:
    score = 5*10 + 1*5 + 0*8 + ... = 55+    (thap hon nhieu)

=> Job cua Kim Cuong duoc phan phoi TRUOC va NHIEU HON
```

---

## 7. HE THONG CREDIT

### 7.1. Bang gia credit (Admin cau hinh duoc)

```
KIEM CREDIT (Earn) - Cay view:
+-------------------+--------+---------+------------------------------------------+
| Hanh dong         | Credit | x Kim C | Dieu kien                                |
+-------------------+--------+---------+------------------------------------------+
| ViewLink          | 1      | 2       | O tren trang >= min_time_on_site         |
| Keyword SEO (OK)  | 3      | 6       | Tim thay + click vao target              |
| Keyword SEO (miss)| 1      | 2       | Tim nhung khong thay target              |
| Backlink          | 2      | 4       | Tao backlink thanh cong                  |
| Social Media View | 2      | 4       | Xem >= min_watch_time                    |
| Gioi thieu user   | 50     | 100     | User duoc gioi thieu dang ky + verify    |
| Bonus hang ngay   | 10     | 20      | Hoan thanh >= 10 tasks/ngay              |
+-------------------+--------+---------+------------------------------------------+

CHI CREDIT (Spend) - Tao job:
+-------------------+--------+------------------------------------------+
| Hanh dong         | Credit | Ghi chu                                  |
+-------------------+--------+------------------------------------------+
| 1 ViewLink view   | 1      | Tru khi task completed                   |
| 1 Keyword click   | 3      | Tru khi target duoc click                |
| 1 Backlink        | 2      | Tru khi tao thanh cong                   |
| 1 Social view     | 2      | Tru khi xem xong                         |
+-------------------+--------+------------------------------------------+

MUA CREDIT (Admin cau hinh):
+---------------------+--------+-------+---------+
| Goi                 | Credit | Bonus | Gia VND |
+---------------------+--------+-------+---------+
| Goi Co Ban          | 500    | 0     | 50,000  |
| Goi Tiet Kiem       | 1,200  | +200  | 100,000 | (popular)
| Goi Chuyen Nghiep   | 7,000  | +2,800| 500,000 | (best value)
| Goi Doanh Nghiep    | 15,000 | +7,500| 1,000,000| (hot)
+---------------------+--------+-------+---------+
* Admin co the tao them goi, thay doi gia, bonus bat ky luc nao
```

---

## 8. ADMIN WEB UI - CHI TIET CAC TRANG

### 8.1. Dashboard

```
+---------------------------------------------------------------+
| RealSearch Admin                              [Admin] [Logout] |
+----------+----------------------------------------------------+
|          |  TONG QUAN HE THONG                                |
| Dashboard|  +--------+ +--------+ +--------+ +--------+      |
| Users    |  | Users  | |  Jobs  | |Credits | |Revenue |      |
| Jobs     |  | 1,234  | |  567   | | 2.5M   | | 15M    |      |
| Credits  |  | +12%   | | Active | | /ngay  | | VND    |      |
| Payments |  +--------+ +--------+ +--------+ +--------+      |
| Packages |                                                     |
| Khuyen mai|  CLIENTS ONLINE: 342/500          [Broadcast]     |
| Cau hinh |  +---------------------------------------------+  |
| Giam sat |  | [============================] 68% capacity  |  |
|          |  +---------------------------------------------+  |
|          |                                                     |
|          |  BIEU DO TASKS/GIO  |  TOP USERS (credit kiem)     |
|          |  [Line chart]       |  1. user_abc: 1,200          |
|          |                     |  2. user_xyz: 980            |
|          |                     |  3. user_def: 750            |
+----------+----------------------------------------------------+
```

### 8.2. Cau hinh He thong

```
TRANG: /settings

+------- CAU HINH CREDIT --------+
| Credit/ViewLink:        [  1 ] |
| Credit/Keyword (OK):    [  3 ] |
| Credit/Keyword (miss):  [  1 ] |
| Credit/Backlink:        [  2 ] |
| Credit/Social:          [  2 ] |
| Credit gioi thieu:      [ 50 ] |
| Credit bonus ngay:      [ 10 ] |
| Min tasks bonus ngay:   [ 10 ] |
+--------------------------------+

+------- CAU HINH TASK ----------+
| Thoi gian toi thieu (s):[ 15 ] |
| Tasks dong thoi/client: [  2 ] |
| Task timeout (s):       [300 ] |
| Max retries:            [  2 ] |
| Rate limit/gio:         [ 30 ] |
| Delay giua tasks min:   [ 30 ] |
| Delay giua tasks max:   [120 ] |
+--------------------------------+

+------- CAU HINH CHUNG ---------+
| Heartbeat interval (s): [ 30 ] |
| Heartbeat timeout (s):  [ 90 ] |
| Max clients/user:       [  3 ] |
| Max clients/IP:         [  2 ] |
+--------------------------------+

            [Luu thay doi]
```

### 8.3. Cau hinh Thanh toan

```
TRANG: /payments/settings

+------ KENH THANH TOAN --------+
| [V] MoMo                      |
|     Partner Code: [xxxxxxxx]   |
|     Access Key:   [xxxxxxxx]   |
|     Secret Key:   [xxxxxxxx]   |
|     Phi: [0]%   Min: [10000]   |
|                                |
| [V] SePay                     |
|     API Key:      [xxxxxxxx]   |
|     Ngan hang:    [VCB     ]   |
|     So TK:        [xxxxxxxx]   |
|     Phi: [0]%   Min: [10000]   |
|                                |
| [V] Chuyen khoan ngan hang    |
|     Ngan hang:    [VCB     ]   |
|     So TK:        [xxxxxxxx]   |
|     Chu TK:       [xxxxxxxx]   |
|     Chi nhanh:    [xxxxxxxx]   |
|                                |
| [ ] ZaloPay (Tat)              |
+--------------------------------+
    [+ Them kenh thanh toan]
```

### 8.4. Quan ly Goi Credit

```
TRANG: /admin/credit-packages

+-----+-------------------+--------+-------+---------+---------+--------+
| #   | Ten goi           | Credit | Bonus | Gia VND | Badge   | Trang  |
+-----+-------------------+--------+-------+---------+---------+--------+
| 1   | Goi Co Ban        | 500    | 0     | 50,000  |         | Active |
| 2   | Goi Tiet Kiem     | 1,200  | +200  | 100,000 | popular | Active |
| 3   | Goi Chuyen Nghiep | 7,000  | +2,800| 500,000 | best    | Active |
| 4   | Goi Doanh Nghiep  | 15,000 | +7,500| 1,000,000| hot    | Active |
+-----+-------------------+--------+-------+---------+---------+--------+
                           [+ Tao goi moi]  [Sua]  [Xoa]
```

### 8.5. Quan ly Cap bac

```
TRANG: /settings/tiers

+--------+----------+-----------+-------+-------+--------+-------+---------+
| Cap    | Gia/thang| Gia/nam   |Uu tien|Credit |Jobs    |Clients|He so    |
|        |          |           |       |/ngay  |dong thoi|      |credit   |
+--------+----------+-----------+-------+-------+--------+-------+---------+
| Dong   | Mien phi | Mien phi  | 1     | 50    | 3      | 1     | 1.0x    |
| Bac    | 99,000   | 990,000   | 3     | 200   | 10     | 2     | 1.2x   |
| Vang   | 249,000  | 2,490,000 | 6     | 500   | 30     | 3     | 1.5x   |
| Kim Cuong| 499,000| 4,990,000 | 10    | 9999  | 100    | 5     | 2.0x   |
+--------+----------+-----------+-------+-------+--------+-------+---------+
                     [Sua cap bac] [Tao moi]

* Moi cap bac co the bat/tat tung tinh nang (keyword, backlink, social, proxy...)
* Admin co the tao them cap bac tuy y
```

### 8.6. Quan ly Khuyen mai

```
TRANG: /admin/promotions

+------+------------------+------------------+--------+-----------+--------+---------+
| #    | Ten KM           | Loai             | Gia tri| Thoi gian | Su dung | Trang  |
+------+------------------+------------------+--------+-----------+--------+---------+
| 1    | Tet Nguyen Dan   | credit_bonus_%   | 30%    | 1/1-15/1  | 45/100 | Active  |
| 2    | Welcome50        | free_credits     | 50     | Always    | 230/   | Active  |
| 3    | DOUBLE2024       | double_earn      | 2x     | 1/12-31/12| 0/50   | Draft   |
+------+------------------+------------------+--------+-----------+--------+---------+
                          [+ Tao khuyen mai moi]

Loai khuyen mai:
- credit_bonus_percent:  Bonus % credit khi mua (VD: +30%)
- credit_bonus_flat:     Bonus so credit khi mua (VD: +100 credit)
- tier_discount_percent: Giam gia goi cap bac (VD: -20%)
- free_credits:          Tang credit mien phi (VD: 50 credit cho user moi)
- double_earn:           Nhan x2 credit khi cay view
```

### 8.7. Quan ly Jobs (Admin)

```
TRANG: /admin/jobs

+------+-----------+----------+--------+----------+---------+----------+--------+
| #    | User      | Loai     | Target | Tien do  | Uu tien | Admin +  | Trang  |
+------+-----------+----------+--------+----------+---------+----------+--------+
| 101  | user_abc  | viewlink | ex.com | 45/100   | 5       | [+3]     | Active |
| 102  | user_xyz  | keyword  | my.com | 12/200   | 8       | [+5]     | Active |
| 103  | user_def  | social   | yt.com | 0/50     | 3       | [0]      | Paused |
+------+-----------+----------+--------+----------+---------+----------+--------+

* Admin co the:
  - Tang/giam admin_priority cho tung job (0-10)
  - Tam dung / Tiep tuc / Xoa bat ky job nao
  - Loc theo loai, trang thai, user, cap bac
```

---

## 9. CLIENT ARCHITECTURE (CHI TIET)

### 9.1. Che do trinh duyet

```python
# Ba che do trinh duyet:

# 1. HEADLESS (An hoan toan) - Nhanh, it ton tai nguyen
browser = await playwright.chromium.launch(headless=True)
# Nhuoc diem: Mot so web phat hien duoc

# 2. HEADED HIDDEN (Chay that nhung an) - KHUYEN NGHI MAC DINH
browser = await playwright.chromium.launch(
    headless=False,
    args=[
        '--window-position=-2400,-2400',  # Day ra ngoai man hinh
        '--window-size=1366,768',
        '--mute-audio',                   # Tat am thanh
    ]
)
# Uu diem: Kho bi phat hien, user khong bi anh huong

# 3. HEADED VISIBLE (Hien thi) - Debug
browser = await playwright.chromium.launch(headless=False)
# Chi dung khi can giam sat hoac debug
```

### 9.2. Luong thuc thi chi tiet

```
[Khoi dong app]
    |
    v
[Hien thi Login Window]
    |
    v
[POST /auth/login] --> Nhan access_token + refresh_token
    |                   Luu refresh_token (encrypted) tren disk
    v
[Ket noi WebSocket] --> wss://api.realsearch.vn/ws?token={access_token}
    |
    v
[Gui "auth" message] --> Server tra ve session_id + server_config
    |
    v
[Vong lap chinh (asyncio)] <-----------------------------------------+
    |                                                                  |
    +--- [Heartbeat loop] --> Gui moi 30 giay                         |
    |                                                                  |
    +--- [Token refresh loop] --> Refresh truoc khi het han            |
    |                                                                  |
    +--- [Nhan message tu server]                                      |
            |                                                          |
            +--- type="task_assign"                                    |
            |       |                                                  |
            |       v                                                  |
            |    [Kiem tra: browser ranh? < max_concurrent?]           |
            |       |                                                  |
            |       +--- YES: Gui "task_accepted"                      |
            |       |         |                                        |
            |       |         v                                        |
            |       |    [Tao Browser Context moi]                     |
            |       |    - Sinh fingerprint ngau nhien                 |
            |       |    - Ap dung stealth scripts                     |
            |       |    - Cau hinh proxy (neu co)                     |
            |       |         |                                        |
            |       |         v                                        |
            |       |    [Chon Job Executor theo job_type]             |
            |       |    - viewlink -> ViewLinkExecutor                |
            |       |    - keyword_seo -> KeywordSEOExecutor           |
            |       |    - backlink -> BacklinkExecutor                |
            |       |    - social_media -> SocialMediaExecutor         |
            |       |         |                                        |
            |       |         v                                        |
            |       |    [Thuc thi job] (chi tiet ben duoi)            |
            |       |         |                                        |
            |       |         v                                        |
            |       |    [Gui "task_completed" + result_data]          |
            |       |    [Dong Browser Context]                        |
            |       |    [Nhan credit_update tu server]                |
            |       |         |                                        |
            |       |         +----------------------------------------+
            |       |                                                  |
            |       +--- NO: Gui "task_rejected" reason="browser_busy" |
            |                                                          |
            +--- type="task_cancel"                                    |
            |       Huy task dang chay                                 |
            |                                                          |
            +--- type="credit_update"                                  |
            |       Cap nhat so du hien thi                            |
            |                                                          |
            +--- type="broadcast"                                      |
            |       Hien thi thong bao                                 |
            |                                                          |
            +--- type="force_update"                                   |
                    Tai va cai dat ban moi                              |
                                                                       |
    [Delay ngau nhien 30-120 giay] --->  [Quay lai vong lap] ---------+
```

### 9.3. ViewLink Executor (Chi tiet)

```
[Nhan task_assign: viewlink]
    |
    v
[Tao Browser Context voi fingerprint ngau nhien]
    |
    v
[Mo phong referer] (neu config co)
    |-- "google": Mo google.com -> doi 1-3s
    |-- "facebook": Mo facebook redirect pattern
    |-- "direct": Khong lam gi
    |
    v
[goto(target_url)]
    |
    v
[Hanh vi tu nhien tren trang]
    |-- Random: Cuon trang (35%)
    |-- Random: Dung doc (30%)
    |-- Random: Di chuyen chuot (15%)
    |-- Random: Nghi (20%)
    |
    | Lặp cho den khi du min_time_on_site ~ max_time_on_site
    |
    v
[Click noi bo?] (neu config.click_internal_links = true)
    |
    +--- Tim link noi bo (cung domain) ngau nhien
    |    |-- Di chuot den link (Bezier curve)
    |    |-- Doi 0.5-2s
    |    |-- Click
    |    |-- Doi trang load
    |    |-- Hanh vi tu nhien tren trang moi (15-60s)
    |    |
    |    +--- Lặp lai (toi da max_internal_clicks lan)
    |
    v
[Thu thap ket qua]
    |-- pages_visited: so trang da xem
    |-- internal_clicks: danh sach URL da click
    |-- time_on_each_page: thoi gian tren moi trang
    |-- scroll_depth: do sau cuon (0.0 - 1.0)
    |-- time_spent: tong thoi gian
    |
    v
[Gui task_completed]
```

### 9.4. Keyword SEO Executor (Chi tiet)

```
[Nhan task_assign: keyword_seo]
    |
    v
[Tao Browser Context]
    |
    v
[Mo Google] (google.com hoac google.com.vn tuy geo_target)
    |
    v
[Go keyword tu nhien]
    |-- Tung ky tu, delay 80-250ms
    |-- 3% xac suat go sai roi xoa
    |-- Dung giua cac tu (100-400ms)
    |
    v
[Nhan Enter]
    |
    v
[Doi ket qua tim kiem load]
    |
    v
[Lap: trang 1 -> max_search_page]
    |
    +--- [Cuon tu nhien qua cac ket qua]
    |    |
    |    +--- [Tim link chua target_domain]
    |         |
    |         +--- TIM THAY:
    |         |    |-- Cuon den vi tri link
    |         |    |-- Doi 1-3s
    |         |    |-- Click vao ket qua
    |         |    |-- Doi trang load
    |         |    |-- Hanh vi tu nhien tren trang (30-90s)
    |         |    |-- [Click noi bo neu bat] (tuong tu ViewLink)
    |         |    |-- Thu thap ket qua
    |         |    |-- Gui task_completed (clicked=true)
    |         |    |-- DONE
    |         |
    |         +--- KHONG TIM THAY:
    |              |-- Tim nut "Next" / "Trang tiep"
    |              |-- Doi 2-5s
    |              |-- Click next
    |              |-- Quay lai lap
    |
    +--- [Da het max_search_page ma khong tim thay]
         |-- Gui task_completed (clicked=false, error="not_found")
```

### 9.5. Humanizer Module

```python
# Cac hanh vi mo phong nguoi dung:

1. TYPE NATURALLY (Go phim)
   - Delay giua phim: 80-250ms (random)
   - Sau dau cach: 100-400ms (lau hon)
   - 3% go sai -> doi 0.1-0.3s -> xoa -> go lai
   - Toc do tang dan (bat dau cham, sau nhanh hon)

2. NATURAL BROWSE (Duyet trang)
   - Weighted random actions:
     * Cuon xuong: 35% (100-500px, doi 0.5-2s)
     * Doc noi dung: 30% (dung 3-10s)
     * Di chuyen chuot: 15% (random vi tri, doi 0.3-1s)
     * Nghi: 20% (dung 2-8s)
   - Lap cho den khi du thoi gian (min_time ~ max_time)

3. BEZIER MOUSE MOVE (Di chuot tu nhien)
   - Di theo duong cong Bezier bac 2 (khong thang)
   - Diem dieu khien ngau nhien
   - 10-25 buoc nho, moi buoc 10-30ms
   - Thỉnh thoang "overshoot" (di qua roi quay lai)

4. NATURAL SCROLL (Cuon trang)
   - Cuon khong deu: 100-400px moi lan
   - Doi ngau nhien giua cac lan cuon: 0.5-3s
   - 10% xac suat cuon nguoc len mot chut (50-150px)
   - Dung khi dat 80% chieu dai trang

5. MOVE TO ELEMENT (Di chuot den element)
   - Khong click giua chinh xac
   - Click o vi tri random trong 20-80% dien tich element
   - Di chuot bang Bezier curve
```

---

## 10. HE THONG PHAN PHOI JOB (Job Dispatcher)

### 10.1. Kien truc

```
                     +------------------+
                     |   PostgreSQL     |
                     |  (Jobs, Tasks)   |
                     +--------+---------+
                              |
                     +--------v---------+
                     |  Job Scheduler   |  <-- Background task (moi 2 giay)
                     |  (Redis Queue)   |
                     +--------+---------+
                              |
              +---------------+---------------+
              |               |               |
     +--------v------+ +-----v--------+ +----v---------+
     |  Job Queue    | | Job Queue    | | Job Queue    |
     | (viewlink)    | | (keyword)    | | (social)     |
     | Priority Heap | | Priority Heap| | Priority Heap|
     +---------+-----+ +------+-------+ +------+-------+
              |               |               |
     +--------v---------------v---------------v--------+
     |              WebSocket Manager                   |
     |         (Connection Pool - 500+ clients)         |
     +--+----------+----------+----------+----------+--+
        |          |          |          |          |
     Client1   Client2   Client3   Client4   Client5
```

### 10.2. Thuat toan phan phoi

```
Moi 2 giay:
1. Lay danh sach clients dang RANH
   (active_tasks < max_concurrent AND heartbeat healthy)

2. Lay danh sach jobs ACTIVE, sap xep theo PRIORITY SCORE

3. Ghep doi job-client:
   Voi moi client ranh:
     a. Tim job phu hop nhat (score cao nhat)
     b. Kiem tra:
        - Client ho tro job_type nay? (enabled_job_types)
        - Country match? (neu job co allowed_countries)
        - Client KHONG phai owner cua job? (khong tu view chinh minh)
        - Job chua dat daily_limit?
        - Job chua het credit_budget?
        - Job owner con du credit de tra?
     c. Neu OK:
        - Tao task moi trong DB
        - Gui task_assign qua WebSocket
        - Danh dau client la BUSY
     d. Neu khong: skip, thu job tiep theo

PRIORITY SCORE (xep hang job):
  score = job.priority * 10             (user dat)
        + tier.priority_level * 5       (cap bac user)
        + admin_priority * 8            (admin chi dinh)
        + (1 - completed/target) * 30   (chua xong nhieu)
        + min(gio_tu_lan_cuoi * 2, 20)  (lau khong xu ly)
        - tasks_1h_qua * 0.5           (vua xu ly nhieu)
```

---

## 11. CHONG PHAT HIEN (Anti-Detection)

```
1. BROWSER FINGERPRINT RANDOMIZATION
   - User-Agent: Pool cac Chrome version moi nhat
   - Viewport: 8+ kich thuoc pho bien (1920x1080, 1366x768, ...)
   - Timezone: Theo geo_target (VN -> Asia/Ho_Chi_Minh)
   - Locale: vi-VN hoac en-US
   - WebGL: 5+ combo GPU thuc te
   - Hardware Concurrency: 4/8/12/16
   - Device Memory: 4/8/16 GB
   - Platform: Win32

2. STEALTH SCRIPTS (inject truoc moi trang)
   - An navigator.webdriver = undefined
   - Gia lap navigator.plugins (3 plugins nhu Chrome that)
   - Fix window.chrome runtime object
   - Fix navigator.permissions.query
   - Override WebGL getParameter (vendor, renderer)
   - Override hardwareConcurrency, deviceMemory

3. TIMING RANDOMIZATION
   - Thoi gian tren trang: Gaussian distribution
   - Delay giua actions: Random (khong co dinh)
   - Khong co 2 session giong nhau

4. MOUSE MOVEMENT
   - Bezier curve (khong di thang)
   - Toc do thay doi (nhanh -> cham khi gan target)
   - "Overshoot" ngau nhien
   - Micro-movements khi "doc"

5. REFERRER DIVERSITY
   - 40% Google, 20% Facebook, 15% Direct, 25% khac

6. SESSION ISOLATION
   - Moi task = 1 browser context MOI
   - Khong chia se cookies giua tasks
   - Fingerprint khac nhau moi lan
   - IP khac nhau (neu co proxy pool)

7. RATE LIMITING (client)
   - Max 30 tasks/gio
   - Delay 30-120 giay giua tasks
   - Nghi 5-15 phut sau moi 10 tasks
```

---

## 12. DEPLOYMENT

### 12.1. Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build: ./server
    container_name: rs_api
    restart: always
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql+asyncpg://rs_user:${DB_PASSWORD}@postgres:5432/realsearch
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - ENVIRONMENT=production
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    container_name: rs_postgres
    restart: always
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=realsearch
      - POSTGRES_USER=rs_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports: ["127.0.0.1:5432:5432"]

  redis:
    image: redis:7-alpine
    container_name: rs_redis
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes: [redis_data:/data]

  admin:
    build: ./admin
    container_name: rs_admin
    restart: always
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=https://api.realsearch.vn
      - NEXT_PUBLIC_WS_URL=wss://api.realsearch.vn/ws

  nginx:
    image: nginx:alpine
    container_name: rs_nginx
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on: [api, admin]

volumes:
  postgres_data:
  redis_data:
```

### 12.2. VPS Yeu cau

```
CPU:     4 vCPU
RAM:     8 GB (toi thieu 4 GB)
Storage: 50 GB SSD
OS:      Ubuntu 22.04 LTS
Network: 1 Gbps

Phan bo RAM:
- PostgreSQL: 2 GB
- Redis:      256 MB
- FastAPI:    2 GB (4 workers x 512 MB)
- Nginx:     256 MB
- Admin UI:  512 MB
- OS:        3 GB
```

---

## 13. BAO MAT

### 13.1. JWT Authentication Flow

```
CLIENT                          SERVER
  |                               |
  |--- POST /auth/login --------->|
  |    {username, password}       |
  |                               |-- Verify password (bcrypt, 12 rounds)
  |                               |-- Generate tokens
  |<-- {access_token (30 phut),  --|
  |     refresh_token (7 ngay)}   |
  |                               |
  |--- API request -------------->|
  |    Header: Bearer {access}    |
  |                               |-- Verify JWT
  |<-- {data} -------------------|
  |                               |
  |--- Token expired ------------->|
  |    POST /auth/refresh          |
  |    {refresh_token}             |
  |                               |-- Check Redis (not revoked)
  |<-- {new_access_token} --------|
  |                               |
  |--- WebSocket connect -------->|
  |    wss://...?token={access}   |
  |                               |-- Verify JWT in query param
  |<-- Connected + session_id ----|
```

### 13.2. Security Checklist

```
[x] HTTPS bat buoc (Nginx + Let's Encrypt)
[x] Rate limiting: 30 req/s REST, 10 msg/s WebSocket
[x] CORS: Chi cho phep admin domain
[x] Input validation: Pydantic models
[x] SQL injection: SQLAlchemy ORM (parameterized)
[x] Password: bcrypt, 12 rounds
[x] JWT: httpOnly cookie cho admin, header cho client
[x] Machine ID binding: max 3 clients/user
[x] Anti-abuse: reject task qua nhanh (<50% min_time)
[x] Anti-abuse: canh bao success rate > 99%
[x] Anti-abuse: max 2 clients/IP
[x] Credit: atomic transactions (SELECT FOR UPDATE)
[x] Payment callback: verify signature tu MoMo/SePay
[x] Admin: role-based access control
```

---

## 14. GIAI DOAN PHAT TRIEN

### Phase 1: Core Foundation (Tuan 1-3)

```
Tuan 1:
  [x] Khoi tao monorepo project structure
  [x] Docker Compose cho dev (PostgreSQL + Redis)
  [x] PostgreSQL schema + Alembic migrations
  [x] FastAPI skeleton + config + database.py
  [x] Auth API: register, login, JWT, refresh token
  [x] User CRUD API

Tuan 2:
  [ ] WebSocket server (ConnectionManager, heartbeat)
  [ ] Job CRUD API (tao, sua, xoa, list, start/pause)
  [ ] Credit system (earn, spend, balance, history)
  [ ] Task model + lifecycle (assign, complete, fail, timeout)

Tuan 3:
  [ ] Job Dispatcher (thuat toan phan phoi + priority)
  [ ] Redis integration (caching, job queue)
  [ ] Membership tiers + packages
  [ ] Unit tests cho core services
```

### Phase 2: Windows Client (Tuan 4-6)

```
Tuan 4:
  [ ] Client skeleton: login, config, WebSocket connection
  [ ] Browser Manager (Playwright + stealth scripts)
  [ ] Fingerprint Generator
  [ ] Humanizer module (mouse, scroll, typing)

Tuan 5:
  [ ] ViewLink Executor (+ internal click + tuong tac)
  [ ] Task result reporting (qua WebSocket)
  [ ] Client UI co ban (tkinter: login, status, logs)
  [ ] Toggle headless/headed/headed_hidden

Tuan 6:
  [ ] Keyword SEO Executor
  [ ] Auto-reconnect WebSocket
  [ ] Error handling + recovery
  [ ] PyInstaller build + auto-updater
```

### Phase 3: Admin Panel (Tuan 7-8)

```
Tuan 7:
  [ ] Next.js + Shadcn/ui setup
  [ ] Dashboard (overview stats, online clients)
  [ ] Users management (list, detail, cap bac, credit)
  [ ] Jobs management (CRUD, priority, start/pause)

Tuan 8:
  [ ] Settings pages (credit, task, payment channels, tiers)
  [ ] Credit packages management (tao, sua, gia, bonus)
  [ ] Promotion management
  [ ] Real-time monitoring (WebSocket -> admin dashboard)
  [ ] Charts va statistics
```

### Phase 4: Thanh toan & SaaS (Tuan 9-10)

```
Tuan 9:
  [ ] Payment channels (MoMo, SePay, Bank Transfer)
  [ ] Payment processing + callback
  [ ] Credit purchase flow
  [ ] Tier subscription flow
  [ ] Promotion/coupon system

Tuan 10:
  [ ] Social Media Executor (YouTube, Facebook)
  [ ] Backlink Executor
  [ ] Proxy management
  [ ] Referral system
  [ ] Error handling toan he thong
```

### Phase 5: Scale & Optimize (Ongoing)

```
  [ ] Load testing 500+ clients
  [ ] Database optimization (indexing, partitioning)
  [ ] Connection pooling tuning
  [ ] Monitoring (Prometheus + Grafana)
  [ ] Advanced anti-detection
  [ ] Mobile app (Flutter) - giai doan sau
```

**Tong thoi gian uoc tinh: 8-12 tuan** cho 1 developer full-time.

---

## 15. FILE QUAN TRONG NHAT (TAO DAU TIEN)

| # | File | Chuc nang |
|---|------|-----------|
| 1 | `server/app/main.py` | FastAPI entry point, routes, WS, startup |
| 2 | `server/app/ws/job_dispatcher.py` | Loi he thong: phan phoi job 500+ clients |
| 3 | `server/app/ws/manager.py` | WebSocket connection manager |
| 4 | `server/app/services/credit_service.py` | Credit atomic transactions |
| 5 | `server/app/services/payment_service.py` | Xu ly thanh toan |
| 6 | `client/src/browser/humanizer.py` | Mo phong hanh vi nguoi |
| 7 | `client/src/browser/manager.py` | Browser lifecycle + stealth |
| 8 | `client/src/jobs/viewlink.py` | ViewLink executor |
| 9 | `client/src/jobs/keyword_seo.py` | Keyword SEO executor |
| 10 | `admin/src/app/page.tsx` | Admin dashboard |

---

## 16. VERIFICATION (KIEM TRA)

```
1. docker compose up -> tat ca services start OK
2. POST /auth/register + /auth/login -> nhan JWT tokens
3. POST /jobs (tao viewlink job) -> kiem tra trong DB
4. Chay client -> dang nhap -> ket noi WebSocket -> nhan heartbeat
5. Server gui task_assign -> client mo browser AN -> view trang -> gui task_completed
6. Kiem tra: credit cua nguoi tao job bi tru, credit cua nguoi thuc hien duoc cong
7. Admin UI: dashboard hien thi clients online, jobs stats, credit flow
8. Thu mua credit qua MoMo -> kiem tra callback -> credit duoc cong
9. Nang cap cap bac -> kiem tra priority tang, tinh nang mo khoa
10. Tao khuyen mai -> ap dung -> kiem tra bonus credit
```
