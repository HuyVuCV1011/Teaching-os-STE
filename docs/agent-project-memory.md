# Agent Project Memory: Teaching OS (STE)

Tài liệu này tổng hợp toàn bộ hiện trạng mã nguồn, các module chức năng đang hoạt động thực tế, cấu trúc kiến trúc, quy ước viết mã và các bài học kinh nghiệm phát triển trên hệ thống **Teaching OS (STE)**. 

---

## 1. Bản Đồ Hệ Thống & Các Module Đang Hoạt Động (Audited)

Repo hiện tại đã tích hợp đầy đủ các Zone chức năng sau (khác biệt với các tài liệu Spec/Review cũ):

### A. Giao diện Public / Portfolio
- **Trang chủ (`src/app/page.tsx`)**: Landing page giới thiệu các dự án tư vấn doanh nghiệp (`ConsultingProject`) và dự án học viên (`StudentsProject`).
- **Chi tiết dự án (`src/app/projects/[projectId]/page.tsx`)**: Hiển thị iframe dashboard PowerBI, nhúng YouTube, sơ đồ quy trình bằng React Flow, mô tả dự án và so sánh tài liệu PDF (trượt so sánh slider `ImgComparisonSlider`).
- **Lưu ý**: Trang danh sách CMS chỉnh sửa dự án đã được di chuyển hoàn toàn vào vùng quản trị an toàn dưới quyền Admin (`/admin/projects`).

### B. Cổng Học Tập Học Viên (Student Learning Portal)
- **Cổng Đăng Nhập (`src/app/learn/page.tsx`)**: Đăng nhập bằng Email học viên + Class Code mã lớp học. API handler `/api/v1/verify-code` xác thực và lưu cookie JWT HTTP-only `class_session_[classCode]`.
- **Trang Dashboard Học Viên (`src/app/learn/[classCode]/dashboard/page.tsx`)**: Hiển thị các khóa học đang tham gia, tiến trình tổng quan và bảng nhận chứng chỉ (`CertificateModal`) khi đủ điều kiện tốt nghiệp.
- **Bản Đồ Lộ Trình (`src/app/learn/[classCode]/courses/[courseSlug]/roadmap/page.tsx`)**: Vẽ sơ đồ bài học dạng graph bằng React Flow & Dagre. Các bài học bị khóa hiển thị màu xám khóa theo ngày phát hành (`visible_after`); các bài học mở khóa hiển thị đầy đủ màu sắc kèm phím tắt nộp bài tập.
- **Trình Xem Bài Học Đa Định Dạng (`src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/page.tsx`)**:
  - Xem nội dung bài giảng Rich Text.
  - Xem PDF trực quan (hỗ trợ bôi đen, copy và phím tắt in/lưu tài liệu an toàn qua Signed URL).
  - Trình xem tài liệu Word (DOCX) tự động render HTML.
  - Trình xem bảng tính (CSV/XLSX) hiển thị 15 dòng dữ liệu mẫu trực quan.
  - Bảng bình luận thảo luận bài học (`LessonDiscussion.tsx`) hiển thị huy hiệu **Instructor** khi giáo viên phản hồi.
- **Trợ Lý AI Tutor (`AITutorDrawer.tsx`)**: Một ngăn kéo (drawer) chatbot thông minh được tích hợp trực tiếp tại bài học. Học viên có thể chat hỏi đáp về tài liệu thông qua Server Action `/learn/actions/ai_tutor.ts` sử dụng cơ chế RAG tìm kiếm thư viện tri thức.
- **Workspace Nộp Bài Tập (`src/app/learn/[classCode]/assignments/[assignmentId]/page.tsx`)**: Form tải lên sản phẩm bài làm, hiển thị hướng dẫn, các câu hỏi tự luận, chấm điểm tự động. Hỗ trợ cơ chế băm SHA-256 để chống trùng lặp vật lý tập tin trên Storage và rollback tự động khi lỗi DB.
- **Bảng Điểm Học Viên (`src/app/learn/[classCode]/grades/page.tsx`)**: Hiển thị chi tiết tất cả điểm số, nhận xét của từng tiêu chí chấm bài từ giáo viên sau khi đã công bố (`status = 'published'`).

### C. Giao Diện Quản Trị Giáo Viên (Admin CMS & Grading Panel)
- **Admin Dashboard (`src/app/admin/page.tsx`)**: Tổng quan thống kê số lớp học, bài học và bài nộp cần chấm điểm.
- **CMS Quản Lý Lớp Học (`src/app/admin/classes/page.tsx`)**: 
  - Quản lý danh sách học viên Whitelist (`StudentWhitelist.tsx`).
  - Đăng bài lên bảng tin thông báo lớp học (`NoticeBoardWorkspace.tsx`).
  - Quản lý lịch mở khóa bài học (`SyllabusWorkspace.tsx`) qua timeline canvas trực quan.
  - Phân tích tiến trình và điểm trung bình lớp học (`AnalyticsWorkspace.tsx`).
- **CMS Thư viện Giáo Trình (`src/app/admin/library/page.tsx`)**:
  - Quản lý cấu trúc môn học (Subjects) và giáo án (Syllabus Roadmap).
  - Quản lý danh mục bài tập (Assignments Catalog).
