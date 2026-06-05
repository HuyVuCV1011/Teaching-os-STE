# Agent Project Memory: Teaching OS (STE)

Tài liệu này tổng hợp toàn bộ kinh nghiệm phát triển, cấu trúc kiến trúc, quy ước viết mã, các lỗi thường gặp (pitfalls) và hướng dẫn thiết lập dự án **Teaching OS (STE)** phục vụ cho quá trình di chuyển môi trường làm việc từ máy Mac sang máy PC Windows mới. Tài liệu này giúp các AI Agent (Codex, Antigravity, OpenCode) trên máy Windows hiểu nhanh dự án và làm việc chính xác.

---

## 1. Project Overview

**Teaching OS (STE)** là một nền tảng lai (hybrid) được phát triển từ Portfolio Data Advisor ban đầu thành một hệ điều hành dạy học và quản lý học tập. Dự án gồm hai phần chính:
1. **Frontend & API Routes (Next.js 15)**: Giao diện public showcase (trưng bày portfolio), cổng học tập của học viên (Student Learning Portal) và trang quản trị của giáo viên (Admin CMS/Grading Panel).
2. **AI Grading Service (RubriCore Engine - FastAPI)**: Dịch vụ Python chạy chấm bài tự động bằng LLM dựa trên tiêu chí rubric.

### Stack công nghệ chính:
- **Frontend**: Next.js 15.1.7 (App Router), React 19, TypeScript, Tailwind CSS v3, Framer Motion (`motion/react`).
- **Thư viện Visuals**:
  - `reactflow` & `dagre` (vẽ sơ đồ tiến trình học tập - roadmap, diagram).
  - `@img-comparison-slider/react` (trượt so sánh ảnh báo cáo trước/sau).
  - `react-pdf` (hiển thị file PDF bài học trực quan).
  - `@tiptap/react` (trình soạn thảo văn bản WYSIWYG cho tài liệu bài học).
- **Backend & Database**: Supabase (`@supabase/supabase-js`) với PostgreSQL và Row-Level Security (RLS) được kích hoạt.
- **Python Engine**: FastAPI, SQLAlchemy, Alembic (quản lý di chuyển SQLite/PostgreSQL nội bộ của engine), Ollama (Offline LLM) hoặc Google Gemini API.
- **Package Manager**: `npm` (cho Node.js) và `uv` (cho Python, có `pyproject.toml` và `uv.lock`).

---

## 2. Current Development Workflow

Để chạy dự án đầy đủ các tính năng (bao gồm cả chấm bài AI), bạn cần khởi động song song cả Next.js Frontend và RubriCore FastAPI Backend.

### Bước 1: Khởi động Next.js App
Thực hiện trong thư mục gốc của dự án:
```bash
# Cài đặt thư viện Node.js
npm install

# Khởi động Next.js ở chế độ development
npm run dev
```
*Giao diện Frontend chạy tại: `http://localhost:3000`*

### Bước 2: Khởi động RubriCore FastAPI Server
Thực hiện trong thư mục `rubricore-engine`:
```bash
cd rubricore-engine

# Tạo virtual environment (nếu chưa có)
python -m venv .venv

# Kích hoạt virtual environment (Lưu ý lệnh khác nhau giữa macOS và Windows)
# Trên macOS: source .venv/bin/activate
# Trên Windows (Powershell): .venv\Scripts\Activate.ps1
# Trên Windows (CMD): .venv\Scripts\activate.bat
.venv\Scripts\activate

# Cài đặt thư viện Python (Khuyên dùng uv để cài đặt nhanh hơn nếu đã cài uv: uv pip install -r requirements.txt)
pip install -r requirements.txt

# Khởi động FastAPI server
uvicorn app.pilot.fastapi_app:app --host 127.0.0.1 --port 8080
```
*API FastAPI chạy tại: `http://localhost:8080`*

### Bước 3: Khởi động Background Task Worker
Mở một terminal mới, kích hoạt venv trong thư mục `rubricore-engine` và chạy:
```bash
cd rubricore-engine
.venv\Scripts\activate
python -m app.worker
```
*Worker này sẽ lắng nghe và xử lý các công việc chấm bài tự động xếp hàng trong bảng `grading_runs`.*

