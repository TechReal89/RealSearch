# Content & SEO Playbook — dangtinbatdongsan.vn (golive)

> Mục tiêu: Dùng **DeerFlow** (sinh content) + **RealSearch** (kéo traffic/đẩy keyword)
> để đưa sàn đăng tin BĐS mới golive lên có organic traffic & thứ hạng trong 90 ngày.

## 1. Ba bộ skill DeerFlow đã chuẩn bị
| Skill | File | Dùng để |
|---|---|---|
| Mô tả tin đăng | `skills/listing-description.skill.md` | Sinh mô tả tin bán/thuê chuẩn SEO, nhiều biến thể, chống trùng lặp |
| Bài SEO | `skills/seo-article.skill.md` | Viết bài blog/chuyên đề kéo organic traffic |
| Nghiên cứu keyword & đối thủ | `skills/keyword-competitor-research.skill.md` | Lập keyword map + bàn giao keyword cho RealSearch |

Cách nạp vào DeerFlow: đưa file `.skill.md` vào thư mục skills của DeerFlow (hoặc đóng gói
`.skill`), agent sẽ tự load khi gặp task phù hợp.

## 2. Quy trình vận hành hàng tuần
1. **Đầu tuần — Research**: chạy skill nghiên cứu keyword → ra `keyword_map` + `content_backlog`.
2. **Sản xuất content**: skill bài SEO viết 2–3 bài pillar/con; skill mô tả tin xử lý batch tin mới.
3. **Đăng tải**: đẩy lên dangtinbatdongsan.vn (qua API đăng tin / CMS).
4. **Đẩy traffic & rank**: nạp `quick_wins` + URL vào RealSearch:
   - `viewlink` job → URL tin/bài mới (làm ấm trang).
   - `keyword_seo` job → keyword mục tiêu + target_url.
5. **Cuối tuần — Đo lường**: đối chiếu Google Search Console (impression, vị trí, click)
   với keyword đã đẩy; cập nhật keyword map.

## 3. Nguyên tắc SEO sống còn cho SÀN ĐĂNG TIN
- **Duplicate content là kẻ thù số 1**: mỗi tin phải có mô tả riêng (skill mô tả sinh biến thể).
- **SEO local**: tổ chức URL & nội dung theo `tỉnh/quận/phường/loại hình`.
- **Internal linking**: bài SEO trỏ về trang danh mục & tin cần lên top.
- **Index control**: chặn index trang lọc/trùng (`?sort=`, phân trang vô hạn) bằng canonical/robots.
- **Tốc độ & mobile**: sàn BĐS chủ yếu traffic mobile — Core Web Vitals phải xanh.
- **Schema**: RealEstateListing / Product cho tin, Article + FAQ cho bài viết.

## 4. Phối hợp DeerFlow ↔ RealSearch (điểm nối kỹ thuật)
- Output JSON của skill nghiên cứu (`quick_wins`, `keyword_map`) → script cầu nối gọi
  `POST /jobs` của RealSearch để tạo job `keyword_seo`/`viewlink` tự động.
- Mỗi job gắn `target_url` = URL tin/bài DeerFlow vừa tạo & sàn vừa publish.
- (Script cầu nối sẽ làm ở phase tự động hóa — xem integration-plan.)

## 5. KPI 30 / 60 / 90 ngày
| Mốc | Mục tiêu định hướng |
|---|---|
| 30 ngày | Index sạch, 15–20 bài SEO, 100+ tin có mô tả unique, vài long-tail vào top 50 |
| 60 ngày | Nhiều long-tail vào top 10–20, organic traffic bắt đầu tăng |
| 90 ngày | Một số keyword giao dịch vào top 10, có lead organic đều |

## 6. Cảnh báo
- RealSearch đẩy traffic/rank là **hỗ trợ**; nền tảng vẫn phải có **content thật + UX tốt**,
  nếu không Google sẽ không giữ thứ hạng lâu dài.
- Không lạm dụng từ khóa, không nội dung rác — sàn mới dễ bị đánh giá thấp (sandbox effect).
