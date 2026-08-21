---
name: bds-seo-article
description: Viết bài SEO bất động sản theo từ khóa mục tiêu cho blog/trang chuyên đề của dangtinbatdongsan.vn nhằm kéo organic traffic. Dùng khi cần bài "mua bán nhà đất khu vực X", "giá đất 2026", cẩm nang pháp lý, review dự án.
version: 1.0.0
author: RealSearch
---

# Skill: Viết bài SEO Bất động sản

## Mục tiêu
Sản xuất bài viết chuẩn SEO để sàn mới golive xây **topical authority** và kéo organic
traffic dài hạn — bổ trợ cho việc đẩy thứ hạng bằng RealSearch (keyword_seo job).

## Input
- Từ khóa chính (vd: "mua bán nhà đất Quận 9")
- Search intent: thông tin / giao dịch / điều hướng
- Khu vực mục tiêu (cho SEO local)
- Internal link mục tiêu: các URL tin đăng/danh mục cần trỏ về

## Quy trình
1. **Phân tích intent**: bài thông tin (cẩm nang, pháp lý, giá) hay giao dịch (gom tin bán/thuê).
2. **Outline chuẩn SEO**:
   - H1 chứa từ khóa chính.
   - 4–7 H2 phủ các câu hỏi liên quan (lấy từ "People also ask" / gợi ý tìm kiếm).
   - Mỗi H2 có thể có H3 chi tiết.
3. **Viết nội dung**:
   - Mở bài: trả lời ngay ý định tìm kiếm trong 2–3 câu đầu (tối ưu featured snippet).
   - Thân bài: 800–1500 từ, dữ kiện cụ thể (giá tham khảo, khu vực, pháp lý).
   - Bảng so sánh giá/khu vực nếu phù hợp (dễ lên snippet).
   - FAQ 3–5 câu cuối bài (schema FAQ).
4. **SEO on-page**:
   - Từ khóa chính: H1 + 100 từ đầu + 1 H2 + meta description.
   - Từ khóa phụ & semantic: rải tự nhiên.
   - **Internal link**: chèn 2–4 link về danh mục/tin đăng liên quan trên sàn (rất quan trọng để truyền link juice cho trang cần lên top).
   - Đề xuất 1 ảnh + alt text chứa từ khóa.
5. **Schema gợi ý**: Article + FAQPage (+ BreadcrumbList).

## Output (JSON)
```json
{
  "h1": "…",
  "slug": "…",
  "meta_title": "≤60 ký tự",
  "meta_description": "≤155 ký tự",
  "outline": ["H2…", "H2…"],
  "body_markdown": "…",
  "internal_links": [{"anchor": "…", "url": "…"}],
  "faq": [{"q": "…", "a": "…"}],
  "image_alt_suggestions": ["…"],
  "target_keyword": "…",
  "secondary_keywords": ["…"]
}
```

## Best practices
- Ưu tiên **E-E-A-T**: dẫn nguồn số liệu (báo chí, cơ quan nhà nước), tránh cảm tính.
- Không sao chép đối thủ — tham khảo cấu trúc, viết nội dung gốc.
- Mỗi cụm chủ đề (topic cluster) có 1 trang trụ (pillar) + nhiều bài con trỏ về.
- Anchor text internal link đa dạng, tự nhiên, không nhồi từ khóa y hệt.