### Các lệnh kiểm tra tiêu chuẩn (Frontend):
- **Chạy Tests**: `npm run test` (sử dụng Vitest).
  > [!IMPORTANT]
  > Một số test file (như `assignments.test.ts`) thực hiện import trực tiếp Supabase client. Nếu môi trường test không được thiết lập biến, test sẽ thất bại với lỗi `supabaseUrl is required`. Bạn cần truyền mock biến môi trường khi chạy test:
  > ```bash
  > NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run test
  > ```
- **Chạy Linter**: `npm run lint`.
- **Kiểm tra Build**: `npm run build` (Bước kiểm tra quan trọng nhất trước khi hoàn thành task để tránh lỗi biên dịch TypeScript/JSX).

---

## 3. Important Architecture Notes

### Thư mục quan trọng của dự án:
- `src/app/`: Chứa các router Next.js, layout và các route handler API.
  - `/learn/`: Cổng truy cập của học sinh. Đăng nhập bằng email và mã lớp (`class_code`).
  - `/admin/`: CMS quản lý Curriculum, Classes và hệ thống chấm điểm Grading.
- `src/components/`: Chứa các component tái sử dụng (như `RichTextEditor.tsx`, `DocumentViewer.tsx`).
- `src/lib/`: Cấu hình Supabase client (`supabase.ts`), JWT helpers, utilities.
- `supabase/migrations/`: Các file SQL migration dùng để thiết lập schema PostgreSQL của Supabase.
- `rubricore-engine/`: Chứa mã nguồn Python của dịch vụ chấm điểm tự động.
  - `app/ai/`: Adapter kết nối Ollama/Gemini.
  - `app/pilot/fastapi_app.py`: Entrypoint API của server chấm điểm.
  - `app/worker.py`: Background worker xử lý hàng đợi chấm bài.
- `.agents/skills/`: Thư mục chứa các custom agent skills của Antigravity (như `supabase`, `design-taste-frontend`, v.v.). **Quan trọng: Thư mục này bị Git ignore!**

### Luồng dữ liệu chính:
- **Authentication cho Learner**: Học sinh nhập email và mã lớp tại `/learn`. API Route `/api/v1/verify-code` kiểm tra lớp học đang chạy và email có nằm trong whitelist (`class_enrollments`). Sau đó ký một JWT nhẹ lưu ở HTTP-Only Cookie mang tên `class_session_[classCode]`. Middleware sẽ đọc cookie này để cho phép truy cập `/learn/[classCode]/*`.
- **Authentication cho Admin**: Admin đăng nhập qua Supabase Auth. Token được lưu trong cookie `sb-access-token` hoặc `supabase-auth-token`. Middleware xác thực JWT token này bằng `SUPABASE_JWT_SECRET` và kiểm tra quyền admin (`admin`, `teacher`, `super-admin`, `content-admin`, `class-operator`).
- **Nộp và chấm bài (Grading Loop)**: Học sinh tải lên tệp bài làm tại `/learn/[classCode]/assignments/[assignmentId]`. File được đẩy lên Supabase storage. Một bản ghi `submissions` được tạo, đồng thời đăng ký một job chấm bài trong `grading_runs` với trạng thái `queued`. Background worker của RubriCore sẽ lấy job này ra, gọi API LLM (Gemini/Ollama) dựa theo tiêu chí rubric để lấy đề xuất chấm điểm (`rubric_score_suggestions`), sau đó ghi kết quả đề xuất lại database. Giáo viên vào `/admin/grading/[submissionId]` xem gợi ý của AI, thực hiện chấm điểm chính thức (ghi vào `rubric_scores` và `grading_results`) và chuyển trạng thái sang `published` để học sinh có thể xem kết quả.

---

## 4. Coding Conventions

- **Next.js Server-Client Components Boundary**:
  - Ưu tiên thực hiện lấy dữ liệu từ database (Supabase fetches) trực tiếp trong **Server Components** ở server-side.
  - Chỉ sử dụng `"use client"` cho các component tương tác phía trình duyệt (hooks, React Flow, forms) và lấy/ghi dữ liệu qua **Next.js Server Actions** hoặc qua API route chuyên biệt.
