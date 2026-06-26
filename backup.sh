#!/bin/bash
# ============================================
# RealSearch Full Backup Script
# Tạo file backup để di dời sang VPS mới
# ============================================

set -e

BACKUP_DIR="/root/realsearch-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="realsearch_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "============================================"
echo "  RealSearch Backup - ${TIMESTAMP}"
echo "============================================"

# Tạo thư mục backup
mkdir -p "${BACKUP_PATH}"

# 1. Backup PostgreSQL database
echo ""
echo "[1/6] Backup PostgreSQL database..."
docker exec realsearch-db pg_dump -U realsearch -d realsearch --no-owner --no-acl > "${BACKUP_PATH}/database.sql"
echo "  ✓ Database exported ($(du -h "${BACKUP_PATH}/database.sql" | cut -f1))"

# 2. Backup Redis data
echo ""
echo "[2/6] Backup Redis data..."
docker exec realsearch-redis redis-cli BGSAVE > /dev/null 2>&1
sleep 2
docker cp realsearch-redis:/data/dump.rdb "${BACKUP_PATH}/redis_dump.rdb" 2>/dev/null || echo "  ⚠ Redis dump không tồn tại (có thể trống)"
if [ -f "${BACKUP_PATH}/redis_dump.rdb" ]; then
    echo "  ✓ Redis data exported ($(du -h "${BACKUP_PATH}/redis_dump.rdb" | cut -f1))"
fi

# 3. Backup source code (exclude node_modules, .next, __pycache__, .git)
echo ""
echo "[3/6] Backup source code..."
tar czf "${BACKUP_PATH}/source_code.tar.gz" \
    -C /root \
    --exclude='RealSearch/admin/node_modules' \
    --exclude='RealSearch/admin/.next' \
    --exclude='RealSearch/web/node_modules' \
    --exclude='RealSearch/web/.next' \
    --exclude='RealSearch/server/__pycache__' \
    --exclude='RealSearch/client/__pycache__' \
    --exclude='RealSearch/.git' \
    --exclude='RealSearch/security-agent/__pycache__' \
    RealSearch/
echo "  ✓ Source code archived ($(du -h "${BACKUP_PATH}/source_code.tar.gz" | cut -f1))"

# 4. Backup Nginx config
echo ""
echo "[4/6] Backup Nginx config..."
mkdir -p "${BACKUP_PATH}/nginx"
cp /etc/nginx/sites-available/realsearch "${BACKUP_PATH}/nginx/realsearch" 2>/dev/null || echo "  ⚠ Nginx config không tìm thấy"
echo "  ✓ Nginx config saved"

# 5. Backup systemd service files
echo ""
echo "[5/6] Backup systemd services..."
mkdir -p "${BACKUP_PATH}/systemd"
for svc in realsearch-web realsearch-admin realsearch-security-agent; do
    if [ -f "/etc/systemd/system/${svc}.service" ]; then
        cp "/etc/systemd/system/${svc}.service" "${BACKUP_PATH}/systemd/"
        echo "  ✓ ${svc}.service"
    fi
done

# 6. Backup SSL certificates
echo ""
echo "[6/6] Backup SSL certificates..."
if [ -d "/etc/letsencrypt" ]; then
    tar czf "${BACKUP_PATH}/letsencrypt.tar.gz" -C /etc letsencrypt/
    echo "  ✓ SSL certs archived ($(du -h "${BACKUP_PATH}/letsencrypt.tar.gz" | cut -f1))"
else
    echo "  ⚠ Let's Encrypt directory không tồn tại"
fi

# Tạo file thông tin backup
cat > "${BACKUP_PATH}/backup_info.txt" <<EOF
RealSearch Backup Information
=============================
Date: $(date)
Hostname: $(hostname)
IP: $(curl -s ifconfig.me 2>/dev/null || echo "unknown")

Components:
- database.sql        : PostgreSQL full dump
- redis_dump.rdb      : Redis snapshot
- source_code.tar.gz  : Source code (without node_modules, .git)
- nginx/              : Nginx site config
- systemd/            : Systemd service files
- letsencrypt.tar.gz  : SSL certificates

Docker services:
$(cd /root/RealSearch && docker compose ps 2>/dev/null)

Restore: Sử dụng script restore.sh trên VPS mới
EOF

# Nén toàn bộ thành 1 file
echo ""
echo "Đang nén toàn bộ backup..."
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_PATH}"

FINAL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "============================================"
echo "  BACKUP HOÀN TẤT!"
echo "============================================"
echo ""
echo "  File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "  Size: ${FINAL_SIZE}"
echo ""
echo "  Để chuyển sang VPS mới, dùng scp:"
echo "  scp ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz root@<NEW_VPS_IP>:/root/"
echo ""
echo "  Hoặc upload lên cloud:"
echo "  rclone copy ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz remote:backup/"
echo ""
