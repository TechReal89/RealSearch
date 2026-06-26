---
name: seo-report
description: Tổng hợp dữ liệu SEO (thứ hạng, traffic, index, backlink) thành báo cáo định kỳ dễ đọc cho seo.techreal.vn. Dùng khi cần report tuần/tháng cho một website/khách hàng, hoặc phân tích biến động thứ hạng và đề xuất hành động.
version: 1.0.0
author: RealSearch
---

# Skill: Báo cáo & phân tích SEO định kỳ

## Mục tiêu
Biến số liệu thô (rank theo keyword, traffic, số trang index, backlink) thành **báo cáo
có insight + đề xuất hành động**, không chỉ liệt kê số.

## Input (BE truyền vào)
- Kỳ báo cáo: tuần / tháng + mốc thời gian.
- Website/khách hàng + danh sách keyword theo dõi.
- Dữ liệu: vị trí rank hiện tại & kỳ trước, traffic (organic), trang index, backlink mới/mất.
  (Lấy từ Google Search Console API, hoặc DB của seo.techreal.vn.)

## Quy trình
1. **So sánh kỳ này vs kỳ trước**: tính delta cho từng keyword & tổng traffic.
2. **Phân loại keyword**: tăng hạng / tụt hạng / mới vào top / rớt khỏi top / đứng yên.
3. **Tìm nguyên nhân định tính**: keyword tụt → kiểm tra content/đối thủ; trang rớt index → cảnh báo.
4. **Đề xuất hành động** ưu tiên theo tác động:
   - Keyword sắp lên top 10 (vị trí 11–20) → đẩy mạnh (content + RealSearch).
   - Trang mất index → kiểm tra robots/canonical/lỗi.
   - Cơ hội keyword mới từ Search Console (impression cao, CTR thấp).
5. **Tóm tắt điều hành (executive summary)** 3–5 dòng cho người không rành kỹ thuật.

## Output (JSON)
```json
{
  "period": "2026-W26",
  "website": "example.com",
  "executive_summary": "3-5 câu tổng quan + xu hướng",
  "kpis": {
    "organic_traffic": {"value": 0, "delta_pct": 0},
    "keywords_top10": {"value": 0, "delta": 0},
    "indexed_pages": {"value": 0, "delta": 0}
  },
  "keyword_movements": [
    {"keyword": "…", "pos_now": 8, "pos_prev": 14, "change": "+6", "status": "tăng"}
  ],
  "alerts": ["trang X mất index", "keyword Y tụt khỏi top 20"],
  "recommended_actions": [
    {"action": "đẩy keyword Z (vị trí 12) bằng RealSearch + cập nhật content", "priority": 5}
  ],
  "report_markdown": "bản đầy đủ để render/gửi khách"
}
```

## Best practices
- Luôn kèm **delta** (so kỳ trước), không chỉ số tuyệt đối — báo cáo SEO giá trị ở xu hướng.
- Đề xuất hành động phải **cụ thể, làm được**, gắn với keyword/trang thật.
- Phân biệt rõ **dữ liệu thật** (từ Search Console) vs **ước lượng** — ghi nguồn.
- `recommended_actions` priority cao → có thể tự động tạo job RealSearch (khép kín vòng).

## Tự động hoá
Trường `recommended_actions` (priority ≥ 4, dạng "đẩy keyword") → BE map sang
`POST /jobs` của RealSearch để tự lên lịch đẩy rank cho kỳ sau.
