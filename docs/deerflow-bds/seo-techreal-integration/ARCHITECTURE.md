# Kiến trúc tích hợp DeerFlow vào seo.techreal.vn

> Mục tiêu: dùng DeerFlow làm "bộ não AI" cho phần mềm SEO (sinh content, research
> keyword/đối thủ, báo cáo), chạy trên **máy riêng sv2** cùng mạng với sv1 để không
> làm sv1 quá tải, và cô lập rủi ro bảo mật (DeerFlow có quyền chạy lệnh hệ thống).

## 1. Topology

```
                MẠNG PRIVATE (LAN nội bộ hoặc WireGuard VPN)
 ┌───────────────────────────┐         ┌──────────────────────────────────┐
 │ sv1: seo.techreal.vn      │         │ sv2: DeerFlow (máy riêng)         │
 │  • Frontend (UI)          │         │  • Gateway API  (bind PRIVATE IP) │
 │  • Backend FastAPI (BE)   │──HTTP──►│  • Sandbox / Sub-agents           │
 │  • Worker (async jobs)    │         │  • Skills (SEO skills)            │
 │  • PostgreSQL + Redis     │◄──HTTP──│  • Memory                         │
 │                           │ (DeerFlow gọi ngược API BE lấy keyword /   │
 │                           │  ghi content vào DB qua MCP/custom tool)   │
 └───────────────────────────┘         │  • LLM backend (Claude Code OAuth │
        public: 443 (web)              │     hoặc OpenAI-compatible API)    │
                                       └──────────────────────────────────┘
                                          KHÔNG mở cổng Gateway ra internet
```

## 2. Vì sao tách sv2 (không cài chung sv1)
- DeerFlow cần **~8GB RAM** + chạy sandbox/sub-agents tốn CPU → tách để sv1 (web + DB) không nghẽn.
- DeerFlow **có quyền chạy lệnh hệ thống** → cô lập sang máy riêng, nếu bị lạm dụng cũng không đụng tới web/DB production.
- Scale độc lập: sau này cần nhiều agent thì nâng riêng sv2.

## 3. Luồng dữ liệu (async job)
3 nhiệm vụ đều chạy lâu (phút→giờ) ⇒ BE **không gọi đồng bộ**, mà theo hàng đợi:

```
(1) Trigger: user bấm nút trên app / cron định kỳ
(2) BE tạo bản ghi job (status=pending) lưu DB, trả job_id ngay cho FE
(3) Worker lấy job → gọi DeerFlow Gateway: tạo "run" + chọn skill + input
(4) Poll/stream run cho tới khi xong
(5) DeerFlow trả JSON (đúng format skill) → Worker ghi kết quả vào DB
(6) (tuỳ chọn) Đẩy keyword/URL sang RealSearch /jobs để chạy traffic/rank
(7) FE poll job_id → hiển thị kết quả
```

## 4. Map nhiệm vụ → skill
| Nhiệm vụ | Skill | Output |
|---|---|---|
| Sinh content/bài SEO | `listing-description`, `seo-article` | JSON bài viết |
| Research keyword & đối thủ | `keyword-competitor-research` | `keyword_map` JSON |
| Báo cáo & phân tích | `seo-report` (mới) | report JSON/markdown |

(3 skill đầu nằm ở `../skills/`, skill báo cáo ở `skills/seo-report.skill.md`)

## 5. Checklist bảo mật mạng sv2 (BẮT BUỘC)
- [ ] Gateway DeerFlow **bind IP private** của sv2 (vd `10.10.0.2`), KHÔNG bind `0.0.0.0`, KHÔNG public.
- [ ] **Firewall (ufw/iptables)**: chỉ cho IP private của sv1 truy cập cổng Gateway; deny mọi nguồn khác.
- [ ] **Token auth**: đặt reverse proxy (nginx/caddy) có header token trước Gateway; BE gửi `Authorization: Bearer <token>`.
- [ ] Nếu sv1–sv2 **khác datacenter/nhà cung cấp** → dựng **WireGuard**, mọi traffic đi qua tunnel `wg0` (10.x.x.x), không hở public.
- [ ] DeerFlow **không** chạy bằng user root; chạy user riêng, hạn chế quyền.
- [ ] Log + rate-limit lời gọi từ BE để phát hiện bất thường.
- [ ] Secrets (LLM key, token) để trong `.env` / secret manager, KHÔNG commit.

## 6. Điểm nối với RealSearch (khép kín vòng SEO)
- DeerFlow sinh content cho `target_url` → seo.techreal.vn publish.
- BE gọi **RealSearch `POST /jobs`** tạo job `keyword_seo`/`viewlink` theo `keyword_map`.
- ⚠️ Luôn có content thật trên `target_url` TRƯỚC khi đẩy RealSearch.

## 7. Tài nguyên đề xuất sv2
| Mức | CPU | RAM | Disk |
|---|---|---|---|
| Tối thiểu | 4 vCPU | 8 GB | 40 GB SSD |
| Khuyến nghị | 8 vCPU | 16 GB | 60 GB SSD |
