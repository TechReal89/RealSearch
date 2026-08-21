# Cài đặt DeerFlow trên sv2 (máy riêng cùng mạng sv1)

> Mục tiêu: dựng DeerFlow như service nội bộ, chỉ sv1 gọi được, không hở internet.
> Tham khảo chính thức: https://github.com/bytedance/deer-flow

## 0. Yêu cầu
- Ubuntu 22.04 LTS, 4+ vCPU, **8GB+ RAM**, 40GB SSD.
- Docker + Docker Compose.
- IP private giữa sv1 ↔ sv2 (cùng LAN, hoặc WireGuard nếu khác datacenter).

## 1. Chuẩn bị máy
```bash
# user riêng, không dùng root cho DeerFlow
sudo adduser --disabled-password --gecos "" deerflow
sudo usermod -aG docker deerflow
sudo su - deerflow
```

## 2. Clone & cấu hình
```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
make setup          # wizard: chon LLM provider + web search + safety -> sinh config.yaml & .env
make doctor         # kiem tra cau hinh, goi y fix neu thieu
```
Trong wizard:
- **Model provider**: Anthropic Claude qua CLI (Claude Code OAuth), hoặc OpenAI-compatible (Doubao/DeepSeek/Kimi/OpenRouter/vLLM...).
- API key ghi vào `.env` (vd `OPENAI_API_KEY`, `TAVILY_API_KEY` cho web search).
- **QUAN TRỌNG**: Gateway mặc định bind `localhost:2026`. **GIỮ NGUYÊN loopback** — KHÔNG đổi sang `0.0.0.0`. Việc cho sv1 truy cập sẽ qua nginx (mục 6), không expose Gateway trực tiếp.

## 3. Khởi chạy
```bash
make docker-init    # lần đầu: kéo image sandbox
make docker-start   # dev (hot reload)   —— hoặc:  make up  (production), dừng: make down
```
Truy cập thử ngay trên sv2: `http://localhost:2026`. Kiểm tra Gateway CHỈ nghe loopback:
```bash
ss -tlnp | grep 2026      # phải là 127.0.0.1:2026, KHÔNG phải 0.0.0.0:2026
```

## 4. Nạp skills SEO
```bash
# copy 3 skill content/SEO + skill báo cáo vào thư mục skills của DeerFlow
cp listing-description.skill.md seo-article.skill.md \
   keyword-competitor-research.skill.md seo-report.skill.md \
   <DEERFLOW_SKILLS_DIR>/
```
(Đường dẫn thư mục skills xem trong cấu hình DeerFlow — thường là `skills/` hoặc đóng gói `.skill`.)

## 5. Khóa mạng (BẮT BUỘC)
```bash
# Gateway giữ ở loopback 127.0.0.1:2026. Chỉ mở cổng nginx (8443) cho IP sv1.
sudo ufw default deny incoming
sudo ufw allow from 10.10.0.1 to any port 8443 proto tcp   # sv1 -> nginx proxy
sudo ufw allow 22/tcp          # ssh (siết theo IP admin nếu được)
sudo ufw enable
```

### (Tuỳ chọn) WireGuard nếu sv1–sv2 khác datacenter
```bash
sudo apt install -y wireguard
# tạo khóa, cấu hình /etc/wireguard/wg0.conf cho cả 2 máy (10.10.0.1 <-> 10.10.0.2)
sudo wg-quick up wg0
# sau đó Gateway bind 10.10.0.2 (địa chỉ wg0), firewall allow from 10.10.0.1
```

## 6. Token auth trước Gateway (nginx)
```nginx
# /etc/nginx/conf.d/deerflow.conf  (chạy trên sv2)
server {
    listen 10.10.0.2:8443;
    location / {
        if ($http_authorization != "Bearer ĐẶT_TOKEN_DÀI_NGẪU_NHIÊN") { return 401; }
        proxy_pass http://127.0.0.1:2026;   # Gateway thật chạy loopback, nginx mới expose private
        proxy_http_version 1.1;
        proxy_set_header Connection "";      # giữ stream/SSE
        proxy_read_timeout 3600s;            # task chạy lâu
    }
}
```
→ BE gọi `http://10.10.0.2:8443` kèm header `Authorization: Bearer <token>`.

## 7. Verify từ sv1
```bash
# chạy trên sv1, phải gọi được:
curl -H "Authorization: Bearer <token>" http://10.10.0.2:8443/health
# chạy từ máy ngoài mạng private: phải BỊ TỪ CHỐI (timeout/connection refused)
```

## 8. Vận hành
- Tự khởi động lại: dùng `make up` (compose `restart: always`) hoặc systemd.
- Theo dõi RAM/CPU; nếu sandbox tốn nhiều, giới hạn concurrency sub-agents trong cấu hình.
- Backup thư mục Memory để giữ ngữ cảnh học được.
