---
name: bds-keyword-competitor-research
description: Nghiên cứu từ khóa và phân tích đối thủ ngành bất động sản để định vị dangtinbatdongsan.vn và lập danh sách keyword mục tiêu cho RealSearch. Dùng khi cần keyword map, phân tích batdongsan.com.vn / nhadat24h / các sàn khác, tìm cơ hội từ khóa ít cạnh tranh.
version: 1.0.0
author: RealSearch
---

# Skill: Nghiên cứu từ khóa & đối thủ BĐS

## Mục tiêu
Tạo **bản đồ từ khóa (keyword map)** và **phân tích đối thủ** để: (1) định hướng nội dung
cho DeerFlow viết, (2) chọn keyword mục tiêu nạp vào job `keyword_seo` của RealSearch.

## Input
- Lĩnh vực/khu vực ưu tiên (vd: BĐS TP.HCM khu Đông)
- Danh sách đối thủ (mặc định: batdongsan.com.vn, nhadat24h.net, mogi.vn, alonhadat.com.vn)
- Trang/dịch vụ của mình cần đẩy

## Quy trình
1. **Thu thập từ khóa hạt giống** theo nhóm intent:
   - Giao dịch: "bán nhà {quận}", "cho thuê căn hộ {quận}", "đất nền {khu vực}".
   - Thông tin: "giá đất {khu vực} 2026", "thủ tục sang tên sổ đỏ", "có nên mua...".
   - Thương hiệu/điều hướng: tên dự án, tên sàn.
2. **Mở rộng** bằng gợi ý tìm kiếm Google, "People also ask", tìm kiếm liên quan.
3. **Phân tích đối thủ** (mỗi đối thủ):
   - Cấu trúc danh mục & cách họ tổ chức theo khu vực/loại hình.
   - Loại trang nào của họ lên top (danh mục? tin? bài blog?).
   - Khoảng trống nội dung họ chưa phủ tốt (cơ hội cho mình).
4. **Chấm điểm cơ hội** mỗi từ khóa:
   - Độ liên quan (1–5), volume ước lượng (cao/TB/thấp), độ khó (cao/TB/thấp).
   - Ưu tiên **long-tail ít cạnh tranh + intent giao dịch** cho sàn mới.
5. **Gom cụm chủ đề (topic cluster)**: nhóm keyword → pillar + bài con.

## Output (JSON)
```json
{
  "positioning_summary": "định vị đề xuất cho dangtinbatdongsan.vn",
  "competitor_analysis": [
    {"site": "batdongsan.com.vn", "strengths": ["…"], "gaps": ["…"]}
  ],
  "keyword_map": [
    {
      "keyword": "đất nền Nhơn Trạch giá rẻ",
      "intent": "giao dịch",
      "volume_est": "TB",
      "difficulty_est": "thấp",
      "priority": 5,
      "target_url_type": "danh mục/đất nền/nhơn-trạch",
      "cluster": "đất nền khu Đông"
    }
  ],
  "quick_wins": ["keyword nên đẩy ngay bằng RealSearch"],
  "content_backlog": ["tiêu đề bài viết nên sản xuất"]
}
```

## Bàn giao cho RealSearch
Trường `quick_wins` + `keyword_map` (priority ≥ 4, difficulty thấp/TB) là danh sách
nạp thẳng vào job `keyword_seo` của RealSearch (mỗi keyword kèm target_url tương ứng).

## Best practices
- Sàn mới: **đừng đánh keyword "BĐS" volume khổng lồ** — chọn long-tail địa phương để có thứ hạng nhanh.
- Volume/difficulty là ước lượng định tính khi chưa có tool trả phí; ghi rõ "ước lượng".
- Cập nhật keyword map mỗi tháng theo dữ liệu Search Console thực tế.
