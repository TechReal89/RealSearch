---
name: bds-listing-description
description: Sinh mô tả tin đăng bất động sản chuẩn SEO cho dangtinbatdongsan.vn từ thông số thô. Dùng khi cần viết/viết lại mô tả tin bán/cho thuê nhà đất, căn hộ, đất nền, mặt bằng. Tạo nhiều biến thể không trùng lặp.
version: 1.0.0
author: RealSearch
---

# Skill: Sinh mô tả tin đăng BĐS chuẩn SEO

## Mục tiêu
Biến thông số thô của một bất động sản thành mô tả tin đăng hấp dẫn, đúng chuẩn SEO,
tự nhiên (không spam keyword), và **không trùng lặp** giữa các tin — vì sàn đăng tin bị
Google phạt nếu hàng loạt tin có mô tả giống nhau (duplicate content).

## Input cần có (nếu thiếu, hỏi lại user)
- Loại hình: bán / cho thuê
- Loại BĐS: căn hộ / nhà phố / biệt thự / đất nền / mặt bằng / kho xưởng
- Vị trí: tỉnh/thành, quận/huyện, phường/xã, đường (càng chi tiết càng tốt)
- Diện tích (m²), số phòng ngủ/WC (nếu có)
- Giá (và đơn vị: tỷ / triệu/tháng)
- Pháp lý: sổ đỏ / sổ hồng / HĐMB / vi bằng
- Tiện ích nổi bật, hướng nhà, tình trạng nội thất
- Thông tin liên hệ (nếu được phép hiển thị)

## Quy trình (workflow)
1. **Chuẩn hóa dữ liệu**: điền các trường thiếu bằng "đang cập nhật", không bịa số liệu.
2. **Xác định từ khóa chính**: dạng `{loại hình} {loại BĐS} {khu vực}`
   (vd: "bán căn hộ Quận 7", "cho thuê nhà phố Thủ Đức").
3. **Viết theo cấu trúc 5 khối**:
   - **Tiêu đề** (60–70 ký tự): chứa từ khóa chính + điểm nhấn (giá tốt / vị trí / pháp lý).
   - **Mở đầu** (2–3 câu): mô tả tổng quan + giá trị nổi bật nhất.
   - **Thông số** (bullet list): diện tích, phòng, hướng, pháp lý, giá.
   - **Tiện ích & vị trí**: gần trường, chợ, metro, trục đường chính (giúp SEO local).
   - **Kêu gọi hành động (CTA)**: "Liên hệ xem nhà", "Thương lượng giá".
4. **Tối ưu SEO on-page**:
   - Từ khóa chính xuất hiện ở tiêu đề + câu đầu + 1 lần trong thân (mật độ ~1–2%).
   - Thêm 2–3 từ khóa phụ (LSI): "giá rẻ", "sổ hồng riêng", "vào ở ngay"...
   - Độ dài 150–300 từ. Không nhồi nhét.
5. **Sinh biến thể**: tạo `N` phiên bản (mặc định 3) khác nhau về câu chữ & thứ tự
   khối để tránh duplicate content khi đăng nhiều tin cùng dự án.

## Đầu ra (output format)
Trả về JSON để hệ thống đăng tin tự parse:
```json
{
  "title": "…",
  "slug": "ban-can-ho-quan-7-2pn-gia-tot",
  "meta_description": "≤155 ký tự, chứa từ khóa chính",
  "body_markdown": "nội dung mô tả đầy đủ",
  "primary_keyword": "bán căn hộ Quận 7",
  "secondary_keywords": ["…"],
  "variants": ["biến thể 2", "biến thể 3"]
}
```

## Best practices / Ràng buộc
- TUYỆT ĐỐI không bịa pháp lý, giá, diện tích. Thiếu thì ghi "liên hệ" / "đang cập nhật".
- Không dùng từ cấm/quá đà ("rẻ nhất thị trường", "cam kết sinh lời X%") — rủi ro pháp lý.
- Giọng văn: chuyên nghiệp, đáng tin, đúng văn phong môi giới VN.
- Mỗi tin = từ khóa local riêng (theo phường/đường) để không tự cạnh tranh nội bộ (keyword cannibalization).
