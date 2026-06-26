# Hướng dẫn cài đặt RealSearch trên VPS mới

## Yêu cầu VPS
- OS: Ubuntu 22.04+
- RAM: tối thiểu 4GB (chạy chung với HRMS)
- Disk: 20GB+

## Phần mềm cần thiết

| Phần mềm | Version |
|-----------|---------|
| Docker | 29+ |
| Docker Compose | v5+ |
| Node.js | 22.x |
| Nginx | 1.24+ |
| Certbot | latest |

## Bước 1: Cài phần mềm

```bash
apt update && apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx
```

## Bước 2: Upload code

Dùng WinSCP hoặc rsync upload thư mục `RealSearch/` lên `/root/RealSearch/`

## Bước 3: Khởi động Docker (API + DB + Redis)

```bash
cd /root/RealSearch
docker compose up -d --build
```

Chờ DB healthy (~10s), kiểm tra:
```bash
docker ps
# realsearch-db phải hiện (healthy)
```

## Bước 4: Restore Database

```bash
docker exec -i realsearch-db psql -U realsearch realsearch < backup_realsearch_db.sql
```

## Bước 5: Build và chạy Web (User website - port 3001)

```bash
cd /root/RealSearch/web
npm install
npm run build

# Tạo systemd service
cp /root/RealSearch/realsearch-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now realsearch-web
```

## Bước 6: Build và chạy Admin (port 3000)

```bash
cd /root/RealSearch/admin
npm install
npm run build
npm start
# Hoặc tạo systemd service tương tự web
```

## Bước 7: Cấu hình Nginx

```bash
cp /root/RealSearch/nginx_realsearch.conf /etc/nginx/sites-available/realsearch
cp /root/RealSearch/nginx_seotoolsx.conf /etc/nginx/sites-available/seotoolsx

ln -s /etc/nginx/sites-available/realsearch /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/seotoolsx /etc/nginx/sites-enabled/

# Tạm comment các block SSL trong nginx config (vì chưa có cert)
# Sau đó test và restart
nginx -t && systemctl restart nginx
```

## Bước 8: Trỏ DNS về IP mới

Cập nhật A record tại nhà cung cấp domain:

| Domain | Trỏ về |
|--------|--------|
| `seo.toolsx.vn` | IP_VPS_MỚI |
| `admin.seo.toolsx.vn` | IP_VPS_MỚI |
| `api.seo.toolsx.vn` | IP_VPS_MỚI |
| `realsearch.techreal.vn` | IP_VPS_MỚI |
| `admin.realsearch.techreal.vn` | IP_VPS_MỚI |
| `api.realsearch.techreal.vn` | IP_VPS_MỚI |

## Bước 9: Cài SSL (sau khi DNS đã trỏ)

```bash
certbot --nginx -d seo.toolsx.vn -d admin.seo.toolsx.vn -d api.seo.toolsx.vn
certbot --nginx -d realsearch.techreal.vn -d admin.realsearch.techreal.vn -d api.realsearch.techreal.vn
```

## Bước 10: Cập nhật URL (nếu đổi domain)

Nếu giữ nguyên domain thì KHÔNG cần sửa. Nếu đổi domain, sửa các file:

- `/root/RealSearch/.env` → DATABASE_URL, REDIS_URL (thường không đổi)
- `/root/RealSearch/web/.env.production` → `NEXT_PUBLIC_API_URL`
- `/root/RealSearch/admin/.env.production` → `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

## Kiểm tra sau khi xong

```bash
docker ps                                    # 3 container running
systemctl status realsearch-web              # active (running)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs   # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001        # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000        # 200
```

## Ports sử dụng

| Service | Port |
|---------|------|
| API (FastAPI) | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Web (User) | 3001 |
| Admin | 3000 |

## File cấu hình quan trọng

| File | Mô tả |
|------|-------|
| `.env` | Database, Redis, JWT credentials |
| `web/.env.production` | API URL cho user website |
| `admin/.env.production` | API URL + WebSocket URL cho admin |
| `docker-compose.yml` | Docker services config |
| `nginx_realsearch.conf` | Nginx config domain techreal.vn |
| `nginx_seotoolsx.conf` | Nginx config domain toolsx.vn |
| `realsearch-web.service` | Systemd service cho web |
| `backup_realsearch_db.sql` | Database backup |
| `backup.sh` | Script backup tự động |
| `restore.sh` | Script restore |