- **Naming Conventions**:
  - Cột trong database: Luôn dùng `snake_case`. Cột ID khóa chính phải có kiểu `UUID`. Mọi cột thời gian phải kết thúc bằng `_at` (ví dụ `created_at`, `updated_at`).
  - Biến/Property trong TypeScript: Luôn dùng `camelCase`.
  - Tên Types/Interfaces: Luôn dùng `PascalCase` (ví dụ `CourseSyllabus`).
  - Các trạng thái (Enums) phải khớp chính xác với mảng ràng buộc kiểm tra (constraint check arrays) trong Postgres.
- **Supabase RLS & Storage Rules**:
  - Mọi bảng mới tạo trong Supabase bắt buộc phải bật Row Level Security (RLS) bằng lệnh:
    ```sql
    ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
    ```
  - Cần viết chính sách (policies) rõ ràng cho từng hành động `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Tránh dùng wildcard chính sách không an toàn.
  - Tài liệu bài học dạng PDF phải được cấp quyền xem an toàn bằng Signed URL có thời hạn ngắn (300 giây) thay vì link download trực tiếp công khai.

---

## 5. UI/UX Notes

- **Nguyên tắc Sáng/Light Theme (Light Theme Principle)**: 
  Dự án tuân thủ nghiêm ngặt giao diện sáng (bright white theme) được kích hoạt qua lớp HTML `light`. Không tự ý đưa các thành phần tối màu (dark theme) vào giao diện nhập liệu hoặc trang quản trị.
- **Inverted Slate Logic**: 
  Cần tuân thủ cấu hình nghịch đảo màu slate được thiết lập trong `tailwind.config.ts`:
  - `bg-slate-950` ánh xạ thành màu nền trắng tinh (`#ffffff`).
  - `bg-slate-900` ánh xạ thành màu nền thẻ/bảng điều khiển nhạt (`#f8fafc`).
  - `border-slate-800` ánh xạ thành viền xám nhạt (`#e2e8f0`).
  - `text-slate-100` ánh xạ thành màu chữ tối slate (`#0f172a`).
  - Tránh thêm các màu thô hoặc tự ý viết đè màu tối phá vỡ nguyên lý sáng này.
- **Responsive Layout**:
  - Các màn hình CMS Admin cần cấu trúc dạng bảng/form sạch sẽ, tối ưu hóa khả năng quét thông tin nhanh.
  - Màn hình học viên (Learner screens) cần đảm bảo hiển thị hoàn hảo trên các thiết bị di động, điều hướng trực quan và bố cục thoáng.
- **Icon**: Ưu tiên sử dụng thư viện `lucide-react` làm biểu tượng mặc định.

---

## 6. Backend/Data Notes

- **Bảo mật RLS cho Học sinh & Giáo viên**:
  - Cần lọc nghiêm ngặt các kết quả chấm điểm. Học sinh không được phép truy vấn thông tin điểm của học sinh khác hoặc xem các điểm số còn ở trạng thái bản nháp (`status = 'draft'`). Chỉ những kết quả có `status = 'published'` mới được hiển thị trên bảng điểm của học sinh.
  - Không dựa hoàn toàn vào Middleware Next.js để bảo mật. Middleware chỉ chặn truy cập route ở client, mọi API/Supabase Client thực hiện truy vấn đều cần tuân thủ RLS phân quyền ở database level.
- **Xử lý Transaction & Rollback khi lỗi upload**:
  - Khi học sinh nộp bài hoặc giáo viên upload tài liệu, hệ thống tải tệp lên Supabase Storage trước sau đó mới tạo bản ghi trong database.
  - Nếu quá trình tạo bản ghi database thất bại (database constraint violation...), **bắt buộc phải chạy routine rollback** để tự động xóa tệp vừa upload trên Storage nhằm tránh tích tụ các tệp mồ côi (orphan files) gây lãng phí tài nguyên.
- **Deduplication bằng SHA-256 Hash**:
  - Trước khi ghi tệp nộp bài thực sự vào storage, client/server sẽ tính toán mã SHA-256 hash của tệp đó.
  - Nếu mã hash đã tồn tại trong metadata database, hệ thống sẽ bỏ qua việc upload vật lý và trỏ đường dẫn trực tiếp tới tệp cũ nhằm tối ưu hóa dung lượng lưu trữ.
