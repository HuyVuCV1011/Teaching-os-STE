# QA Workflow — Teaching-os-STE

## Mô tả

Luồng QA 3 lớp dành cho dự án Teaching-os-STE. Tích hợp Playwright (test chính), DeepSeek/OpenHands (exploratory agent), và Antigravity (code agent).

---

## Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                    PHASE 1: DEV                      │
│  Antigravity (code agent) ──── feature code          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│              PHASE 2: E2E TEST (Playwright)           │
│  headed: mở Chrome thật, chạy test, click thật        │
│  assertions, trace, screenshot khi fail                │
│  Lệnh: npm run test:e2e:headed                        │
└──────────────────────┬──────────────────────────────┘
                       ↓ (pass)
┌─────────────────────────────────────────────────────┐
│          PHASE 3: EXPLORATORY (DeepSeek/OpenHands)    │
│  Agent đọc spec, mở browser, click, điền form,        │
│  tìm edge case, đề xuất test mới                      │
└──────────────────────┬──────────────────────────────┘
                       ↓ (bug found)
┌─────────────────────────────────────────────────────┐
│          PHASE 4: CONSOLIDATION                       │
│  Fix bug → viết Playwright test cho case mới          │
│  Chạy full regression                                 │
│  Lệnh: npm run test:e2e                               │
└─────────────────────────────────────────────────────┘
```

---

## Vai trò và nhiệm vụ

### 1. Antigravity — Code Agent

**Khi phát triển tính năng mới:**
- Triển khai tính năng theo spec/yêu cầu.
- Chạy local dev server `npm run dev` để kiểm tra trực quan UI cơ bản.
- Chạy kiểm tra tĩnh và build ứng dụng qua `npm run build` để xác nhận không lỗi biên dịch/type.
- **Bypass E2E/Playwright (Theo quy định của AGENTS.md)**: Antigravity không viết mã kiểm thử Playwright hoặc chạy kiểm thử E2E trực tiếp. Việc thiết lập, bảo trì, và thực thi các Playwright tests sẽ do một agent hoặc công cụ chuyên trách khác thực hiện.

**Kiểm thử đơn giản & nhanh chóng:**
1. Chạy các unit test gọn nhẹ nếu có (ví dụ: `pytest` cho Python backend).
2. Thực hiện biên dịch kiểm tra kiểu dữ liệu (`npm run build`).
3. Xác minh thủ công bằng cách truy cập local dev server.

**Khi nhận bug từ exploratory agent:**
- Sửa lỗi trong code logic.
- Xác nhận lỗi đã được khắc phục thông qua unit tests hoặc kiểm tra build thành công.
- Chuyển giao phần E2E test bổ sung cho agent chuyên trách.

### 2. Playwright — E2E Testing Framework

**Cấu trúc:**
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

**Chrome thật (headed):**
- `npm run test:e2e:headed` → mở Chromium, click, điền form, chụp ảnh
- Nếu test fail: tự động chụp screenshot + trace (xem lại từng step)
- `--debug` flag: step-by-step, pause ở mỗi action

**CI (GitHub Actions):**
- File: `.github/workflows/e2e.yml`
- Chạy trên push/PR vào `main`
- Upload report artifact

### 3. DeepSeek/OpenHands — Exploratory Testing Agent

**Mục tiêu:** Khám phá bug mà Playwright test script không lường trước.

**Khi chạy:**
1. Chạy app ở local: `npm run dev` (hoặc dùng bản deploy preview)
2. Dùng browser tool (headed mode) để:
   - Click mọi link, button, tab
   - Điền form với dữ liệu lạ (empty, XSS, special chars, siêu dài)
   - Thử refresh giữa chừng, back/forward, double-click
   - Test responsive: 375px mobile và 1280px desktop
   - Test permission popup (nếu có)
3. Đọc console log, network request, error boundary

**Prompt mẫu (copy từ `tests/exploratory/prompts/exploratory-test.md`):**
- Đưa prompt này cho agent
- Kèm link/port app đang chạy
- Yêu cầu output: danh sách bug + đề xuất test + Playwright script

**Output mong đợi:**
```
## Bug Report
1. [severity: major] Mô tả bug
   - Steps: 1. ... 2. ... 3. ...
   - Expected: ...
   - Actual: ...
   - Screenshot: ...

