#!/bin/bash
# ============================================
# RealSearch Full Restore Script
# Khôi phục hệ thống từ file backup lên VPS mới
# ============================================

set -e

# Kiểm tra argument
if [ -z "$1" ]; then
    echo "Usage: bash restore.sh <backup_file.tar.gz>"
    echo "Example: bash restore.sh /root/realsearch_backup_20260313_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File ${BACKUP_FILE} không tồn tại!"
    exit 1
fi

echo "============================================"
echo "  RealSearch Restore"
echo "============================================"
echo ""
echo "  Backup file: ${BACKUP_FILE}"
echo ""
read -p "Bạn có muốn tiếp tục khôi phục? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Đã hủy."
    exit 0
fi

# Giải nén backup
echo ""
echo "[0/8] Giải nén backup..."
TEMP_DIR=$(mktemp -d)
tar xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"
BACKUP_DIR=$(ls "${TEMP_DIR}" | head -1)
RESTORE_PATH="${TEMP_DIR}/${BACKUP_DIR}"
echo "  ✓ Giải nén xong"

# 1. Cài đặt dependencies
echo ""
echo "[1/8] Cài đặt system dependencies..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin nginx certbot python3-certbot-nginx curl git nodejs npm > /dev/null 2>&1 || true

# Đảm bảo Docker chạy
systemctl enable docker
systemctl start docker
echo "  ✓ Dependencies installed"

# 2. Restore source code
echo ""
echo "[2/8] Restore source code..."
if [ -d "/root/RealSearch" ]; then
    echo "  ⚠ /root/RealSearch đã tồn tại, tạo backup cũ..."
    mv /root/RealSearch "/root/RealSearch.old.$(date +%s)"
fi
tar xzf "${RESTORE_PATH}/source_code.tar.gz" -C /root/
echo "  ✓ Source code restored to /root/RealSearch/"

# 3. Cài node_modules cho admin và web
echo ""
echo "[3/8] Cài đặt node dependencies..."
cd /root/RealSearch/admin && npm install --production > /dev/null 2>&1 &
PID_ADMIN=$!
cd /root/RealSearch/web && npm install --production > /dev/null 2>&1 &
PID_WEB=$!
echo "  ⏳ Đang cài npm packages (background)..."
wait $PID_ADMIN && echo "  ✓ Admin npm install done"
wait $PID_WEB && echo "  ✓ Web npm install done"

# 4. Build Next.js apps
echo ""
echo "[4/8] Build Next.js applications..."
cd /root/RealSearch/admin && npx next build > /dev/null 2>&1 &
PID_BUILD_ADMIN=$!
cd /root/RealSearch/web && npx next build > /dev/null 2>&1 &
PID_BUILD_WEB=$!
echo "  ⏳ Đang build (background, có thể mất vài phút)..."
wait $PID_BUILD_ADMIN && echo "  ✓ Admin build done"
wait $PID_BUILD_WEB && echo "  ✓ Web build done"

# 5. Start Docker containers (DB, Redis, Server)
echo ""
echo "[5/8] Start Docker containers..."
cd /root/RealSearch
docker compose up -d
echo "  ⏳ Đợi containers khởi động..."
sleep 10

# Kiểm tra DB ready
for i in $(seq 1 30); do
    if docker exec realsearch-db pg_isready -U realsearch > /dev/null 2>&1; then
        echo "  ✓ PostgreSQL ready"
        break
    fi
    sleep 2
done

# 6. Restore PostgreSQL database
echo ""
echo "[6/8] Restore PostgreSQL database..."
if [ -f "${RESTORE_PATH}/database.sql" ]; then
    # Drop và tạo lại database
    docker exec realsearch-db psql -U realsearch -d postgres -c "DROP DATABASE IF EXISTS realsearch;" 2>/dev/null || true
    docker exec realsearch-db psql -U realsearch -d postgres -c "CREATE DATABASE realsearch;" 2>/dev/null || true
    docker cp "${RESTORE_PATH}/database.sql" realsearch-db:/tmp/database.sql
    docker exec realsearch-db psql -U realsearch -d realsearch -f /tmp/database.sql > /dev/null 2>&1
    docker exec realsearch-db rm /tmp/database.sql
    echo "  ✓ Database restored"
else
    echo "  ⚠ database.sql không tìm thấy, bỏ qua"
fi