- **Late Penalty (Phạt nộp muộn)**:
  - Hệ thống tự động tính toán số ngày nộp muộn dựa vào `due_date` trong `class_schedules`.
  - Phạt nộp muộn được tính theo công thức: `Số ngày quá hạn * Tỷ lệ phạt mỗi ngày (%)`. Giáo viên có thể bật/tắt lựa chọn áp dụng hình phạt này trên giao diện chấm điểm.
- **Teacher Override Reason**:
  - Nếu giáo viên điều chỉnh điểm khác biệt so với gợi ý chấm của AI, giao diện chấm điểm bắt buộc giáo viên phải nhập lý do thay đổi điểm (`override_reason`). Nếu để trống, hệ thống sẽ chặn không cho lưu điểm.

---

## 7. Known Pitfalls (Các bẫy lỗi cần lưu ý)

1. **Thư mục `.agents/` và `skills-lock.json` bị Git ignore**:
   > [!IMPORTANT]
   > Do các file custom skills hỗ trợ AI Agent nằm trong thư mục `.agents/skills/` không được Git theo dõi (được định nghĩa trong `.gitignore`), khi clone dự án sang máy Windows mới, các skill này sẽ bị thiếu.
   > **Giải pháp**: Bạn cần copy thủ công thư mục `.agents/` và file `skills-lock.json` từ máy Mac cũ sang thư mục gốc của dự án trên máy Windows mới.
2. **Sai lệch thông tin Spec 15 về thư mục `src/modules/`**:
   > [!WARNING]
   > File đặc tả `docs/specs/15-implementation-rules.md` yêu cầu code nghiệp vụ phải nằm trong `src/modules/`. Tuy nhiên, trong cấu trúc thực tế của repo **không hề tồn tại thư mục này**. Toàn bộ mã nguồn Next.js App Router được quản lý tại `src/app/`, `src/components/`, `src/lib/`, `src/types/` và `src/data/`. Hãy làm theo cấu trúc thực tế của repo, không cố tạo thư mục `src/modules/`.
3. **Bypass Admin Auth trong môi trường Dev**:
   Trong môi trường development, nếu chưa cấu hình xong tài khoản admin trên Supabase Auth, bạn có thể thiết lập biến môi trường `BYPASS_ADMIN_AUTH=true` trong `.env.local` để vượt qua bộ lọc Middleware xác thực quyền admin khi truy cập các trang `/admin/*`.
4. **Không nhất quán trong Routing của Project CMS**:
   Theo đặc tả thiết kế, tính năng CMS quản lý portfolio projects lẽ ra phải nằm tại `/admin/projects`. Tuy nhiên, thực tế code hiện tại vẫn đang chạy công khai tại `/projects` (bao gồm các màn tạo `/projects/create` và sửa `/projects/edit/[id]`). Cần cẩn thận khi chỉnh sửa khu vực này để tránh phá vỡ giao diện CMS hiện hữu.
5. **Next.js 15 Lint Script Stale & Build Config**:
   Dự án sử dụng Next.js 15, lệnh `npm run lint` thường báo lỗi do sử dụng nhiều kiểu `any` và các biến unused. Tuy nhiên, trong `next.config.ts` có cấu hình `ignoreDuringBuilds: true` và `ignoreBuildErrors: true`. Do đó, lệnh `npm run build` vẫn có thể chạy thành công bất chấp lỗi lint/type. Cần phân biệt rõ giữa việc "Build thành công" và "Code sạch lỗi Type/Lint".
6. **Lỗi Parse JSX trong trang Grading**:
   Trước đây trang chấm điểm `/admin/grading/[submissionId]/page.tsx` từng gặp lỗi biên dịch nghiêm trọng (JSX parse error) làm cho lệnh `npm run build` thất bại. Luôn chạy thử `npm run build` sau khi chỉnh sửa trang này để chắc chắn hệ thống không bị lỗi build.

---

## 8. Verification Checklist

Trước khi báo cáo hoàn thành bất kỳ task nào trên máy Windows mới, hãy kiểm tra danh sách sau:

