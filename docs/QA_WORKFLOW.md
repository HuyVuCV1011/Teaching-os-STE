# QA Workflow - Teaching-os-STE

## Scope

This workflow keeps Codex/Antigravity focused on implementation, fast verification, and manual browser smoke checks. Playwright E2E creation/execution is reserved for a dedicated testing agent or CI workflow.

## Flow

```text
Phase 1 - Implement
  Codex/Antigravity inspects code, makes scoped edits, and preserves user work.

Phase 2 - Fast Verification
  Run TypeScript, unit tests, and production build when feasible.

Phase 3 - Manual Chrome Smoke
  Open the local app, exercise key public/learner/admin routes, inspect console/runtime issues, and capture local screenshots when needed.

Phase 4 - Dedicated E2E
  A testing agent or CI writes/runs Playwright coverage outside the Codex implementation pass.

Phase 5 - Consolidate
  Fix confirmed issues, rerun relevant checks, then commit/push only when the user requests it.
```

## Codex / Antigravity Duties

**Khi phát triển tính năng mới:**
- Triển khai tính năng theo spec/yêu cầu.
- Chạy local dev server `npm run dev` để kiểm tra trực quan UI cơ bản.
- Chạy kiểm tra tĩnh và build ứng dụng qua `npm run build` để xác nhận không lỗi biên dịch/type.
- **Bypass E2E/Playwright (theo AGENTS.md)**: Antigravity/Codex không viết hoặc chạy Playwright E2E trực tiếp. Việc thiết lập, bảo trì, và thực thi Playwright tests do agent/công cụ chuyên trách thực hiện.

**Kiểm thử đơn giản & nhanh chóng:**
1. Chạy `npx tsc --noEmit`.
2. Chạy `npm run test`.
3. Chạy `npm run build` khi khả thi.
4. Mở local dev server trong Chrome và kiểm tra thủ công các route liên quan.

**Khi nhận bug từ exploratory agent:**
- Sửa lỗi trong code logic.
- Xác nhận lỗi đã được khắc phục thông qua type check, unit tests, build, hoặc manual browser check phù hợp.
- Chuyển giao phần E2E test bổ sung cho agent chuyên trách.

## Dedicated Playwright / E2E Agent

Khi có agent kiểm thử chuyên trách, agent đó có thể dùng các script Playwright sẵn có:

- Config: `playwright.config.ts` (baseURL, reporters, retries)
- Test: `tests/e2e/*.spec.ts`
- Page Objects: `tests/e2e/pages/*.page.ts`
- Fixtures: `tests/e2e/fixtures/index.ts`

**Lệnh:**

| Command | Mô tả |
|---|---|
| `npm run test:e2e` | Headless (CI) |
| `npm run test:e2e:headed` | Mở Chrome thật, xem được UI |
| `npm run test:e2e:ui` | Playwright UI Mode (debug) |
| `npm run test:e2e:report` | Mở HTML report |

## Manual Chrome Smoke Checklist

1. Start `npm run dev`.
2. Open `http://localhost:3000`.
3. Check public home, project detail, learner login, learner dashboard, roadmap, lesson, assignment workspace, grades, admin dashboard, classes, library, knowledge hub, projects CMS, grading queue, and similarity audit.
4. Use a whitelisted learner test identity from Supabase for learner login. Do not commit private emails or credentials.
5. Use `BYPASS_ADMIN_AUTH=true` only in local development when testing admin routes.
6. Capture screenshots locally when needed, but do not commit screenshots or browser issue reports unless explicitly requested.
7. Review console errors and obvious network failures.

## Before Release / Deploy

1. Run dedicated E2E suite through testing agent or CI.
2. Run manual exploratory checks on staging or preview.
3. Consolidate confirmed bugs.
4. Run regression checks.
5. Deploy only when the user explicitly approves deployment.

## Prompt cho Antigravity — Review QA_WORKFLOW.md

```markdown
Đọc file docs/QA_WORKFLOW.md trong dự án.
Đây là QA workflow tôi muốn áp dụng cho dự án này.
Hãy review và cho tôi biết:

1. Flow này có khả thi với dự án hiện tại không?
2. Có bước nào thiếu hoặc thừa không?
3. Có xung đột với AGENTS.md hiện tại không?
4. Cần điều chỉnh gì để phù hợp với stack (Next.js, Supabase, ...)?
5. Có thể tối ưu gì không?

Sau đó đề xuất chỉnh sửa cụ thể nếu cần.
```

## Khi mở conversation mới

Khi user yêu cầu "chạy QA workflow" hoặc "chạy testing flow", hãy:

1. Đọc `docs/QA_WORKFLOW.md` để nắm luồng
2. Xác định user đang ở phase nào (dev/exploratory/fix)
3. Thực hiện đúng vai trò và nhiệm vụ của từng thành phần như mô tả ở trên
4. Sau mỗi phase, báo cáo kết quả và đề xuất bước tiếp theo
