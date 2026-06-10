# Prompt: Review Playwright Test Suite

Ngữ cảnh: Teaching-os-STE test suite tại `tests/e2e/`.

## Yêu cầu

1. Đọc tất cả file `.spec.ts` trong `tests/e2e/`
2. Đọc config `playwright.config.ts`
3. So sánh với các page/component chính trong `src/`

## Phân tích

- Test coverage hiện tại: page nào được test, page nào chưa?
- Thiếu test cho component nào?
- Test hiện tại có thực sự kiểm tra đúng business logic không?
- Có flaky test tiềm năng không? (dùng `page.waitForTimeout`, thiếu auto-wait...)
- Có thể tối ưu Page Object hoặc fixture không?

## Output

- Danh sách gap và đề xuất cải thiện
- Mức độ ưu tiên: P0 (cần ngay) / P1 (quan trọng) / P2 (nice to have)