- [ ] **Build ổn định**: Chạy lệnh `npm run build` thành công (Lưu ý Next.js đang bỏ qua lỗi TypeScript/ESLint khi build nên vẫn cần kiểm tra thủ công xem có lỗi nghiêm trọng không).
- [ ] **Lint sạch sẽ**: Chạy lệnh `npm run lint` (hoặc kiểm tra các file đã chỉnh sửa không chứa lỗi cú pháp nghiêm trọng).
- [ ] **Tests chạy qua**: Chạy `npm run test` (truyền kèm các biến môi trường mock nếu gặp lỗi `supabaseUrl is required`).
- [ ] **Kiểm tra UAT thủ công trên Browser**:
  - [ ] Truy cập `/learn` và đăng nhập bằng email whitelisted cùng mã lớp mẫu (ví dụ: `DATA-2026`).
  - [ ] Kiểm tra xem các bài học quá hạn có bị khóa/mở khóa đúng ngày `visible_after` trên đồ thị React Flow không.
  - [ ] Xem thử một bài học có chứa tài liệu PDF, DOCX hoặc spreadsheet và kiểm tra xem trình xem tài liệu có hiển thị đúng giao diện Light theme không.
  - [ ] Nộp thử một bài tập, kiểm tra xem dung lượng và số lượng tệp có bị giới hạn đúng cấu hình không.
  - [ ] Kiểm tra xem AI gợi ý điểm có được đẩy lên hàng đợi chấm điểm của RubriCore hay không.

---

## 9. Environment Variables Specification (Cấu hình biến môi trường chi tiết)

Để dự án hoạt động trơn tru trên máy PC Windows local, Agent cần hỗ trợ khởi tạo hai tệp cấu hình môi trường dưới đây với cấu trúc placeholder như sau:

### A. Tệp `.env.local` (Đặt tại thư mục gốc Next.js)
```env
# URL kết nối tới Supabase Local (mặc định nếu dùng Supabase CLI là cổng 54321)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_local_anon_key

# JWT Secret của Supabase Auth dùng để giải mã token kiểm tra quyền Admin
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_key

# Service role key để thực hiện các thao tác bypass RLS an toàn từ server-side
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret dùng cho session cookie của học sinh (class_session_[classCode])
# Lưu ý: Cần trùng với khóa ký JWT trong Next.js API
JWT_SECRET=your_custom_lightweight_jwt_secret_key

# Bật 'true' trong môi trường dev để bypass login admin, hỗ trợ viết code nhanh
BYPASS_ADMIN_AUTH=true

# URL kết nối sang FastAPI server chấm điểm RubriCore
RUBICORE_API_URL=http://127.0.0.1:8080

# API key dùng cho AI (Gemini) gọi trực tiếp từ client/server action Next.js
GEMINI_API_KEY=your_gemini_api_key_here
```

### B. Tệp `.env` (Đặt tại thư mục `rubricore-engine/`)
```env
APP_ENV=local

# Chuỗi kết nối DB Postgres của Supabase local (mặc định cổng db qua Supabase CLI là 54322)
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres

# Cấu hình kết nối Ollama local
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=deepseek-r1
OLLAMA_TIMEOUT_SECONDS=120

# Cấu hình gọi cloud API LLM
GEMINI_API_KEY=your_gemini_api_key_here

# Token bảo mật giữa Next.js và RubriCore dùng để verify callback chấm điểm
GRADING_SECRET_TOKEN=your_secure_grading_callback_token_here
```

---

## 10. Multi-Device Sync & Remote Server Control (Quy trình làm việc liên thiết bị Mac <-> PC)

Quy trình phát triển: **Máy Mac dùng để viết code ngoài đường - Máy PC Windows đóng vai trò Local Server (chạy Supabase, Next.js dev server, FastAPI backend, Ollama).**

### A. Giải pháp đồng bộ mã nguồn (Source Code Sync)
Để các thay đổi code trên máy Mac tự động đồng bộ sang máy PC và kích hoạt tính năng tự khởi động lại (Hot Reload / Auto-Reload) của Next.js và Uvicorn:

