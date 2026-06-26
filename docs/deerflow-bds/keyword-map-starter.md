# Keyword Map khởi động — dangtinbatdongsan.vn

> Bộ từ khóa long-tail để **đẩy RealSearch ngay** sau golive. Ưu tiên intent giao dịch +
> địa phương + độ khó thấp/TB (sàn mới dễ lên hạng). File CSV kèm theo: `keyword-map-starter.csv`
> (nạp thẳng vào job RealSearch). Cập nhật lại sau 2–4 tuần theo dữ liệu Search Console thật.

## Cơ sở thị trường 2026 (đã research)
- Căn hộ **HN/HCM**: lượng tìm kiếm tăng 30–36% sau Tết → cụm căn hộ là điểm nóng nhưng cạnh tranh cao.
- **Miền Trung** bùng nổ: Đà Nẵng +29%, Huế +21%, Khánh Hòa +15% → **độ khó thấp, cơ hội quick win**.
- **Bắc Ninh +17%, Hải Phòng +13%** (hạ tầng/KCN) → đất nền & nhà giá rẻ.
- **Vùng ven & TOD** (quanh metro, đường vành đai): xu hướng dòng tiền 2026.

## 6 cụm chủ đề (topic cluster)
| Cluster | Mô tả | Chiến lược |
|---|---|---|
| `can-ho-hcm` / `can-ho-hanoi` | Căn hộ 2 đô thị lớn | Volume cao, cạnh tranh — đánh long-tail theo quận + giá |
| `bds-mien-trung` | Đà Nẵng, Huế, Khánh Hòa | **Quick win** — ít cạnh tranh, thị trường tăng nóng |
| `dat-nen-khu-dong/-tay` | Nhơn Trạch, Long An, vùng ven | Intent đầu tư, độ khó thấp |
| `phap-ly` / `cam-nang` / `tai-chinh` | Sổ đỏ, quy hoạch, vay vốn | **Evergreen** xây authority + capture lead sớm |
| `mat-bang` / `kho-xuong` | BĐS thương mại | Niche giá trị cao, ít đối thủ SEO |
| `thuong-hieu` | "đăng tin BĐS", "miễn phí" | Cạnh tranh trực tiếp đối thủ + kéo người bán |

## Cách dùng với RealSearch
Cột `realsearch_job` trong CSV đã phân sẵn:
- **`keyword_seo`** → tin/danh mục giao dịch: client search keyword → tìm domain mình → click. Đẩy thứ hạng.
- **`viewlink`** → bài viết thông tin/pillar: làm ấm trang, tăng tín hiệu hành vi.

Quy trình nạp:
1. Lọc CSV `priority >= 4` → đợt đẩy đầu tiên.
2. Mỗi dòng tạo 1 job: `keyword` + `target_url` (ghép domain + `target_url_type`).
3. Ưu tiên các dòng ghi chú **"quick win"** để có kết quả sớm, tạo đà.

## Ưu tiên triển khai (gợi ý)
- **Tuần 1–2 (quick win)**: cụm `phap-ly` (sổ đỏ/sổ hồng, quy hoạch) + `bds-mien-trung` + đất nền vùng ven. Độ khó thấp → lên hạng nhanh, có traffic sớm.
- **Tuần 3–4**: căn hộ HN/HCM long-tail theo quận + bài giá/cẩm nang.
- **Song song**: DeerFlow viết content cho từng `target_url` TRƯỚC khi đẩy RealSearch (có content thật mới giữ hạng).

## Cảnh báo
- `volume_est` / `difficulty_est` là **ước lượng định tính** (chưa dùng tool trả phí như Ahrefs/KeywordTool). Cần verify bằng Google Search Console + Keyword Planner thật.
- Đừng đẩy từ khóa khi `target_url` chưa có nội dung — Google vào thấy trang rỗng sẽ phản tác dụng.
- `target_url_type` là slug giả định; chỉnh theo cấu trúc URL thật của sàn.
