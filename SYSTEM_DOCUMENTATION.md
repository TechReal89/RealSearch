# REALSEARCH - TAI LIEU HE THONG TOAN DIEN

> Tai lieu nay chua tat ca thong tin can thiet de rebuild toan bo he thong RealSearch tren mot server moi tu dau.
>
> Ngay cap nhat: 2026-03-09

---

## MUC LUC

1. [Tong quan he thong](#1-tong-quan-he-thong)
2. [Server / VPS](#2-server--vps)
3. [Database Schema](#3-database-schema)
4. [API Server (FastAPI)](#4-api-server-fastapi)
5. [Admin Panel (Next.js)](#5-admin-panel-nextjs)
6. [Web User (Next.js)](#6-web-user-nextjs)
7. [Client (Python)](#7-client-python)
8. [Domains & Nginx](#8-domains--nginx)
9. [Credentials](#9-credentials)
10. [Deployment tu dau (Step by step)](#10-deployment-tu-dau-step-by-step)
11. [Van de da biet & Cong viec con lai](#11-van-de-da-biet--cong-viec-con-lai)

---

## 1. TONG QUAN HE THONG

### 1.1. Mo ta

RealSearch la he thong **Traffic Exchange & SEO Automation**. Nguoi dung co the tang luot truy cap website, tang thu hang keyword tren Google, va tuong tac mang xa hoi. He thong hoat dong theo mo hinh **Exchange** (trao doi luot view) ket hop **SaaS** (tra phi premium).

### 1.2. Kien truc tong the

```
Monorepo: /root/RealSearch/
|
|-- server/     FastAPI backend (chay trong Docker)
|-- admin/      Next.js admin panel (port 3000, dev mode)
|-- web/        Next.js user website (port 3001, systemd service)
|-- client/     Python desktop client (PyInstaller -> .exe cho Windows)
```

**So do kien truc:**

```
+--------------------------------------------------------------+
|                    LINUX VPS (36.50.232.108)                  |
|                                                               |
|  +----------+  +----------+  +---------+  +---------------+  |
|  | FastAPI   |  |PostgreSQL|  |  Redis  |  | Next.js Admin |  |
|  | + WS     |  |    16    |  |    7    |  |  (port 3000)  |  |
|  | :8000    |  |  :5432   |  |  :6379  |  |               |  |
|  +----------+  +----------+  +---------+  +---------------+  |
|                                                               |
|  +---------------+  +------------------------------------+    |
|  | Next.js Web   |  |  Nginx (Reverse Proxy + SSL)       |    |
|  | (port 3001)   |  |  :80 -> :443 redirect              |    |
|  +---------------+  +------------------------------------+    |
+---------------------------------------------------------------+
          |
          | HTTPS / WSS
          |
   +------+----------------------------------------+
   |                    |                           |
+--+------+   +--------+-------+   +--------+------+
| Admin   |   | Client 1 (PC)  |   | Client 2 (PC) |  ... 500+
| Browser |   | Playwright     |   | Playwright     |
+---------+   +----------------+   +----------------+
```

### 1.3. Tech Stack

| Tang         | Cong nghe                    | Version       |
|--------------|------------------------------|---------------|
| Backend API  | FastAPI (Python)             | 0.115.6       |
| Runtime      | Uvicorn                      | 0.34.0        |
| ORM          | SQLAlchemy (async)           | 2.0.36        |
| Database     | PostgreSQL (Docker)          | 16-alpine     |
| Cache/Queue  | Redis (Docker)               | 7-alpine      |
| Migration    | Alembic                      | 1.14.0        |
| Admin Web    | Next.js + shadcn/ui          | 16.1.6        |
| User Web     | Next.js + shadcn/ui          | 16.1.6        |
| UI Library   | React                        | 19.2.3        |
| CSS          | Tailwind CSS                 | 4.x           |
| Client       | Python + Playwright          | 3.12 / 1.49.1 |
| Build Client | PyInstaller                  | 6.11.1        |
| Auth         | JWT (python-jose)            | HS256         |
| Reverse Proxy| Nginx                        | system        |
| SSL          | Let's Encrypt (Certbot)      | auto          |
| Container    | Docker Compose               | system        |

### 1.4. Trang thai hien tai (2026-03-09)

| Phase                    | Tien do | Ghi chu                                       |
|--------------------------|---------|-----------------------------------------------|
| Phase 1 - Server core   | 95%     | API, Auth, DB, WebSocket, Jobs, Credits, Tiers |
| Phase 2 - Client         | 85%     | 4 executor, auto-update, UI                   |
| Phase 3 - Admin          | 90%     | CRUD, monitoring, config, promotions           |
| Phase 4 - Payment + SaaS | 70%    | SePay + MoMo webhook + tier + promotion        |
| Phase 5 - Scale          | 0%      | Chua bat dau                                   |

### 1.5. Du lieu hien tai trong DB

- 3 users: admin (diamond), testuser (bronze), baolong (bronze)
- 3 jobs: tat ca active viewlink
- 62 tasks: 18 completed, 3 assigned, 41 pending

---

## 2. SERVER / VPS

### 2.1. Thong tin VPS

| Thong so  | Gia tri           |
|-----------|-------------------|
| IP        | 36.50.232.108     |
| OS        | Ubuntu (Linux 6.8.0-94-generic) |
| Shell     | bash              |
| Source    | /root/RealSearch/  |

### 2.2. Docker Containers

He thong chay 3 Docker containers qua Docker Compose:

| Container          | Image              | Port        | Volume                              |
|--------------------|--------------------|-------------|--------------------------------------|
| realsearch-db      | postgres:16-alpine | 5432:5432   | postgres_data:/var/lib/postgresql/data |
| realsearch-redis   | redis:7-alpine     | 6379:6379   | redis_data:/data                     |
| realsearch-server  | build ./server     | 8000:8000   | ./server:/app (mount source)         |

**docker-compose.yml:**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: realsearch-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: realsearch-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: realsearch-server
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "8000:8000"
    volumes:
      - ./server:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  postgres_data:
  redis_data:
```

> **Luu y:** Server source duoc mount voi `--reload`, thay doi code tu dong apply.

### 2.3. Map port tong hop

| Port | Service                  | Truy cap                                    |
|------|--------------------------|---------------------------------------------|
| 8000 | FastAPI API + WebSocket  | api.realsearch.techreal.vn                   |
| 3000 | Admin Panel (Next.js dev)| admin.realsearch.techreal.vn                 |
| 3001 | User Website (Next.js)   | realsearch.techreal.vn                       |
| 5432 | PostgreSQL               | localhost only (Docker internal)             |
| 6379 | Redis                    | localhost only (Docker internal)             |
| 80   | Nginx (redirect -> 443) | Public                                       |
| 443  | Nginx (SSL)             | Public                                       |

---

## 3. DATABASE SCHEMA

### 3.1. Tong quan cac bang

He thong co 12 bang chinh (SQLAlchemy ORM models):

| # | Bang                 | Model class           | File                        | Mo ta                           |
|---|----------------------|-----------------------|-----------------------------|---------------------------------|
| 1 | users                | User                  | models/user.py              | Nguoi dung                      |
| 2 | membership_tiers     | MembershipTierConfig  | models/tier.py              | Cau hinh cap bac                |
| 3 | jobs                 | Job                   | models/job.py               | Cong viec (viewlink, keyword...)  |
| 4 | tasks                | Task                  | models/task.py              | Moi luot thuc hien cua 1 job   |
| 5 | credit_transactions  | CreditTransaction     | models/credit.py            | Lich su giao dich credit        |
| 6 | client_sessions      | ClientSession         | models/session.py           | Phien lam viec cua client       |
| 7 | payment_channels     | PaymentChannel        | models/payment.py           | Kenh thanh toan (MoMo, SePay...) |
| 8 | payments             | Payment               | models/payment.py           | Giao dich thanh toan            |
| 9 | credit_packages      | CreditPackage         | models/package.py           | Goi mua credit                  |
| 10| promotions           | Promotion             | models/promotion.py         | Khuyen mai                      |
| 11| promotion_usage      | PromotionUsage        | models/promotion.py         | Lich su su dung khuyen mai      |
| 12| proxies              | Proxy                 | models/proxy.py             | Proxy pool                      |
| 13| system_settings      | SystemSetting         | models/setting.py           | Cau hinh he thong               |

### 3.2. Chi tiet tung bang

#### 3.2.1. users

```
id              SERIAL PRIMARY KEY
email           VARCHAR(255) UNIQUE NOT NULL     -- Index
username        VARCHAR(50) UNIQUE NOT NULL      -- Index
hashed_password TEXT NOT NULL
full_name       VARCHAR(100) nullable

role            ENUM('user', 'admin')            -- default 'user'
tier            ENUM('bronze','silver','gold','diamond')  -- default 'bronze'

credit_balance  INTEGER default 0
total_earned    INTEGER default 0
total_spent     INTEGER default 0

tier_expires    TIMESTAMP WITH TZ nullable
referral_code   VARCHAR(20) UNIQUE nullable
referred_by     INTEGER FK(users.id) nullable

avatar_url      VARCHAR(500) nullable
phone           VARCHAR(20) nullable
is_active       BOOLEAN default true
is_verified     BOOLEAN default false
last_login_at   TIMESTAMP WITH TZ nullable

created_at      TIMESTAMP WITH TZ default now()
updated_at      TIMESTAMP WITH TZ default now(), on_update now()
```

#### 3.2.2. membership_tiers

```
id                      SERIAL PRIMARY KEY
name                    VARCHAR(50) UNIQUE NOT NULL     -- 'bronze', 'silver', 'gold', 'diamond'
display_name            VARCHAR(100) NOT NULL
color                   VARCHAR(7) nullable              -- hex color
icon                    VARCHAR(50) nullable

price_monthly           NUMERIC(12,0) default 0          -- VND/thang
price_yearly            NUMERIC(12,0) default 0          -- VND/nam

priority_level          INTEGER default 1                -- 1-10
daily_credit_limit      INTEGER default 50
max_jobs                INTEGER default 3
max_urls_per_job        INTEGER default 10
max_clients             INTEGER default 1
credit_earn_multiplier  NUMERIC(3,1) default 1.0

allow_keyword_seo       BOOLEAN default false
allow_backlink          BOOLEAN default false
allow_social_media      BOOLEAN default false
allow_internal_click    BOOLEAN default false
allow_proxy             BOOLEAN default false
allow_scheduling        BOOLEAN default false
allow_priority_boost    BOOLEAN default false
allow_detailed_report   BOOLEAN default false

sort_order              INTEGER default 0
is_active               BOOLEAN default true
created_at              TIMESTAMP WITH TZ default now()
```

**Du lieu mac dinh (seed):**

| name    | display_name     | price_monthly | priority | daily_credit | max_jobs | multiplier |
|---------|------------------|---------------|----------|--------------|----------|------------|
| bronze  | Cap Dong         | 0 (free)      | 1        | 50           | 3        | 1.0x       |
| silver  | Cap Bac          | 99,000        | 3        | 200          | 10       | 1.2x       |
| gold    | Cap Vang         | 249,000       | 6        | 500          | 30       | 1.5x       |
| diamond | Cap Kim Cuong    | 499,000       | 10       | 9999         | 100      | 2.0x       |

#### 3.2.3. jobs

```
id                  SERIAL PRIMARY KEY
user_id             INTEGER FK(users.id) NOT NULL   -- Index
job_type            ENUM('viewlink','keyword_seo','backlink','social_media') NOT NULL
status              ENUM('draft','active','paused','completed','cancelled','expired') default 'draft'
title               VARCHAR(255) NOT NULL

target_url          TEXT NOT NULL
target_count        INTEGER default 100
completed_count     INTEGER default 0
daily_limit         INTEGER nullable
today_count         INTEGER default 0

credit_per_view     INTEGER default 1
total_credit_budget INTEGER nullable
credit_spent        INTEGER default 0

start_date          TIMESTAMP WITH TZ nullable
end_date            TIMESTAMP WITH TZ nullable

config              JSONB default '{}'              -- Cau hinh nang cao theo job_type

priority            INTEGER default 5               -- 1-10 (user dat)
admin_priority      INTEGER default 0               -- 0-10 (admin boost)
is_exchange         BOOLEAN default true

created_at          TIMESTAMP WITH TZ default now()
updated_at          TIMESTAMP WITH TZ default now(), on_update now()
```

**JSONB config theo job_type:**

- **viewlink:** `min_time_on_site`, `max_time_on_site`, `click_internal_links`, `max_internal_clicks`, `scroll_behavior`, `allowed_countries`, `referer_sources`, `device_types`
- **keyword_seo:** `keywords`, `search_engine`, `target_domain`, `max_search_page`, `min_time_on_site`, `max_time_on_site`, `click_internal_links`, `geo_target`
- **backlink:** `anchor_texts`, `target_sites`, `backlink_type`, `nofollow_ok`
- **social_media:** `platform`, `action`, `video_url`, `min_watch_time`, `max_watch_time`

#### 3.2.4. tasks

```
id                  BIGSERIAL PRIMARY KEY
job_id              INTEGER FK(jobs.id) NOT NULL     -- Index
assigned_to         INTEGER FK(users.id) nullable    -- Index
client_session_id   VARCHAR(64) nullable

status              ENUM('pending','assigned','executing','completed','failed','timeout') default 'pending'

started_at          TIMESTAMP WITH TZ nullable
completed_at        TIMESTAMP WITH TZ nullable
time_spent          INTEGER nullable                 -- giay
result_data         JSONB default '{}'

error_message       TEXT nullable
retry_count         INTEGER default 0
max_retries         INTEGER default 2
credits_earned      INTEGER default 0

created_at          TIMESTAMP WITH TZ default now()
expires_at          TIMESTAMP WITH TZ nullable
```

#### 3.2.5. credit_transactions

```
id              BIGSERIAL PRIMARY KEY
user_id         INTEGER FK(users.id) NOT NULL       -- Index
type            ENUM('earn_task','spend_job','purchase','bonus','referral','refund','admin_adjust','promotion')
amount          INTEGER NOT NULL                    -- + kiem, - chi
balance_after   INTEGER NOT NULL

reference_type  VARCHAR(50) nullable                -- 'task', 'job', 'payment'...
reference_id    BIGINT nullable
description     TEXT nullable

created_at      TIMESTAMP WITH TZ default now()     -- Index
```

#### 3.2.6. client_sessions

```
id                  VARCHAR(64) PRIMARY KEY          -- UUID
user_id             INTEGER FK(users.id) NOT NULL    -- Index

machine_id          VARCHAR(255) nullable
os_info             VARCHAR(255) nullable
ip_address          INET nullable
country             VARCHAR(5) nullable

is_online           BOOLEAN default true             -- Index
last_heartbeat      TIMESTAMP WITH TZ default now()
connected_at        TIMESTAMP WITH TZ default now()
disconnected_at     TIMESTAMP WITH TZ nullable

tasks_completed     INTEGER default 0
tasks_failed        INTEGER default 0
credits_earned      INTEGER default 0

client_version      VARCHAR(20) nullable
browser_mode        VARCHAR(20) default 'headed_hidden'
enabled_job_types   TEXT[] nullable                  -- PostgreSQL array
max_concurrent      INTEGER default 1
```

#### 3.2.7. payment_channels

```
id              SERIAL PRIMARY KEY
name            VARCHAR(50) NOT NULL                 -- 'momo', 'sepay', 'bank_transfer'
display_name    VARCHAR(100) NOT NULL
icon_url        VARCHAR(500) nullable

config          JSONB default '{}'                  -- Cau hinh kenh (API keys, bank info...)

is_active       BOOLEAN default true
fee_percent     NUMERIC(5,2) default 0
min_amount      NUMERIC(12,0) default 10000
max_amount      NUMERIC(12,0) default 10000000
sort_order      INTEGER default 0
created_at      TIMESTAMP WITH TZ default now()
```

#### 3.2.8. payments

```
id              SERIAL PRIMARY KEY
user_id         INTEGER FK(users.id) NOT NULL        -- Index
channel_id      INTEGER FK(payment_channels.id) NOT NULL

amount          NUMERIC(12,0) NOT NULL               -- VND
fee             NUMERIC(12,0) default 0
net_amount      NUMERIC(12,0) NOT NULL

purpose         VARCHAR(50) NOT NULL                 -- 'buy_credit', 'buy_tier', 'buy_both'
credit_amount   INTEGER nullable
tier_id         INTEGER FK(membership_tiers.id) nullable
tier_duration   INTEGER nullable                     -- thang

status          VARCHAR(20) default 'pending'        -- 'pending','processing','completed','failed','refunded'
payment_ref     VARCHAR(255) nullable
transaction_id  VARCHAR(255) UNIQUE nullable          -- Index

promotion_id    INTEGER FK(promotions.id) nullable
bonus_credit    INTEGER default 0

note            TEXT nullable
created_at      TIMESTAMP WITH TZ default now()
completed_at    TIMESTAMP WITH TZ nullable
```

#### 3.2.9. credit_packages

```
id              SERIAL PRIMARY KEY
name            VARCHAR(100) NOT NULL
credit_amount   INTEGER NOT NULL
bonus_credit    INTEGER default 0
price           NUMERIC(12,0) NOT NULL               -- VND

description     TEXT nullable
badge           VARCHAR(50) nullable                 -- 'hot', 'best_value', 'popular'
min_tier        VARCHAR(20) nullable

is_active       BOOLEAN default true
sort_order      INTEGER default 0
created_at      TIMESTAMP WITH TZ default now()
```

**Du lieu mac dinh (seed):**

| Goi              | Credit | Bonus  | Gia VND   | Badge      |
|------------------|--------|--------|-----------|------------|
| Goi Co Ban       | 500    | 0      | 50,000    | -          |
| Goi Tiet Kiem    | 1,200  | +200   | 100,000   | popular    |
| Goi Chuyen Nghiep| 7,000  | +2,800 | 500,000   | best_value |
| Goi Doanh Nghiep | 15,000 | +7,500 | 1,000,000 | hot        |

#### 3.2.10. promotions

```
id              SERIAL PRIMARY KEY
name            VARCHAR(255) NOT NULL
code            VARCHAR(50) UNIQUE nullable          -- Ma khuyen mai

type            VARCHAR(50) NOT NULL
  -- 'credit_bonus_percent', 'credit_bonus_flat', 'tier_discount_percent',
  -- 'tier_discount_flat', 'free_credits', 'double_earn'
value           NUMERIC(10,2) NOT NULL

min_purchase    NUMERIC(12,0) nullable
min_tier        VARCHAR(20) nullable
max_uses        INTEGER nullable
max_uses_per_user INTEGER default 1
current_uses    INTEGER default 0

start_date      TIMESTAMP WITH TZ NOT NULL
end_date        TIMESTAMP WITH TZ NOT NULL

is_active       BOOLEAN default true
created_at      TIMESTAMP WITH TZ default now()
```

#### 3.2.11. promotion_usage

```
id              SERIAL PRIMARY KEY
promotion_id    INTEGER FK(promotions.id) NOT NULL
user_id         INTEGER FK(users.id) NOT NULL
payment_id      INTEGER FK(payments.id) nullable
used_at         TIMESTAMP WITH TZ default now()

UNIQUE(promotion_id, user_id, payment_id)
```

#### 3.2.12. proxies

```
id              SERIAL PRIMARY KEY
host            VARCHAR(255) NOT NULL
port            INTEGER NOT NULL
username        VARCHAR(255) nullable
password        VARCHAR(255) nullable
protocol        VARCHAR(10) default 'http'           -- 'http', 'socks5'
country         VARCHAR(5) nullable

is_active       BOOLEAN default true
last_checked    TIMESTAMP WITH TZ nullable
success_rate    NUMERIC(5,2) default 100.0
avg_response_ms INTEGER nullable

created_at      TIMESTAMP WITH TZ default now()
```

#### 3.2.13. system_settings

```
key             VARCHAR(100) PRIMARY KEY
value           TEXT NOT NULL
category        VARCHAR(50) NOT NULL                 -- 'general', 'credit', 'task', 'security'
display_name    VARCHAR(255) nullable
description     TEXT nullable
value_type      VARCHAR(20) default 'string'         -- 'string', 'number', 'boolean', 'json'

updated_at      TIMESTAMP WITH TZ default now(), on_update now()
updated_by      INTEGER FK(users.id) nullable
```

**Du lieu mac dinh (seed) - 22 settings:**

| Key                          | Value | Category | Mo ta                                  |
|------------------------------|-------|----------|----------------------------------------|
| credit_per_viewlink          | 1     | credit   | Credit/viewlink task                   |
| credit_per_keyword           | 3     | credit   | Credit/keyword SEO (tim thay)          |
| credit_per_keyword_miss      | 1     | credit   | Credit/keyword SEO (khong tim thay)    |
| credit_per_backlink          | 2     | credit   | Credit/backlink                        |
| credit_per_social            | 2     | credit   | Credit/social media                    |
| credit_referral_bonus        | 50    | credit   | Thuong gioi thieu                      |
| credit_daily_bonus           | 10    | credit   | Bonus hoan thanh 10+ tasks/ngay        |
| credit_daily_bonus_min_tasks | 10    | credit   | Min tasks de nhan bonus                |
| min_time_on_site             | 15    | task     | Thoi gian toi thieu tren trang (giay)  |
| max_concurrent_tasks         | 2     | task     | Tasks dong thoi toi da/client          |
| task_timeout_seconds         | 300   | task     | Timeout task (giay)                    |
| task_max_retries             | 2     | task     | So lan thu lai toi da                  |
| client_rate_limit_per_hour   | 30    | task     | Max tasks/gio/client                   |
| delay_between_tasks_min      | 30    | task     | Delay min giua 2 tasks (giay)          |
| delay_between_tasks_max      | 120   | task     | Delay max giua 2 tasks (giay)          |
| heartbeat_interval           | 30    | general  | Heartbeat interval (giay)              |
| heartbeat_timeout            | 90    | general  | Heartbeat timeout (giay)               |
| max_clients_per_user         | 3     | general  | Max clients dong thoi/user             |
| max_clients_per_ip           | 2     | general  | Max clients dong thoi/IP               |
| min_task_time_ratio          | 0.5   | security | Task reject neu time < min * ratio     |
| suspicious_success_rate      | 0.99  | security | Canh bao success rate qua cao          |

### 3.3. Alembic Migrations

2 migration files:

1. `182838c933d7_create_users_table.py` - Tao bang users
2. `67c6772b693e_add_all_tables_phase2.py` - Tao tat ca cac bang con lai

### 3.4. Seed Data

File: `/root/RealSearch/server/app/seed.py`

Chay seed:
```bash
docker exec -it realsearch-server python -m app.seed
```

Seed tao ra:
- 4 membership tiers (bronze, silver, gold, diamond)
- 4 credit packages
- 22 system settings
- 3 payment channels (momo, sepay, bank_transfer - tat ca inactive)

---

## 4. API SERVER (FASTAPI)

### 4.1. Docker setup

**Dockerfile** (`/root/RealSearch/server/Dockerfile`):

```dockerfile
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4.2. Environment Variables

File: `/root/RealSearch/.env`

```env
# Database
POSTGRES_USER=realsearch
POSTGRES_PASSWORD=[REDACTED]
POSTGRES_DB=realsearch
DATABASE_URL=postgresql+asyncpg://realsearch:[REDACTED]@db:5432/realsearch

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=dev-secret-key-change-in-production-abc123xyz
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=true
```

### 4.3. Config class

File: `/root/RealSearch/server/app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://realsearch:realsearch@db:5432/realsearch"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
```

### 4.4. Python Dependencies

File: `/root/RealSearch/server/requirements.txt`

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.0
pydantic==2.10.3
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
redis[hiredis]==5.2.1
python-multipart==0.0.19
email-validator==2.2.0
python-dateutil==2.9.0
psutil==6.1.1
httpx==0.28.1
```

### 4.5. Entry Point

File: `/root/RealSearch/server/app/main.py`

- FastAPI app voi lifespan (startup: check DB + start job dispatcher)
- CORS: allow all origins (*)
- Router: `/api/v1` prefix
- WebSocket endpoint: `/ws`
- Health check: `/health`

### 4.6. API Routes

#### User Routes

| Method | Endpoint                | Router file       | Mo ta                          |
|--------|-------------------------|-------------------|--------------------------------|
| POST   | /api/v1/auth/register   | api/v1/auth.py    | Dang ky                        |
| POST   | /api/v1/auth/login      | api/v1/auth.py    | Dang nhap -> JWT tokens        |
| POST   | /api/v1/auth/refresh    | api/v1/auth.py    | Refresh access token           |
| GET    | /api/v1/auth/me         | api/v1/auth.py    | Thong tin user hien tai        |
| GET    | /api/v1/users/...       | api/v1/users.py   | Profile, stats                 |
| GET/POST| /api/v1/jobs/...       | api/v1/jobs.py    | CRUD jobs                      |
| GET    | /api/v1/credits/...     | api/v1/credits.py | Balance, history, packages     |
| POST   | /api/v1/payments/...    | api/v1/payments.py| Thanh toan, callback           |

#### Admin Routes

| Method | Endpoint                         | Router file                    | Mo ta                    |
|--------|----------------------------------|--------------------------------|--------------------------|
| GET    | /api/v1/admin/dashboard          | admin/dashboard.py             | Tong quan he thong       |
| GET/PUT| /api/v1/admin/users/...          | admin/users.py                 | Quan ly users            |
| GET/PUT| /api/v1/admin/jobs/...           | admin/jobs.py                  | Quan ly jobs             |
| GET/PUT| /api/v1/admin/settings/...       | admin/settings.py              | Cau hinh he thong        |
| CRUD   | /api/v1/admin/packages/...       | admin/packages.py              | Goi credit               |
| CRUD   | /api/v1/admin/payments/...       | admin/payments.py              | Quan ly thanh toan       |
| CRUD   | /api/v1/admin/tiers/...          | admin/tiers.py                 | Quan ly cap bac          |
| GET    | /api/v1/admin/monitoring/...     | admin/monitoring.py            | Giam sat clients         |
| CRUD   | /api/v1/admin/promotions/...     | admin/promotions.py            | Khuyen mai               |
| GET    | /api/v1/admin/server-monitor/... | admin/server_monitor.py        | CPU/RAM/Disk server      |

### 4.7. WebSocket Protocol

**Endpoint:** `ws://36.50.232.108:8000/ws` (hien tai) hoac `wss://api.realsearch.techreal.vn/ws` (sau khi co SSL)

**Luong ket noi:**

```
Client                              Server
  |                                   |
  |--- ws connect ------------------->|
  |<-- accept ------------------------|
  |                                   |
  |--- {"type":"auth", "data":{      |
  |     "token":"jwt",               |
  |     "client_version":"0.3.2",    |
  |     "machine_id":"hw_fp",        |
  |     "os_info":"Windows 11",      |
  |     "browser_mode":"headed_hidden",|
  |     "enabled_job_types":["viewlink"],|
  |     "max_concurrent":1           |
  |    }} --------------------------->|
  |                                   |-- Verify JWT
  |                                   |-- Check max clients/user (3)
  |                                   |-- Create ClientSession in DB
  |<-- {"type":"auth_result",        |
  |     "data":{                     |
  |       "success":true,            |
  |       "session_id":"uuid",       |
  |       "server_config":{...}      |
  |    }} ----------------------------|
  |                                   |
  |--- heartbeat (moi 30s) --------->|
  |                                   |
  |<-- task_assign -------------------|  (Job Dispatcher moi 5s)
  |--- task_accepted ---------------->|
  |--- task_completed --------------->|
  |<-- credit_update -----------------|
```

**Message types - Client -> Server:**

| Type            | Data                                    | Mo ta                    |
|-----------------|-----------------------------------------|--------------------------|
| auth            | token, machine_id, os_info, ...         | Xac thuc                 |
| heartbeat       | session_id, cpu_usage, memory_usage      | Heartbeat 30s            |
| task_accepted   | task_id                                 | Chap nhan task           |
| task_progress   | task_id, progress, current_step         | Cap nhat tien do         |
| task_completed  | task_id, result                         | Hoan thanh task          |
| task_failed     | task_id, error_code, error_message      | Task that bai            |
| task_rejected   | task_id, reason                         | Tu choi task             |

**Message types - Server -> Client:**

| Type            | Data                                    | Mo ta                    |
|-----------------|-----------------------------------------|--------------------------|
| auth_result     | success, session_id, server_config      | Ket qua xac thuc         |
| task_assign     | task_id, job_type, config, timeout      | Giao task                |
| task_cancel     | task_id, reason                         | Huy task                 |
| credit_update   | balance, earned, reason                 | Cap nhat credit          |
| config_update   | heartbeat_interval, max_concurrent      | Thay doi config          |
| broadcast       | message, level                          | Thong bao tu admin       |
| force_update    | version, download_url, required         | Yeu cau cap nhat app     |
| error           | code, message                           | Loi                      |

### 4.8. JWT Authentication

- Algorithm: HS256
- Secret key: `dev-secret-key-change-in-production-abc123xyz`
- Access token: 30 phut
- Refresh token: 7 ngay
- Password hash: bcrypt (passlib)
- Token format: `{"sub": user_id, "type": "access"/"refresh"}`
- Key luu tru client: `realsearch_access_token` (localStorage cho web)

### 4.9. Job Dispatcher

File: `/root/RealSearch/server/app/ws/job_dispatcher.py`

- Chay nhu background task (asyncio) khi server start
- **Dispatch interval: 5 giay**
- Moi chu ky:
  1. Lay danh sach clients ranh (is_available = active_tasks < max_concurrent)
  2. Lay toi da 50 active jobs, sap xep theo priority
  3. Tinh priority score cho moi job:
     ```
     score = job.priority * 10
           + tier_priority * 5
           + admin_priority * 8
           + (1 - completion_ratio) * 30
           + min(hours_since_update * 2, 20)
     ```
  4. Ghep doi job-client (kiem tra: job_type supported, daily_limit, budget, khong tu view minh)
  5. Tao Task trong DB, gui task_assign qua WebSocket

- Khi task_completed: cap nhat Task, Job.completed_count, credit cho worker, CreditTransaction
- Khi task_failed: retry (reset to pending) hoac mark failed
- Khi task_rejected: reset task to pending

### 4.10. Cau truc thu muc server

```
server/
|-- Dockerfile
|-- requirements.txt
|-- alembic/
|   |-- alembic.ini
|   |-- env.py
|   |-- versions/
|       |-- 182838c933d7_create_users_table.py
|       |-- 67c6772b693e_add_all_tables_phase2.py
|
|-- app/
    |-- __init__.py
    |-- main.py              # FastAPI entry + lifespan + WebSocket endpoint
    |-- config.py            # Settings (pydantic-settings)
    |-- database.py          # SQLAlchemy async engine + session
    |-- dependencies.py      # Dependency injection (get_current_user, require_admin...)
    |-- seed.py              # Seed default data
    |
    |-- models/              # 12 SQLAlchemy ORM models
    |   |-- __init__.py      # Import all models
    |   |-- user.py, job.py, task.py, credit.py, session.py
    |   |-- payment.py, package.py, promotion.py, proxy.py
    |   |-- tier.py, setting.py
    |
    |-- schemas/             # Pydantic request/response schemas
    |   |-- user.py, job.py, credit.py, payment.py, admin.py
    |
    |-- api/v1/              # REST routes
    |   |-- router.py        # Aggregated router
    |   |-- auth.py, users.py, jobs.py, credits.py, payments.py
    |   |-- admin/
    |       |-- dashboard.py, users.py, jobs.py, settings.py
    |       |-- packages.py, payments.py, tiers.py, monitoring.py
    |       |-- promotions.py, server_monitor.py
    |
    |-- ws/                  # WebSocket
    |   |-- manager.py       # ConnectionManager (500+ clients)
    |   |-- handler.py       # Message router + auth
    |   |-- job_dispatcher.py # Job distribution + priority scoring
    |
    |-- services/            # Business logic
    |   |-- payment_service.py
    |   |-- promotion_service.py
    |
    |-- core/                # Utilities
        |-- security.py      # JWT encode/decode, password hash
        |-- exceptions.py    # Custom exceptions
```

---

## 5. ADMIN PANEL (NEXT.JS)

### 5.1. Thong tin chung

| Thong so       | Gia tri                         |
|----------------|---------------------------------|
| Path           | /root/RealSearch/admin/          |
| Framework      | Next.js 16.1.6                  |
| UI Library     | shadcn/ui + Tailwind CSS 4      |
| Port           | 3000                            |
| Chay bang      | `npm run dev` (dev mode)        |
| Domain         | admin.realsearch.techreal.vn    |

### 5.2. Dependencies

```json
{
  "dependencies": {
    "@base-ui/react": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "next-themes": "^0.4.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "shadcn": "^4.0.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### 5.3. Commands

```bash
cd /root/RealSearch/admin
npm install          # Cai dependencies
npm run dev          # Chay dev mode (port 3000)
npm run build        # Build production
npm run start        # Chay production
```

### 5.4. Cac trang chinh

| Path                    | Mo ta                                         |
|-------------------------|-----------------------------------------------|
| /                       | Dashboard (tong quan, stats, clients online)  |
| /login                  | Dang nhap admin                               |
| /users                  | Danh sach users                               |
| /users/[id]             | Chi tiet user                                 |
| /jobs                   | Quan ly jobs (viewlink, keyword, backlink, social) |
| /credits                | Tong quan credit                              |
| /credits/transactions   | Lich su giao dich credit                      |
| /payments               | Quan ly thanh toan                            |
| /payments/settings      | Cau hinh kenh thanh toan                      |
| /packages               | Quan ly goi credit                            |
| /promotions             | Quan ly khuyen mai                            |
| /settings               | Cau hinh he thong                             |
| /settings/pricing       | Gia credit                                    |
| /settings/tiers         | Cau hinh cap bac                              |
| /monitoring             | Giam sat clients real-time                    |
| /server-monitor         | CPU/RAM/Disk/Docker status                    |

### 5.5. Cach chay admin

Hien tai dang chay **dev mode** truc tiep (khong co systemd service):

```bash
cd /root/RealSearch/admin
nohup npm run dev &
```

> **Luu y:** Can tao systemd service hoac dung pm2 cho production.

---

## 6. WEB USER (NEXT.JS)

### 6.1. Thong tin chung

| Thong so       | Gia tri                         |
|----------------|---------------------------------|
| Path           | /root/RealSearch/web/            |
| Framework      | Next.js 16.1.6                  |
| UI Library     | shadcn/ui + Tailwind CSS 4      |
| Port           | 3001                            |
| Domain         | realsearch.techreal.vn          |
| Service        | systemd: realsearch-web          |

### 6.2. Dependencies

Giong het admin panel (cung package.json structure).

### 6.3. Systemd Service

File: `/etc/systemd/system/realsearch-web.service`

```ini
[Unit]
Description=RealSearch User Website
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/RealSearch/web
ExecStart=/usr/bin/npx next start -p 3001
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://36.50.232.108:8000

[Install]
WantedBy=multi-user.target
```

### 6.4. Quan ly service

```bash
sudo systemctl start realsearch-web      # Start
sudo systemctl stop realsearch-web       # Stop
sudo systemctl restart realsearch-web    # Restart
sudo systemctl status realsearch-web     # Xem trang thai
sudo systemctl enable realsearch-web     # Tu dong chay khi boot
sudo journalctl -u realsearch-web -f     # Xem logs
```

### 6.5. Build & Deploy

```bash
cd /root/RealSearch/web
npm install
npm run build        # Bat buoc build truoc khi start production
sudo systemctl restart realsearch-web
```

### 6.6. Cac trang chinh

- Landing page
- Download client
- Dashboard user
- Dang nhap / Dang ky

---

## 7. CLIENT (PYTHON)

### 7.1. Thong tin chung

| Thong so        | Gia tri                                              |
|-----------------|------------------------------------------------------|
| Path            | /root/RealSearch/client/                              |
| Ngon ngu        | Python 3.12                                          |
| Browser engine  | Playwright (Chromium)                                |
| Build           | PyInstaller -> RealSearch.exe (~50MB)                |
| CI/CD           | GitHub Actions (trigger khi push tag v*)             |
| Phien ban hien tai | v0.0.1-dev (file VERSION), latest release v0.3.2  |

### 7.2. Dependencies

File: `/root/RealSearch/client/requirements.txt`

```
playwright==1.49.1
httpx==0.28.1
websockets==14.1
pydantic==2.10.3
pyinstaller==6.11.1
```

### 7.3. Cau truc thu muc client

```
client/
|-- build.spec               # PyInstaller build config
|-- requirements.txt
|-- scripts/
|   |-- gen_icon.py          # Tao app icon
|
|-- src/
    |-- __init__.py
    |-- main.py              # Entry point
    |-- config.py            # Settings (luu local)
    |-- VERSION              # File version (duoc ghi de khi build)
    |
    |-- network/
    |   |-- api_client.py    # REST API calls (httpx)
    |   |-- ws_client.py     # WebSocket client (websockets)
    |
    |-- browser/
    |   |-- manager.py       # Browser lifecycle + stealth
    |   |-- humanizer.py     # Mo phong hanh vi nguoi
    |
    |-- jobs/
    |   |-- base.py          # Abstract executor
    |   |-- viewlink.py      # ViewLink executor
    |   |-- keyword_seo.py   # Keyword SEO executor
    |   |-- backlink.py      # Backlink executor
    |   |-- social_media.py  # Social media executor
    |
    |-- ui/
    |   |-- main_window.py   # Cua so chinh (tkinter)
    |   |-- login_window.py  # Man hinh dang nhap
    |
    |-- utils/
        |-- updater.py       # Auto-update mechanism
        |-- logger.py        # Logging
        |-- system_info.py   # Hardware fingerprint (machine_id)
```

### 7.4. PyInstaller Build

File: `/root/RealSearch/client/build.spec`

- Entry: `src/main.py`
- Output: single file `RealSearch.exe` (console=False)
- Bundled data:
  - `src/VERSION` -> ca `_MEIPASS/VERSION` va `_MEIPASS/src/VERSION`
  - Playwright driver directory
  - `assets/icon.ico`
- Hidden imports: websockets, httpx, pydantic, playwright

Build thu cong:
```bash
cd /root/RealSearch/client
pip install -r requirements.txt
pip install Pillow
python scripts/gen_icon.py
pyinstaller --noconfirm build.spec
# Output: client/dist/RealSearch.exe
```

### 7.5. GitHub Actions CI/CD

File: `/root/RealSearch/.github/workflows/build-client.yml`

**Trigger:** Push tag `v*` (vd: v0.3.2, v1.0.0)

**Steps:**
1. Checkout code
2. Setup Python 3.12
3. Install dependencies + Pillow
4. Ghi version tu tag name vao `client/src/VERSION`
5. Generate app icon
6. Build voi PyInstaller
7. Tao GitHub Release voi file `RealSearch.exe`

**Cach release phien ban moi:**
```bash
git tag v0.4.0
git push origin v0.4.0
# GitHub Actions tu dong build va tao release
```

### 7.6. Auto-update

- Client check ban moi truoc khi login (GitHub Releases API)
- Splash screen hien thi progress khi tai ban moi
- Hoat dong tu v0.3.1+
- Download URL: `https://github.com/TechReal89/RealSearch/releases/latest/download/RealSearch.exe`
- Install dir: `%APPDATA%\RealSearch\RealSearch.exe`
- Config/logs/credentials: `%APPDATA%\RealSearch\`

### 7.7. Tinh nang client

- **Remember login:** Luu credentials (base64) vao `credentials.dat`, tu dong login
- **Self-install:** Copy vao AppData + tao Desktop shortcut lan chay dau
- **3 browser modes:** headless, headed_hidden (mac dinh), headed
- **4 job executors:** viewlink, keyword_seo, backlink, social_media
- **Stealth:** Fingerprint randomization, humanizer (mouse/scroll/typing), anti-detection
- Playwright tu dong tai Chromium lan chay dau (~150MB)

### 7.8. Lich su phien ban

| Version | Tinh nang chinh                              |
|---------|----------------------------------------------|
| v0.1.0  | Ban dau                                      |
| v0.2.0  | Cai tien                                     |
| v0.2.1  | Bug fix                                      |
| v0.3.0  | UI moi                                       |
| v0.3.1  | Auto-update                                  |
| v0.3.2  | Remember login, auto-update, version display |

---

## 8. DOMAINS & NGINX

### 8.1. Domain mapping

| Domain                          | Port | Service        | SSL  | Trang thai        |
|---------------------------------|------|----------------|------|-------------------|
| realsearch.techreal.vn          | 3001 | User Website   | OK   | Hoat dong         |
| admin.realsearch.techreal.vn    | 3000 | Admin Panel    | OK   | Hoat dong         |
| api.realsearch.techreal.vn      | 8000 | API + WebSocket| OK   | SSL OK, can DNS A record |

### 8.2. Nginx Config

File: `/etc/nginx/sites-available/realsearch`

```nginx
# User Website
server {
    server_name realsearch.techreal.vn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/realsearch.techreal.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realsearch.techreal.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Admin Panel
server {
    server_name admin.realsearch.techreal.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/realsearch.techreal.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realsearch.techreal.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# API + WebSocket
server {
    server_name api.realsearch.techreal.vn;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/realsearch.techreal.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realsearch.techreal.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP -> HTTPS redirects (managed by Certbot)
server {
    if ($host = realsearch.techreal.vn) { return 301 https://$host$request_uri; }
    listen 80;
    server_name realsearch.techreal.vn;
    return 404;
}
server {
    if ($host = admin.realsearch.techreal.vn) { return 301 https://$host$request_uri; }
    listen 80;
    server_name admin.realsearch.techreal.vn;
    return 404;
}
server {
    if ($host = api.realsearch.techreal.vn) { return 301 https://$host$request_uri; }
    listen 80;
    server_name api.realsearch.techreal.vn;
    return 404;
}
```

### 8.3. SSL

- **Provider:** Let's Encrypt (Certbot)
- **Certificate:** `/etc/letsencrypt/live/realsearch.techreal.vn/fullchain.pem`
- **Private key:** `/etc/letsencrypt/live/realsearch.techreal.vn/privkey.pem`
- **Config:** `/etc/letsencrypt/options-ssl-nginx.conf`
- **DH params:** `/etc/letsencrypt/ssl-dhparams.pem`
- Ca 3 domain dung chung 1 certificate (SAN cert)

### 8.4. Quan ly Nginx

```bash
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload sau khi thay doi config
sudo systemctl restart nginx     # Restart
sudo certbot renew               # Gia han SSL (tu dong qua cron)
```

---

## 9. CREDENTIALS

> **CANH BAO:** Thong tin nhay cam. Bao mat tai lieu nay.

### 9.1. Admin Account

| Field    | Value                    |
|----------|--------------------------|
| Username | admin                    |
| Password | [REDACTED]      |
| Email    | admin@realsearch.com     |
| Tier     | diamond                  |

### 9.2. Test User

| Field    | Value                    |
|----------|--------------------------|
| Username | baolong                  |
| Email    | it.dangduc@gmail.com     |
| Tier     | bronze                   |

### 9.3. Database

| Field    | Value                    |
|----------|--------------------------|
| Host     | db (Docker internal) / localhost:5432 |
| Database | realsearch               |
| Username | realsearch               |
| Password | [REDACTED]      |
| URL      | postgresql+asyncpg://realsearch:[REDACTED]@db:5432/realsearch |

### 9.4. JWT

| Field       | Value                                           |
|-------------|--------------------------------------------------|
| Secret key  | dev-secret-key-change-in-production-abc123xyz    |
| Algorithm   | HS256                                            |
| Access TTL  | 30 phut                                          |
| Refresh TTL | 7 ngay                                           |

### 9.5. GitHub

| Field     | Value                                            |
|-----------|--------------------------------------------------|
| Account   | vn.techreal@gmail.com / @TechReal89              |
| Token     | [REDACTED - xem file credentials rieng]        |
| Repo      | https://github.com/TechReal89/RealSearch (PUBLIC) |
| Scope     | repo + workflow                                   |

### 9.6. Redis

| Field    | Value                    |
|----------|--------------------------|
| Host     | redis (Docker internal)  |
| Port     | 6379                     |
| URL      | redis://redis:6379/0     |
| Password | (khong co)               |

---

## 10. DEPLOYMENT TU DAU (STEP BY STEP)

### Buoc 1: Chuan bi VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cai Docker + Docker Compose
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker

# Cai Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cai Nginx
sudo apt install -y nginx

# Cai Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Cai Git
sudo apt install -y git
```

### Buoc 2: Clone source code

```bash
cd /root
git clone https://github.com/TechReal89/RealSearch.git
cd RealSearch
```

### Buoc 3: Tao file .env

```bash
cat > /root/RealSearch/.env << 'EOF'
# Database
POSTGRES_USER=realsearch
POSTGRES_PASSWORD=[REDACTED]
POSTGRES_DB=realsearch
DATABASE_URL=postgresql+asyncpg://realsearch:[REDACTED]@db:5432/realsearch

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=dev-secret-key-change-in-production-abc123xyz
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=true
EOF
```

> **QUAN TRONG:** Doi JWT_SECRET_KEY cho production!

### Buoc 4: Chay Docker Compose (Server + DB + Redis)

```bash
cd /root/RealSearch
docker compose up -d

# Kiem tra containers
docker ps

# Xem logs
docker logs realsearch-server -f
```

### Buoc 5: Chay Alembic migrations + Seed data

```bash
# Chay migration
docker exec -it realsearch-server alembic upgrade head

# Seed du lieu mac dinh (tiers, packages, settings, payment channels)
docker exec -it realsearch-server python -m app.seed
```

### Buoc 6: Tao admin user

```bash
# Ket noi vao PostgreSQL
docker exec -it realsearch-db psql -U realsearch -d realsearch

-- Trong psql, chay:
-- (Password hash cho "[REDACTED]" - can generate bang bcrypt)
-- Hoac dang ky qua API roi update role:
```

Cach don gian hon - dang ky qua API roi update role:
```bash
# Dang ky
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@realsearch.com","password":"[REDACTED]"}'

# Update role thanh admin va tier thanh diamond
docker exec -it realsearch-db psql -U realsearch -d realsearch -c \
  "UPDATE users SET role='admin', tier='diamond' WHERE username='admin';"
```

### Buoc 7: Setup Admin Panel

```bash
cd /root/RealSearch/admin
npm install

# Chay dev mode (hoac build cho production)
nohup npm run dev > /tmp/admin.log 2>&1 &

# Hoac build production:
# npm run build
# nohup npm run start > /tmp/admin.log 2>&1 &
```

### Buoc 8: Setup User Website

```bash
cd /root/RealSearch/web
npm install
npm run build

# Tao systemd service
sudo cat > /etc/systemd/system/realsearch-web.service << 'EOF'
[Unit]
Description=RealSearch User Website
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/RealSearch/web
ExecStart=/usr/bin/npx next start -p 3001
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://36.50.232.108:8000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable realsearch-web
sudo systemctl start realsearch-web
```

> **Luu y:** Thay IP `36.50.232.108` bang IP server moi hoac domain API.

### Buoc 9: Setup DNS

Tro DNS A record cho cac domain:

| Domain                       | Type | Value          |
|------------------------------|------|----------------|
| realsearch.techreal.vn       | A    | <IP_SERVER>    |
| admin.realsearch.techreal.vn | A    | <IP_SERVER>    |
| api.realsearch.techreal.vn   | A    | <IP_SERVER>    |

### Buoc 10: Setup Nginx + SSL

```bash
# Tao Nginx config
sudo cat > /etc/nginx/sites-available/realsearch << 'NGINX'
# User Website
server {
    listen 80;
    server_name realsearch.techreal.vn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.realsearch.techreal.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API + WebSocket
server {
    listen 80;
    server_name api.realsearch.techreal.vn;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/realsearch /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test va reload
sudo nginx -t
sudo systemctl reload nginx

# Cai SSL (sau khi DNS da tro dung)
sudo certbot --nginx -d realsearch.techreal.vn -d admin.realsearch.techreal.vn -d api.realsearch.techreal.vn
```

### Buoc 11: Kiem tra

```bash
# API health check
curl http://localhost:8000/health

# Test dang nhap
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"[REDACTED]"}'

# Kiem tra Docker containers
docker ps

# Kiem tra Nginx
sudo systemctl status nginx

# Kiem tra web service
sudo systemctl status realsearch-web

# Kiem tra domain (sau khi DNS + SSL)
curl -I https://realsearch.techreal.vn
curl -I https://admin.realsearch.techreal.vn
curl -I https://api.realsearch.techreal.vn/health
```

### Buoc 12: Backup & Restore Database

**Backup:**
```bash
docker exec realsearch-db pg_dump -U realsearch realsearch > /root/backup_realsearch_$(date +%Y%m%d).sql
```

**Restore:**
```bash
docker exec -i realsearch-db psql -U realsearch realsearch < /root/backup_realsearch_YYYYMMDD.sql
```

---

## 11. VAN DE DA BIET & CONG VIEC CON LAI

### 11.1. Van de da biet

1. **DNS A record cho api.realsearch.techreal.vn** - Can tao A record tro ve IP server
2. **Admin panel chay dev mode** - Can chuyen sang production mode hoac tao systemd service
3. **CORS allow all origins (*)** - Can restrict cho production
4. **JWT secret key la dev key** - Can doi cho production
5. **Redis khong co password** - Can them password cho production
6. **PostgreSQL port 5432 expose ra ngoai** - Can restrict chi localhost
7. **Web service van dung IP truc tiep** (`NEXT_PUBLIC_API_URL=http://36.50.232.108:8000`) - Can doi sang domain

### 11.2. Cong viec con lai (theo thu tu uu tien)

1. **DNS A record** cho `api.realsearch.techreal.vn`
2. **Cap nhat client config** dung domain URLs (`wss://` thay vi `ws://IP`)
3. **Cap nhat web service** `NEXT_PUBLIC_API_URL` sang `https://api.realsearch.techreal.vn`
4. **MoMo payment config** - can partner_code, access_key, secret_key tu MoMo
5. **Tier subscription auto-expiry** background job
6. **Admin panel production mode** - build + systemd service
7. **Security hardening:**
   - Doi JWT secret key
   - Redis password
   - PostgreSQL restrict port
   - CORS restrict origins
8. **Monitoring:** Prometheus + Grafana
9. **Mobile app** (Flutter) - giai doan sau

### 11.3. Lenh hay dung

```bash
# Docker
docker compose up -d                        # Start all containers
docker compose down                         # Stop all containers
docker compose logs -f server               # Xem logs server
docker compose restart server               # Restart server
docker exec -it realsearch-server bash      # Shell vao server container
docker exec -it realsearch-db psql -U realsearch -d realsearch  # DB shell

# Alembic (trong Docker)
docker exec -it realsearch-server alembic upgrade head
docker exec -it realsearch-server alembic revision --autogenerate -m "mota"

# Services
sudo systemctl status realsearch-web
sudo systemctl restart realsearch-web
sudo systemctl status nginx
sudo systemctl reload nginx

# Logs
docker logs realsearch-server -f --tail 100
sudo journalctl -u realsearch-web -f
sudo tail -f /var/log/nginx/error.log

# SSL
sudo certbot renew --dry-run
sudo certbot certificates
```

---

> **Tai lieu nay duoc tao ngay 2026-03-09. Cap nhat lai khi co thay doi lon trong he thong.**