1. **Khuyên dùng VS Code Remote-SSH (Tối ưu nhất)**:
   - Từ máy Mac, bạn mở VS Code và sử dụng extension **Remote - SSH** kết nối thẳng vào địa chỉ IP của máy PC Windows.
   - Toàn bộ mã nguồn thực tế sẽ nằm trên ổ cứng của PC, các thao tác chỉnh sửa của bạn trên Mac sẽ ghi trực tiếp lên PC.
   - Next.js dev server (`npm run dev`) và FastAPI (`uvicorn --reload`) đang chạy trên PC sẽ tự động nhận biết thay đổi và reload tức thì.
2. **Sử dụng Syncthing (Đồng bộ file thời gian thực)**:
   - Cài đặt Syncthing trên cả Mac và PC. Thiết lập đồng bộ thư mục code theo thời gian thực (loại trừ `node_modules`, `.next`, `.venv` qua file `.stignore`).
   - Khi sửa code trên Mac, Syncthing sẽ đồng bộ tệp tin sang PC chỉ trong vài mili-giây, kích hoạt Hot Reload trên PC.

### B. Quy trình gửi lệnh từ xa qua SSH (Remote Server Reset Workflow)
Khi bạn cần khởi động lại hoàn toàn hoặc bật/tắt các tiến trình máy chủ trên PC Windows từ máy Mac của mình, hãy thực hiện qua SSH.

> [!TIP]
> **Chuẩn bị trên PC Windows**:
> Bật tính năng **OpenSSH Server** trên Windows:
> `Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0` và khởi động service sshd.

Dưới đây là các lệnh script Bash bạn chạy trên máy Mac để điều khiển tắt/bật server trên PC Windows:

```bash
# Thiết lập các biến kết nối (Thay thế thông tin máy PC của bạn)
PC_USER="your_windows_username"
PC_IP="192.168.1.xxx" # Địa chỉ IP local của máy PC
PROJECT_PATH="C:\path\to\your\vuth-portfolio-main" # Đường dẫn dự án trên PC

# 1. Reset Next.js Dev Server (Port 3000) từ máy Mac:
ssh ${PC_USER}@${PC_IP} "powershell -Command \"Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue; Start-Process cmd -ArgumentList '/c cd ${PROJECT_PATH} && npm run dev' -WindowStyle Minimized\""

# 2. Reset FastAPI Server (Port 8080) từ máy Mac:
ssh ${PC_USER}@${PC_IP} "powershell -Command \"Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue; Start-Process powershell -ArgumentList '-NoProfile -Command cd ${PROJECT_PATH}\rubricore-engine; .venv\Scripts\activate; uvicorn app.pilot.fastapi_app:app --host 127.0.0.1 --port 8080' -WindowStyle Minimized\""

# 3. Reset Background Worker từ máy Mac:
# (Tắt toàn bộ tiến trình python chạy worker cũ và khởi động lại)
ssh ${PC_USER}@${PC_IP} "powershell -Command \"Stop-Process -Name python -Force -ErrorAction SilentlyContinue; Start-Process powershell -ArgumentList '-NoProfile -Command cd ${PROJECT_PATH}\rubricore-engine; .venv\Scripts\activate; python -m app.worker' -WindowStyle Minimized\""
```

---

## 11. Agent Instructions (Chỉ dẫn cho Agent tiếp theo)

Khi bắt đầu làm việc trên dự án này tại máy Windows mới:
1. **Đọc tài liệu này đầu tiên** và kiểm tra xem thư mục `.agents/skills` đã được copy sang hay chưa.
2. Đọc file `AGENTS.md` ở thư mục gốc để nắm rõ các quy tắc an toàn (nhất là không tự ý sửa đổi cơ sở dữ liệu Supabase migrations, không push secrets lên Git và không commit file `.env.local`).
3. Luôn cấu hình đầy đủ các biến môi trường dựa trên mục **9. Environment Variables Specification** nêu trên để chạy được local.
4. Luôn tôn trọng quy tắc **Light Theme** của giao diện.
5. Khi viết các thao tác ghi dữ liệu từ phía admin, hãy đảm bảo chúng được đóng gói trong **Server Actions** hoặc API Route bảo mật thay vì gọi trực tiếp Supabase Client từ phía Client.
6. Tuyệt đối không được sửa đổi hay ghi đè tệp `AGENTS.md` trừ khi có yêu cầu rõ ràng từ người dùng.