## Test Ideas
- Test case A: ...
- Test case B: ...

## Suggested Playwright Tests
- File: tests/e2e/example.spec.ts (code)
```

---

## Luồng thực hiện chi tiết

### Mỗi khi làm feature mới (daily dev cycle)

```
Step 1 ─ Antigravity code feature
Step 2 ─ Antigravity tự chạy verification đơn giản: pytest (backend), npm run build (frontend)
Step 3 ─ Nếu có lỗi biên dịch hoặc unit test fail → Antigravity tự sửa code → quay lại Step 2
Step 4 ─ Sửa/Verify hoàn tất → Commit cục bộ (Lưu ý: Không tự ý push lên remote trừ khi được User yêu cầu)
Step 5 ─ [On-demand / Trước Release] Chạy QA/Testing Agent chuyên trách để viết và thực thi Playwright tests cho feature mới
Step 6 ─ Exploratory agent dò thêm bug trên Chrome thật
Step 7 ─ Consolidate bug fixes + regression test
```

> [!TIP]
> **Cơ chế vượt qua Gatekeeper/Auth khi chạy test:**
> - **Đối với Admin Route (`/admin/*`):** Chạy test với môi trường có `BYPASS_ADMIN_AUTH=true` để tự động bypass middleware.
> - **Đối với Learner Route (`/learn/[classCode]/*`):** Sử dụng fixture `authenticatedStudentPage(classCode)` trong file test để tự động tạo và inject JWT session cookie hợp lệ, bỏ qua bước nhập mã lớp thủ công.

### Khi exploratory agent phát hiện bug

```
Step 1 ─ Ghi nhận bug report vào issue / note
Step 2 ─ Antigravity sửa lỗi trong code logic
Step 3 ─ Antigravity verify đơn giản (pytest + build check)
Step 4 ─ QA/Testing Agent chuyên trách viết/cập nhật Playwright test tái hiện bug và chạy regression
Step 5 ─ Chạy full regression kiểm thử tự động E2E qua CI/CD hoặc chạy local bởi testing agent
Step 6 ─ Commit fix + test mới (tuân thủ quy tắc an toàn về commit/push)
```

### Trước mỗi release / deploy

```
Step 1 ─ Chạy full Playwright suite bởi Testing Agent / CI: npm run test:e2e
Step 2 ─ Chạy exploratory agent trên staging/preview (cung cấp sẵn mã lớp học hoặc tài khoản test)
Step 3 ─ Consolidate tất cả bug và phân công sửa/kiểm thử lại
Step 4 ─ Chạy regression lần cuối
Step 5 ─ Deploy (chỉ khi được User đồng ý)
```

---

## Prompt for Antigravity (để yêu cầu agent này làm việc theo flow)

```markdown
Chạy QA workflow cho [feature name]:

1. Code xong feature [mô tả ngắn]
2. Viết Playwright E2E test trong tests/e2e/ (Page Object + spec)
3. Chạy npm run test:e2e:headed để verify
4. Nếu có bug / test fail → fix
5. Dùng prompt exploratory-test.md cho DeepSeek/OpenHands nếu cần
6. Consolidate: chốt test vào regression suite
```

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

---

## Khi mở conversation mới

Khi user yêu cầu "chạy QA workflow" hoặc "chạy testing flow", hãy:

1. Đọc `docs/QA_WORKFLOW.md` để nắm luồng
2. Xác định user đang ở phase nào (dev/exploratory/fix)
3. Thực hiện đúng vai trò và nhiệm vụ của từng thành phần như mô tả ở trên
4. Sau mỗi phase, báo cáo kết quả và đề xuất bước tiếp theo