- **Trình Soạn Thảo Bài Học (`src/app/admin/library/lesson-editor/page.tsx`)**: WYSIWYG Editor kết hợp công cụ tải lên tài liệu học liệu, thiết kế Rubric tự động bằng AI, và hỗ trợ AI sinh đáp án tham khảo (QA Review Answers).
- **Trình Chiếu Slide Tương Tác (`src/app/admin/presentation/[lessonId]/page.tsx`)**: Trình chiếu slide bài giảng ngay trong lớp học (`MarkdownSlidePlayer`) trực tiếp từ tài liệu Markdown của bài học.
- **CMS Dự án Portfolio (`src/app/admin/projects/page.tsx`)**: Quản lý danh mục dự án trưng bày của trung tâm, đính kèm media, links, và vẽ sơ đồ quy trình bằng React Flow chuyên biệt dành riêng cho quản trị viên.
- **Hệ Thống Chấm Điểm AI & Manual Grading (`src/app/admin/grading/`)**:
  - Hàng đợi chấm bài (`page.tsx`) hiển thị các bài nộp cần chấm.
  - Trang chi tiết chấm điểm (`src/app/admin/grading/[submissionId]/page.tsx`): Cho phép chấm thủ công, xem đề xuất chấm tự động từ AI.
  - **AI Grading Memory Loop**: Khi giáo viên sửa điểm/feedback và nhập lý do ghi đè (`override_reason`), hệ thống tự động lưu vào bảng `grading_feedback_embeddings` (sử dụng vector 1536 chiều từ Gemini). Khi chấm bài mới, hệ thống tự động tìm kiếm cosine similarity (RPC `match_grading_feedback`) để đưa các override trước đây làm few-shot examples cho LLM chấm bài chuẩn xác theo gu của giáo viên.
  - **Similarity Auditor (`src/app/admin/grading/similarity/page.tsx`)**: Dashboard phát hiện đạo văn giữa các học sinh thông qua khoảng cách Jaccard (lexical similarity) và độ tương đồng vector bài làm (`submission_embeddings`).

---

## 2. Quy Ước Viết Mã & Cấu Trúc File Chính

- **Frontend Next.js 15 (App Router)**: Mọi trang nằm trong thư mục `src/app/`.
  - Layout Admin: `src/app/admin/layout.tsx`.
  - Layout Student: `src/app/learn/[classCode]/layout.tsx` (tự động giải mã và kiểm tra token lớp học).
- **Next.js Server Actions**: Đóng gói các tác vụ ghi/xóa cơ sở dữ liệu ở server-side để tránh rò rỉ quyền hoặc khóa bảo mật (như `saveGradingResultAction`, `toggleLessonProgressAction`, `ai_tutor` actions).
- **Bảo Mật JWT**:
  - Middleware (`src/middleware.ts`) chặn các token được ký bằng fallback dev key khi chạy ở môi trường Production.
  - Session lớp học được mã hóa JWT HTTP-only cookie, phân tách rõ ràng quyền của học viên và admin.
- **Supabase RLS**: Tất cả các bảng dữ liệu đều được áp dụng Row Level Security. Quyền truy cập điểm số của học sinh được thắt chặt, học sinh chỉ có quyền SELECT các điểm số có `status = 'published'` của chính mình (kiểm tra claim email trong JWT).
- **RubriCore Python Engine (`rubricore-engine`)**:
  - Chạy cổng API FastAPI trên cổng `8080`.
  - Background worker (`app/worker.py`) lắng nghe bảng `grading_runs` và chấm điểm ngầm.
  - Cả luồng chấm ngầm và luồng gợi ý thủ công đều sử dụng chung RAG memory loop từ bảng `grading_feedback_embeddings`.

---

## 3. Các Điểm Cần Lưu Ý Trong Tương Lai (Pitfalls & Tips)

1. **Rút Trích Tệp Lớn Trong Worker**:
   - Background worker tải file từ Supabase Storage và thực hiện OCR (Tesseract) / Parser. Nếu tệp tin quá lớn hoặc không đọc được chữ, worker sẽ đánh dấu thất bại và đẩy về hàng đợi thủ công của giáo viên.
2. **Cấu Hình API Key Cho Vector Search**:
   - Cần cấu hình `GEMINI_API_KEY` ở cả Next.js và Python để tạo được vector `1536` chiều cho mô hình `text-embedding-004`. Nếu thiếu, hệ thống sẽ bỏ qua bước few-shot và chấm điểm không có bộ nhớ (zero-memory loop).
3. **Thắt Chặt Duplicate Override**:
   - Khi giáo viên chỉnh sửa nhiều lần, hệ thống sẽ thực hiện pre-delete dữ liệu override cũ trước khi chèn dòng mới vào bảng `grading_feedback_embeddings`, giữ cho kho dữ liệu huấn luyện Active Learning luôn tinh gọn và chính xác.
4. **Light Theme Principle**:
   - Toàn bộ giao diện được thiết kế theo chủ đạo White/Light Theme (lớp HTML `light`). Quy tắc Tailwind nghịch đảo slate (`bg-slate-950` là màu trắng `#ffffff`) phải luôn được tôn trọng.
