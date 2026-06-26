# BE skeleton: seo.techreal.vn × DeerFlow

Khung FastAPI mẫu để backend SEO gọi DeerFlow (async job). Copy sang repo seo.techreal.vn
và phát triển tiếp.

## File
| File | Vai trò |
|---|---|
| `api.py` | FastAPI app: endpoint nhận yêu cầu content/research/report + tra cứu job |
| `worker.py` | Hàng đợi async + xử lý job, map "kind" → skill DeerFlow |
| `deerflow_client.py` | Client gọi DeerFlow Gateway (tạo run, poll kết quả) |
| `requirements.txt` / `.env.example` | Phụ thuộc + biến môi trường |

## Chạy thử
```bash
pip install -r requirements.txt
cp .env.example .env          # điền DEERFLOW_BASE_URL, DEERFLOW_TOKEN
uvicorn api:app --reload --port 8000
```

## Thử nhanh
```bash
# tạo job viết bài SEO
curl -X POST localhost:8000/seo/content -H 'Content-Type: application/json' \
  -d '{"kind":"content_article","primary_keyword":"mua bán nhà đất Quận 9","target_url":"/danh-muc/ban-nha-dat/quan-9"}'
# -> {"job_id":"...","status":"pending"}

# tra cứu kết quả
curl localhost:8000/seo/jobs/<job_id>
```

## Luồng
```
POST /seo/* → enqueue_job() → asyncio.Queue → worker_loop()
            → DeerFlowClient.run_and_wait(skill, payload)
            → lưu result vào JOBS (production: DB)
GET /seo/jobs/{id} → FE poll trạng thái + kết quả
```

## Cần làm trước khi production (skeleton CỐ TÌNH tối giản)
- [ ] Đối chiếu endpoint Gateway thật trong `deerflow_client.py` (CONSTANTS) với repo bytedance/deer-flow.
- [ ] Thay `JOBS` dict + `asyncio.Queue` bằng **PostgreSQL + Redis/arq** (bền khi restart, scale nhiều worker).
- [ ] Auth cho chính BE (JWT) + rate limit.
- [ ] Ghi `result` vào DB; với research/report → map `recommended_actions`/`keyword_map` sang **RealSearch `POST /jobs`**.
- [ ] Retry/backoff khi DeerFlow lỗi; alert khi job failed.
- [ ] Không bao giờ expose DeerFlow Gateway ra public (xem ARCHITECTURE.md §5).
```
