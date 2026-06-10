# Prompt: Sinh Playwright Test Từ Spec

Ngữ cảnh: Dự án Teaching-os-STE (Next.js).

## Yêu cầu

Đọc file spec/codebase dưới đây, sau đó sinh Playwright test scripts cho các luồng:

{PRD_OR_SPEC_HERE}

## Quy tắc sinh test

1. Mỗi file `.spec.ts` tương ứng một feature/page
2. Dùng Page Object Model pattern (định nghĩa trong `tests/e2e/pages/`)
3. Dùng web-first assertions (`toBeVisible`, `toHaveText`, `toHaveValue`)
4. Test cả happy path và error/edge cases
5. KHÔNG dùng `page.waitForTimeout` — dùng auto-waiting API
6. Mỗi test độc lập, không phụ thuộc test khác

## Output

- File test `.spec.ts` hoàn chỉnh
- File Page Object nếu cần tạo mới
- Mô tả ngắn: flow nào được test, flow nào bỏ qua và lý do
