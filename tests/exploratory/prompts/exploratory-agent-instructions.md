# 🤖 Playwright E2E and Fuzz Testing Guide for DeepSeek / OpenHands

This document guides you (the AI testing agent) on how to execute, extend, and write tests for the **Teaching-os-STE** E2E testing framework built using **Playwright**.

---

## 📂 Testing Directory Structure

```
tests/
├── e2e/
│   ├── helpers/
│   │   ├── fuzz.ts             # Input generation (XSS, Special chars, Overflows, Random form data)
│   │   ├── console-tracker.ts  # Captures browser console.error, page errors, and 4xx/5xx requests
│   │   ├── responsive.ts       # Viewport definitions (mobile, tablet, desktop) and runner wrapper
│   │   └── mock-rubricore.ts   # Automatically starts mock server on port 8080 to simulate AI backend
│   ├── fixtures/
│   │   └── index.ts            # Extended fixtures: consoleTracker, fuzz, responsive, mockRubriCore
│   ├── pages/
│   │   ├── home.page.ts        # Page Object: Homepage (/)
│   │   ├── learn.page.ts       # Page Object: Learn Gateway (/learn)
│   │   ├── projects.page.ts    # Page Object: Projects & Showcase (/projects)
│   │   └── admin.page.ts       # Page Object: Admin Panel (/admin)
│   ├── navigation.spec.ts      # Verifies page link statuses & history navigation
│   ├── console-errors.spec.ts  # Verifies clean console logs and 200 responses
│   ├── responsive.spec.ts      # Layout scrollbar overflow check across viewports
│   ├── form-fuzz.spec.ts       # Fuzzes inputs with XSS, spaces, special chars, and bounds
│   └── ai-features.spec.ts     # E2E test for the admin AI grading & CRT electron-beam console
└── exploratory/
    └── prompts/
        └── exploratory-agent-instructions.md # (This file)
```

---

## ⚡ How to Run Tests

Before running E2E tests, ensure the local web server on port 3000 is active.

| Action | Command |
|---|---|
| Run all E2E tests (headless) | `npx playwright test` |
| Run all E2E tests (headed) | `npx playwright test --headed` |
| Run a specific spec file | `npx playwright test tests/e2e/form-fuzz.spec.ts` |
| Run tests without auto webserver | `npx playwright test --no-deps` |
| Open HTML test report | `npx playwright show-report` |

---

## 🔑 Bypass Gating & Authentication

We use dedicated mechanisms to bypass route gatekeepers:

1. **Admin Routes (`/admin/*`)**:
   Ensure `BYPASS_ADMIN_AUTH=true` is set in the environment or `.env.local` to instruct the server middleware to skip credentials requirements.
   
2. **Student Routes (`/learn/[classCode]/*`)**:
   Use the `authenticatedStudentPage(classCode)` fixture in your test files to automatically generate a signed session JWT and inject the session cookie.
   ```typescript
   test('load student page', async ({ page, authenticatedStudentPage }) => {
     await authenticatedStudentPage('DATA-2026')
     await page.goto('/learn/DATA-2026')
     // Dashboard loads successfully without redirecting to gateway
   })
   ```

---

## 🧪 How to Write/Extend Tests Using Helpers

When composing new `.spec.ts` files, use the custom helpers registered in our fixtures:

### 1. Fuzzing Inputs (`fuzz`)
Inject `fuzz` to retrieve pre-configured fuzzing datasets:
```typescript
test('fuzz input', async ({ page, fuzz }) => {
  const payloads = fuzz.xssPayloads() // or fuzz.emptyStrings(), fuzz.specialChars()
  const randomSet = fuzz.randomFormData() // { name, email, password, text }
  
  await page.locator('#email').fill(randomSet.email)
})
```

### 2. Error Tracking (`consoleTracker`)
Inject `consoleTracker` to ensure the pages are completely free of script issues or asset errors:
```typescript
test('clean console check', async ({ page, consoleTracker }) => {
  await page.goto('/my-page')
  // Assert no pageerror, console.error, or HTTP status >= 400 occurred
  consoleTracker.assertNoErrors()
})
```

### 3. Responsive Breakpoints Layout
Use the `testResponsive(description, testFn)` helper exported from `helpers/responsive` to automatically run viewport checks across Mobile (375px), Tablet (768px), and Desktop (1280px):
```typescript
import { testResponsive } from './helpers/responsive'
import { expect } from './fixtures'

testResponsive('Verifying page layout structure', async ({ page, viewportName }) => {
  await page.goto('/')
  // Assert no horizontal scrollbar (layout overflow)
  const hasScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(hasScroll).toBe(false)
})
```

### 4. AI Telemetry & Mocking (`mockRubriCore`)
Tests making grading/suggestion requests will automatically route to our Mock RubriCore server listening on port `8080`. You do not need to configure real Gemini API keys or run Python workers locally during E2E checks.

---

## 🛠️ Debugging and Failure Guidelines

1. If a test fails, do not guess: check `/test-results/` and run `npx playwright show-report`.
2. Inspect the failed screenshot under the report.
3. Review the terminal console logs output by Playwright to pinpoint the stack trace.
4. Ensure no unhandled exceptions in the client-side code are triggering the `consoleTracker`.
