# Exploratory Test Prompt cho DeepSeek / OpenHands

Ngữ cảnh: Đây là website Teaching-os-STE, một nền tảng giáo dục xây dựng bằng Next.js.

## Yêu cầu

Mở trình duyệt ở chế độ headed (có GUI), truy cập `http://localhost:3000`, và thực hiện:

1. **Luồng chính**: Điều hướng tất cả trang/public, click vào mọi link, button.
2. **Form/Input**: Thử submit form với dữ liệu hợp lệ và không hợp lệ (empty, special chars, XSS).
3. **Responsive**: Test ở kích thước mobile (375px) và desktop (1280px).
4. **Edge cases**: Refresh giữa chừng, back/forward browser, double-click nhanh.
5. **Permissions**: Nếu có popup/confirm, thử cả accept và cancel.

## Output yêu cầu

- Danh sách bug tìm được (kèm steps to reproduce)
- Test ideas mới chưa có trong test suite
- Playwright test script đề xuất cho từng flow quan trọng
- Mức độ nghiêm trọng: blocker / major / minor / cosmetic

## Lưu ý

- Dùng `page`, `expect` API của Playwright, không dùng any/DOM thuần
- Ưu tiên web-first assertions (`toBeVisible`, `toHaveText`)
- Nếu tìm thấy bug, chụp screenshot kèm console log