# 7. Restore Redis data
echo ""
echo "[7/8] Restore Redis data..."
if [ -f "${RESTORE_PATH}/redis_dump.rdb" ]; then
    docker exec realsearch-redis redis-cli SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 2
    docker cp "${RESTORE_PATH}/redis_dump.rdb" realsearch-redis:/data/dump.rdb
    docker compose restart redis
    sleep 3
    echo "  ✓ Redis data restored"
else
    echo "  ⚠ Redis dump không tìm thấy, bỏ qua"
fi

# 8. Setup Nginx + Systemd + SSL
echo ""
echo "[8/8] Setup Nginx, Systemd, SSL..."

# Nginx config
if [ -f "${RESTORE_PATH}/nginx/realsearch" ]; then
    cp "${RESTORE_PATH}/nginx/realsearch" /etc/nginx/sites-available/realsearch

    # Cập nhật IP trong nginx config nếu cần
    NEW_IP=$(curl -s ifconfig.me 2>/dev/null)
    if [ -n "$NEW_IP" ]; then
        echo "  ℹ VPS mới IP: ${NEW_IP}"
        echo "  ℹ Nhớ trỏ DNS các domain về IP mới này!"
    fi

    ln -sf /etc/nginx/sites-available/realsearch /etc/nginx/sites-enabled/realsearch
    echo "  ✓ Nginx config restored"
fi

# Systemd services
if [ -d "${RESTORE_PATH}/systemd" ]; then
    cp "${RESTORE_PATH}/systemd/"*.service /etc/systemd/system/ 2>/dev/null || true

    # Cập nhật IP trong service files nếu VPS mới có IP khác
    if [ -n "$NEW_IP" ]; then
        sed -i "s/36.50.232.108/${NEW_IP}/g" /etc/systemd/system/realsearch-*.service 2>/dev/null || true
    fi

    systemctl daemon-reload
    systemctl enable realsearch-web realsearch-admin realsearch-security-agent 2>/dev/null || true
    systemctl start realsearch-web realsearch-admin realsearch-security-agent 2>/dev/null || true
    echo "  ✓ Systemd services restored & started"
fi

# SSL - restore certs hoặc tạo mới
if [ -f "${RESTORE_PATH}/letsencrypt.tar.gz" ]; then
    echo ""
    echo "  SSL certificates:"
    echo "  Option 1: Restore certs cũ (chỉ hoạt động nếu domain đã trỏ về VPS mới)"
    echo "  Option 2: Tạo cert mới bằng certbot"
    echo ""
    read -p "  Restore SSL certs cũ? (y/N): " ssl_confirm
    if [ "$ssl_confirm" = "y" ] || [ "$ssl_confirm" = "Y" ]; then
        tar xzf "${RESTORE_PATH}/letsencrypt.tar.gz" -C /etc/
        echo "  ✓ SSL certs restored"
    else
        echo "  ℹ Bỏ qua SSL. Sau khi trỏ DNS, chạy:"
        echo "    certbot --nginx -d realsearch.techreal.vn -d admin.realsearch.techreal.vn -d api.realsearch.techreal.vn"
    fi
fi

# Restart nginx
nginx -t > /dev/null 2>&1 && systemctl restart nginx
echo "  ✓ Nginx restarted"

# Cleanup
rm -rf "${TEMP_DIR}"

# Restart server container để áp dụng DB mới
docker compose -f /root/RealSearch/docker-compose.yml restart server

echo ""
echo "============================================"
echo "  RESTORE HOÀN TẤT!"
echo "============================================"
echo ""
echo "  Checklist sau khi restore:"
echo "  ──────────────────────────"
echo "  [ ] Trỏ DNS các domain về IP mới: ${NEW_IP:-<IP mới>}"
echo "      - realsearch.techreal.vn"
echo "      - admin.realsearch.techreal.vn"
echo "      - api.realsearch.techreal.vn"
echo "  [ ] Cập nhật NEXT_PUBLIC_API_URL nếu IP thay đổi"
echo "      - /etc/systemd/system/realsearch-web.service"
echo "      - /etc/systemd/system/realsearch-admin.service"
echo "  [ ] Tạo SSL cert mới nếu chưa restore:"
echo "      certbot --nginx -d realsearch.techreal.vn -d admin.realsearch.techreal.vn -d api.realsearch.techreal.vn"
echo "  [ ] Test các endpoints:"
echo "      curl http://localhost:8000/health"
echo "      curl http://localhost:3000"
echo "      curl http://localhost:3001"
echo ""
