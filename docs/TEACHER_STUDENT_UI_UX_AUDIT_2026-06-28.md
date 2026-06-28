# Đánh giá toàn diện UI/UX và tính năng khu vực giáo viên – học sinh

> **Sản phẩm:** Teaching OS (STE)  
> **Ngày đánh giá:** 28/06/2026  
> **Phạm vi:** Khu vực giáo viên tại `/admin/*` và khu vực học sinh tại `/learn/*`  
> **Mức độ:** Audit sản phẩm, tính năng, giao diện, trải nghiệm, accessibility, responsive và độ tin cậy của trạng thái  
> **Kết luận ngắn:** Teaching OS đã có chiều sâu tính năng tốt hơn phần lớn LMS nội bộ ở giai đoạn tương đương, nhưng chưa đạt độ “bình tĩnh, nhất quán và đáng tin” cần có cho một hệ điều hành dạy học dùng hằng ngày.

---

## 1. Tóm tắt điều hành

Teaching OS không thiếu tính năng. Ngược lại, sản phẩm đang sở hữu một chuỗi vận hành khá hoàn chỉnh:

- Giáo viên có thể xây chương trình, môn học, module, bài học, tài liệu, bài tập, đáp án và rubric.
- Giáo viên có thể quản lý lớp, whitelist học sinh, lịch mở bài, thông báo, phân tích lớp và chấm bài.
- Học sinh có thể vào lớp bằng mã lớp, xem lộ trình, đọc tài liệu nhiều định dạng, hỏi AI Tutor, nộp bài, xem điểm và nhận chứng chỉ.
- Hệ thống đã quan tâm đến nhiều trạng thái quan trọng: skeleton loading, empty state, bài bị khóa, deadline, bài đã nộp, đang chấm và điểm đã công bố.

Đây là nền móng sản phẩm tốt. Tuy nhiên, trải nghiệm hiện tại bị kéo xuống bởi 6 nhóm vấn đề:

1. **Độ tin cậy của dữ liệu và trạng thái chưa nhất quán.** Có fallback danh tính học sinh giả; điều kiện nhận chứng chỉ khác nhau giữa Dashboard và trang Grades; nhiều lỗi tải dữ liệu bị hiển thị như trạng thái rỗng.
2. **Application shell chưa responsive.** Sidebar giáo viên và học sinh có chiều rộng cố định, không có menu mobile đúng nghĩa; phần nội dung tiếp tục dùng padding lớn trên màn hình nhỏ.
3. **Accessibility chưa đạt baseline.** Thiếu skip link, dialog semantics, focus trap, `aria-live`, nhãn cho nhiều icon button/control, hỗ trợ bàn phím cho thanh kéo split view và chế độ reduced motion.
4. **Khu giáo viên giàu chức năng nhưng nặng thao tác.** Quá nhiều `alert()`, modal, nhãn kỹ thuật, chữ rất nhỏ và thiếu search/filter/pagination ở các hàng đợi quan trọng.
5. **Ngôn ngữ và visual language bị phân mảnh.** English, Vietnamese, “operator/terminal/dossier/telemetry” cùng xuất hiện; giao diện light editorial bị ngắt bởi gradient AI và một màn hình CRT gần như là sản phẩm khác.
6. **Một số CTA và lời hứa UI chưa khớp hành vi thật.** Ví dụ “Create New Course” truyền `action=new` nhưng trang Library không đọc tham số này; điều hướng active ở khu học sinh không nhận diện route con; “drag-and-drop” chưa thực sự là trải nghiệm kéo thả đầy đủ.

### Đánh giá tổng thể

| Nhóm | Giáo viên | Học sinh | Nhận xét |
|---|---:|---:|---|
| Độ sâu tính năng | 8.5/10 | 8.0/10 | Điểm mạnh rõ nhất của hệ thống |
| Kiến trúc thông tin | 6.7/10 | 6.8/10 | Có cấu trúc, nhưng nhãn và route context chưa thật mượt |
| Giao diện và tính nhất quán | 6.2/10 | 6.8/10 | Light theme ổn, nhưng nhiều visual dialect cạnh tranh nhau |
| Hiệu suất thao tác | 6.2/10 | 7.0/10 | Giáo viên chịu nhiều modal/alert; học sinh có “next action” tương đối rõ |
| Feedback và trạng thái | 5.5/10 | 6.2/10 | Có skeleton/empty state tốt, nhưng lỗi và trạng thái thật chưa minh bạch |
| Accessibility | 4.3/10 | 4.7/10 | Chưa đủ cho keyboard, screen reader và reduced motion |
| Responsive/mobile | 3.5/10 | 5.0/10 | Gateway tốt hơn; application shell là điểm nghẽn lớn |
| Tin cậy và minh bạch | 5.3/10 | 5.2/10 | Có mâu thuẫn logic và một số trạng thái hard-code |
| **Điểm tổng hợp** | **6.1/10** | **6.5/10** | Nền tảng tốt, cần một vòng hardening UX thay vì tiếp tục thêm feature |

> Điểm số là thang heuristic phục vụ ưu tiên thiết kế, không phải chứng nhận usability hay WCAG.

---

## 2. Phạm vi và phương pháp đánh giá

### 2.1 Phạm vi đã đọc

Audit bao phủ:

- Admin shell, Dashboard, Library CMS, Assignment catalog, Knowledge Hub.
- Lesson Editor, Presentation View.
- Class Manager, whitelist, syllabus scheduling, announcements, analytics.
- Grading Queue, Manual Evaluation, AI suggestions, Similarity Checker.
- Projects CMS.
- Student Gateway, Dashboard, Roadmap.
- Lesson Reader, document viewers, split view, Zen Mode, Discussion, AI Tutor.
- Assignments list, submission workspace, grading status.
- Grades feed và Certificate.

Tổng cộng cây `src/app/admin` và `src/app/learn` hiện có 75 file TypeScript/TSX được rà soát ở mức cấu trúc, trạng thái và pattern giao diện. Các shared component liên quan trực tiếp đến bài học và tài liệu cũng được kiểm tra.

### 2.2 Chuẩn đối chiếu

- Web Interface Guidelines của Vercel.
- Nguyên tắc WCAG 2.2 ở mức baseline: keyboard, focus, semantics, labels, status announcements và motion.
- Heuristic UX: visibility of system status, match with user language, error prevention, consistency, recognition over recall, user control và progressive disclosure.
- Quy tắc sản phẩm của repo: light theme, admin ưu tiên scanability, learner ưu tiên readability/progress clarity, không thêm trang trí làm nhiễu workflow.

### 2.3 Design Read dùng làm chuẩn

> **Teaching OS nên mang cảm giác của một “bàn làm việc dạy – học sáng, rõ, có trật tự”: đủ đậm dữ liệu cho giáo viên, đủ ấm và định hướng cho học sinh, không phô diễn công nghệ ở nơi người dùng chỉ muốn hoàn thành công việc.**

Các “design dial” đề xuất:

| Dial | Giá trị | Ý nghĩa |
|---|---:|---|
| `DESIGN_VARIANCE` | 4/10 | Cho phép khác biệt giữa public, teacher và learner nhưng vẫn cùng một hệ thống |
| `MOTION_INTENSITY` | 2/10 | Motion chỉ dùng cho chuyển trạng thái, không dùng để tạo “kịch tính” |
| `VISUAL_DENSITY` | 7/10 admin, 5/10 learner | Admin quét nhanh; learner đọc thoải mái hơn |

### 2.4 Giới hạn của lần audit

- `npx tsc --noEmit` chạy thành công.
- Không chạy Playwright/E2E theo đúng quy định của dự án.
- Dev server đang giữ cổng 3000 nhưng không trả response; một phiên dev tách biệt trên cổng 3001 cũng dừng ở trạng thái `Starting...`. Vì vậy, audit này không tuyên bố đã hoàn tất pixel-level visual QA bằng screenshot.
- Phần đánh giá giao diện dựa trên source hiện hành, Tailwind class, component hierarchy, state logic và route behavior.
- Không thay đổi source sản phẩm, database, auth hay `.env.local`; chỉ thêm báo cáo này.

---

## 3. Bản đồ tính năng hiện tại

### 3.1 Khu vực giáo viên

| Module | Tính năng hiện có | Đánh giá nhanh |
|---|---|---|
| Admin Dashboard | Chỉ số subject/course/class/submission; quick action; status card | Đủ làm landing, nhưng status và CTA chưa hoàn toàn đáng tin |
| Library CMS | Subject taxonomy; course; module; lesson; reorder; duplicate; knowledge | Rất mạnh về phạm vi, nhưng mật độ và thuật ngữ cao |
| Lesson Editor | 4-step composer; rich text; material layout; assignment; answer; rubric; AI | Feature-rich nhất, đồng thời là nơi cognitive load cao nhất |
| Presentation | Chuyển bài học thành slide, navigation/fullscreen | Hữu ích, đúng nhu cầu giảng dạy |
| Classes | Cohort; code; active dates; course mapping; release schedule; whitelist | Luồng vận hành lớp khá hoàn chỉnh |
| Announcements | Tạo/xóa thông báo theo lớp | Đơn giản, đúng mục tiêu |
| Analytics | Average, submission rate, backlog, distribution, difficulty, at-risk | Có giá trị thực, vượt khỏi “dashboard cho đẹp” |
| Grading | Queue; batch/single AI; manual rubric; draft/publish; late penalty | Nền tảng nghiệp vụ tốt |
| Similarity | Ma trận so sánh submission; xem nội dung cạnh nhau | Khác biệt và hữu dụng |
| Projects CMS | CRUD dự án, media, link, React Flow | Mạnh nhưng đang đứng cạnh teaching operations mà chưa phân nhóm rõ |

### 3.2 Khu vực học sinh

| Module | Tính năng hiện có | Đánh giá nhanh |
|---|---|---|
| Learning Gateway | Mã lớp + email whitelist; redirect; expired-session message | Luồng ngắn, dễ hiểu |
| Dashboard | Course, progress, continue learning, deadline, announcement, certificate | Có định hướng hành động tốt |
| Roadmap | Module, lesson, lock, release date, progress, assignment CTA | Mô hình tinh thần phù hợp việc học |
| Lesson Workspace | Nội dung, viewer đa định dạng, layout stacked/split, Zen, complete | Rất giàu năng lực |
| AI Tutor | Chat theo class/lesson | Tiềm năng cao nhưng thiếu trust layer |
| Discussion | Comment, reply, delete | Tạo vòng tương tác cơ bản |
| Assignment | Instructions, preview file, question answer, upload, submission status | Đủ cho quy trình nộp bài |
| Grades | Điểm tổng, trạng thái, rubric feedback, certificate eligibility | Feedback học tập tốt hơn bảng điểm tối giản |

---

## 4. Đánh giá khu vực giáo viên

## 4.1 Admin shell và navigation

### Điểm tốt

- Navigation chính ngắn, chỉ có 5 mục; không biến sidebar thành “link farm”.
- Active state dùng `pathname.startsWith(...)`, nên route con vẫn giữ đúng ngữ cảnh.
- Tách public showcase khỏi admin bằng CTA “Return to Showcase”.
- Main content có `min-w-0`, giúp các bảng/panel có cơ hội co giãn đúng.

### Vấn đề

1. **Không responsive.** Sidebar cố định `w-56`, `h-screen`, sticky và không có mobile trigger. Main content tiếp tục `p-8`. Ở viewport 375px, không gian nội dung thực tế sẽ rất hẹp.
2. **Profile là dữ liệu giả hard-code.** “Administrator” và `admin@ste-education.org` không phản ánh tài khoản hiện tại, làm giảm niềm tin về role/session.
3. **“Live & Secure” là trạng thái hard-code.** UI đang tuyên bố sức khỏe và bảo mật mà không đọc health check thực.
4. **Thiếu sign-in/unauthorized experience.** Middleware redirect người không có quyền về `/`, không giải thích vì sao hoặc cách đăng nhập.
5. **Public footer và Scroll-to-top nằm ở root layout**, vì vậy có thể xuất hiện sau application shell của admin/learner, tạo cảm giác public site “rò” vào app.
6. Không có skip-to-content link.

### Khuyến nghị

- Desktop giữ sidebar; tablet dùng rail; mobile chuyển sang top bar + sheet hoặc bottom navigation.
- Profile phải lấy từ auth/session thật, hiển thị role thật và menu account.
- Chỉ hiển thị health badge khi có endpoint health; nếu chưa có, đổi thành “Environment: Development” hoặc bỏ hẳn.
- Tạo `/admin/login` hoặc ít nhất `/unauthorized` có lời giải thích và CTA đúng.
- Tách `AppChrome` khỏi public root layout; footer public không render trong `/admin` và `/learn/[classCode]`.

**Evidence:** `src/app/admin/layout.tsx:34`, `src/app/admin/layout.tsx:87`, `src/app/admin/layout.tsx:101`, `src/app/admin/layout.tsx:113`, `src/app/layout.tsx:33`, `src/app/layout.tsx:35`, `src/middleware.ts:129`.

---

## 4.2 Admin Dashboard

### Điểm tốt

- 4 card metric bám đúng nghiệp vụ: subject, course, cohort, ungraded submission.
- Dữ liệu được fetch song song; có skeleton cho số liệu.
- Có quick action thay vì chỉ làm dashboard “để xem”.
- Layout metric → action → system info có thứ tự hợp lý.

### Vấn đề

1. **Hero “Welcome Back, Operator” và “central terminal” không hợp vai trò giáo viên.** Đây là ngôn ngữ của system operator, không phải educator.
2. **Mỗi card dùng một accent/gradient khác nhau**, làm dashboard giống template AI nhiều màu hơn là một hệ thống vận hành.
3. **CTA “Create New Course” chưa mở form mới.** Link truyền `action=new`, nhưng Library chỉ đọc `tab`; đây là CTA hứa sai hành vi.
4. **System Status card hiển thị cấu hình tĩnh** như database, bucket và “RLS Activated”; không có bằng chứng runtime trong component.
5. Dashboard chưa trả lời các câu hỏi hằng ngày quan trọng nhất:
   - Bài nào cần chấm trước?
   - Lớp nào có deadline gần?
   - Học sinh nào cần hỗ trợ?
   - Bản nháp nào chưa hoàn tất?

### Khuyến nghị

- Đổi copy thành “Chào thầy/cô” hoặc tên thật.
- Dùng một accent blue; amber/red/green chỉ dành cho trạng thái.
- Sửa CTA để thực sự mở form, hoặc đổi thành “Mở Course Catalog”.
- Thay “System Status” bằng “Việc cần làm hôm nay”.
- Thêm 3 danh sách ngắn: pending grading, upcoming releases/deadlines, drafts needing attention.

**Evidence:** `src/app/admin/page.tsx:99`, `src/app/admin/page.tsx:102`, `src/app/admin/page.tsx:154`, `src/app/admin/page.tsx:186`, `src/app/admin/page.tsx:199`, `src/app/admin/library/page.tsx:61`.

---

## 4.3 Library CMS và cấu trúc chương trình

### Điểm tốt

- Mô hình Subject → Course → Module → Lesson hợp lý và có khả năng tái sử dụng.
- Tab state được phản ánh bằng query param, hỗ trợ deep link ở mức cơ bản.
- Có duplicate course, reorder module/lesson, assignment catalog và Knowledge Hub.
- Desktop layout sidebar registry + canvas phù hợp công việc quản trị nội dung.
- Empty/loading state có chủ đích.

### Vấn đề

1. **Header quá “bọc hộp”:** double bezel, rounded lớn, glow/gradient, pill CTA, tab capsule. CMS nội bộ cần ít chrome hơn để dành chỗ cho nội dung.
2. `Educational CMS Workspace`, `Subjects Taxonomy`, `RAG Knowledge Hub`, `Knowledge Base`, `Syllabus Timeline Canvas` tạo mật độ thuật ngữ cao.
3. Có quá nhiều cấp điều hướng song song:
   - Sidebar toàn admin.
   - Header CTA sang Assignments/Knowledge.
   - Tab Courses/Subjects/Knowledge.
   - Course sidebar.
   - Canvas module/lesson.
4. Query param chỉ phản ánh tab, chưa phản ánh course đang chọn, search, module mở hoặc form đang mở.
5. Nhiều thao tác save/create/delete dùng native alert, làm mất ngữ cảnh.
6. Chưa thấy pagination/virtualization cho course, lesson và knowledge list khi dữ liệu lớn.

### Khuyến nghị

- Thu gọn header thành title + 1 primary CTA.
- Đổi nhãn theo mental model giáo viên:
  - “Môn học”
  - “Khóa học”
  - “Bài học”
  - “Kho kiến thức”
- Nhóm “Assignments” và “Knowledge” dưới Library navigation thay vì biến thành pill lớn trong header.
- Sync course/search/form state vào URL nếu cần deep-link; không cần sync mọi accordion nhỏ.
- Dùng toast + inline validation; chỉ dùng confirm dialog cho destructive action.
- Thêm search, status filter, pagination và “last edited”.

**Evidence:** `src/app/admin/library/page.tsx:376`, `src/app/admin/library/page.tsx:390`, `src/app/admin/library/page.tsx:410`, `src/app/admin/library/page.tsx:453`.

---

## 4.4 Lesson Editor / Session Composer

### Điểm tốt

- Chia 4 bước là quyết định đúng:
  1. Content & Handouts
  2. Assignment Details
  3. Solution Key
  4. Rubric Matrix
- Bước 3–4 được điều kiện hóa theo việc bài học có assignment.
- Có save draft, final save, preview, file parsing, AI rubric và AI answer.
- Có `beforeunload` guard khi nội dung dirty — đây là một điểm UX trưởng thành.
- Có context panel cho course/module/subject.
- Focus-visible được chăm tốt hơn ở nhiều control bên trong editor.

### Vấn đề

1. **Cognitive load rất cao.** Editor render một state manager lớn, nhiều panel và “8 overlays/modals”.
2. Stepper ngang khó dùng trên màn hình hẹp; chưa có overflow strategy rõ.
3. “Session Composer Workspace”, “Syllabus Registry Context”, “AI Rubric Generator”, “pinned chunks” và model selector đẩy thuật ngữ hệ thống vào mặt giáo viên.
4. Nhiều hành động quan trọng kết thúc bằng `alert()`; hook editor có hàng chục alert cho validation, AI, parse, save và error.
5. Chưa thấy autosave thực sự; người dùng phải nhớ Save Draft/Finalize.
6. Các file rất lớn (`LessonEditorModals.tsx` hơn 2.200 dòng; state hook hơn 2.700 dòng) làm tăng nguy cơ trạng thái/interaction không đồng nhất khi mở rộng.
7. CTA cuối “Finalize & Save” chưa nói rõ sẽ chỉ lưu, publish hay khóa chỉnh sửa.

### Khuyến nghị

- Giữ 4 bước nhưng mỗi bước chỉ có một primary task.
- Thay modal bằng inline panel hoặc drawer cho preview, classification và AI suggestion.
- Thêm autosave theo debounce, hiển thị “Đã lưu lúc 14:32”; vẫn giữ Save Draft thủ công.
- Thêm validation summary ở đầu bước và dẫn focus tới field lỗi.
- Dùng copy gần giáo viên hơn:
  - “Soạn bài”
  - “Đề bài”
  - “Đáp án tham khảo”
  - “Tiêu chí chấm”
- Phân biệt rõ “Lưu nháp”, “Xuất bản bài học”, “Cập nhật bài đã xuất bản”.
- Tách state theo domain để giảm bug UI.

**Evidence:** `src/app/admin/library/lesson-editor/page.tsx:152`, `src/app/admin/library/lesson-editor/page.tsx:340`, `src/app/admin/library/lesson-editor/page.tsx:350`, `src/app/admin/library/lesson-editor/page.tsx:372`, `src/app/admin/library/lesson-editor/hooks/useLessonEditorState.ts:869`, `src/app/admin/library/lesson-editor/hooks/useLessonEditorState.ts:935`.

---

## 4.5 Class Manager, scheduling và student whitelist

### Điểm tốt

- Một màn hình gom đúng các việc vận hành lớp:
  - tạo cohort;
  - gán course;
  - tạo lịch mở bài;
  - bulk schedule;
  - whitelist;
  - notice board;
  - analytics.
- Left cohort list + right workspace là pattern phù hợp desktop.
- Tabs Syllabus & Students / Notice Board / Cohort Analytics dễ hiểu hơn nhiều thuật ngữ khác trong app.
- Bulk scheduling là tính năng tiết kiệm thời gian thật.
- Analytics có thông tin hữu ích: submission rate, backlog, grade distribution, concept difficulty và at-risk students.

### Vấn đề

1. Tên “Class Cohort Manager”, “Cohort Workspace”, “LMS Command Center” tiếp tục pha ngôn ngữ kỹ thuật.
2. Tab state không phản ánh vào URL, nên refresh/deep-link quay về tab mặc định.
3. Syllabus và Students đặt chung một tab làm màn hình dài và dày.
4. Analytics mới dừng ở “nhìn thấy”; at-risk card chưa dẫn thẳng tới submission, student history hoặc hành động tiếp theo.
5. Email list chưa có import CSV, select/bulk revoke và trạng thái lỗi theo từng email.
6. Nhiều thao tác dùng alert; lỗi không gắn với field hoặc row.
7. Form và bảng vẫn phụ thuộc desktop shell không responsive.

### Khuyến nghị

- Đổi thành “Quản lý lớp”.
- Tách tabs: Overview / Courses & Schedule / Students / Announcements / Analytics.
- URL sync tab và selected class.
- Cho phép import CSV, báo kết quả theo email: added, duplicate, invalid.
- At-risk list cần CTA “Xem bài nộp” hoặc “Xem tiến độ”.
- Thêm timeline preview theo tuần để giáo viên kiểm tra lịch trước khi publish.
- Hiển thị timezone cạnh release/deadline.

**Evidence:** `src/app/admin/classes/page.tsx:23`, `src/app/admin/classes/page.tsx:48`, `src/app/admin/classes/page.tsx:72`, `src/app/admin/classes/components/AnalyticsWorkspace.tsx:207`.

---

## 4.6 Grading Queue

### Điểm tốt

- Có single và batch AI grading.
- Có chọn model và trạng thái running/success/failed theo submission.
- Queue dùng table hợp ngữ cảnh admin.
- Có link tới Similarity Checker và Manual Evaluation.
- Dữ liệu hiển thị đủ lớp, bài, thời gian, status và student.

### Vấn đề

1. **Không có search, filter, sort hoặc pagination.** Đây là điểm nghẽn lớn nhất khi queue tăng.
2. Tải toàn bộ submission rồi render; large list sẽ giảm hiệu năng và khả năng quét.
3. Select-all áp dụng cho toàn bộ tập đang tải, nhưng UI chưa giải thích scope.
4. Model selector không có label.
5. Checkbox không có accessible label gắn với student/assignment.
6. Batch result và single result dùng native alert.
7. Queue chứa cả graded/submitted nhưng chưa có tab “Needs review / AI running / Draft / Published / Failed”.
8. Ngày giờ dùng locale mặc định của browser, không thống nhất timezone/format.

### Khuyến nghị

- Filter theo status, class, assignment, late/on-time và date range.
- Search theo email/tên học sinh.
- Sort mặc định: failed → overdue → oldest pending.
- Pagination phía server; URL phản ánh filter/page.
- Sticky bulk action bar chỉ xuất hiện khi có selection.
- Mỗi row có accessible checkbox label.
- Dùng toast + progress summary; không dùng alert.

**Evidence:** `src/app/admin/grading/page.tsx:24`, `src/app/admin/grading/page.tsx:52`, `src/app/admin/grading/page.tsx:87`, `src/app/admin/grading/page.tsx:156`, `src/app/admin/grading/page.tsx:196`.

---

## 4.7 Manual Evaluation và AI suggestion dossier

### Điểm tốt

- Split screen student evidence / rubric matrix đúng với mental model chấm bài.
- Có save draft và publish tách biệt.
- Có late penalty, override reason và overall feedback.
- AI suggestion không tự động ghi đè; người dùng chọn criterion để áp dụng.
- Có showcase approval theo yêu cầu của học sinh.

### Vấn đề

1. **Màn “Declassified AI Evaluation Dossier” phá vỡ hoàn toàn light theme và visual language chung.**
2. Copy như “ABORT OPERATION”, “INJECT AI TELEMETRY”, “SECURITY CLASSIFICATION” làm tăng tải nhận thức và che lấp hành động thật.
3. CRT flicker 0.15s chạy vô hạn, không có reduced-motion fallback.
4. Overlay không có `role="dialog"`, `aria-modal`, focus trap hoặc Escape close.
5. Các nút icon/back không có accessible name rõ.
6. “Publish Scores” là hành động có tác động lớn nhưng chưa có review summary/confirmation.
7. Save/publish/showcase dùng native alert; trạng thái thành công không lưu lại trong flow.
8. Header có quá nhiều CTA cạnh nhau, làm primary action không rõ.

### Khuyến nghị

- Thay dossier CRT bằng panel sáng, plain-language:
  - Suggested score
  - Confidence
  - Evidence
  - Apply / Ignore
- Giữ “selective apply” vì đây là pattern tốt.
- Sticky footer: Total score, validation, Save Draft, Publish.
- Publish mở review dialog ngắn: tổng điểm, penalty, số criterion chưa feedback.
- Dialog đạt semantics, focus trap, Escape và reduced motion.
- AI phải ghi rõ nguồn evidence và thời điểm tạo suggestion.

**Evidence:** `src/app/admin/grading/[submissionId]/page.tsx:435`, `src/app/admin/grading/[submissionId]/page.tsx:472`, `src/app/admin/grading/[submissionId]/page.tsx:474`, `src/app/admin/grading/[submissionId]/page.tsx:493`, `src/app/admin/grading/[submissionId]/page.tsx:700`.

---

## 4.8 Projects CMS

### Điểm tốt

- CRUD rõ, có empty/error/loading state.
- Table phù hợp quản trị project.
- Delete đã có confirmation.
- Media và diagram hỗ trợ portfolio phong phú.

### Vấn đề

- Projects CMS đứng ngang cấp với teaching operations nhưng mục tiêu khác.
- Icon-only edit/delete phụ thuộc `title`, chưa có `aria-label`.
- Native alert vẫn được dùng sau delete/error.
- Chưa có search, status, sort hoặc last-updated.
- Create/edit form trộn English và Vietnamese.

### Khuyến nghị

- Nhóm navigation thành:
  - Teaching: Dashboard, Library, Classes, Grading.
  - Showcase: Projects.
- Bổ sung status Draft/Published/Archived, preview và last updated.
- Dùng link/button semantic trực tiếp thay vì `Link > span`.

**Evidence:** `src/app/admin/projects/page.tsx:94`, `src/app/admin/projects/page.tsx:166`, `src/app/admin/projects/page.tsx:172`.

---

## 5. Đánh giá khu vực học sinh

## 5.1 Learning Gateway

### Điểm tốt

- Chỉ yêu cầu 2 field; flow ngắn.
- Có label đúng cho email và class code.
- Email dùng `type="email"` và `autocomplete="email"`.
- Có loading state và lý do session expired.
- Redirect path được giữ lại.

### Vấn đề

1. Copy hoàn toàn bằng English trong khi AI Tutor và một số form dùng Vietnamese.
2. Loading sequence kiểu terminal có 3 dòng kỹ thuật, dài hơn nhu cầu thật.
3. Error message không có `aria-live`.
4. Placeholder dùng “e.g.” thay vì ví dụ ngắn theo locale.
5. Class code chưa có `name`, `spellCheck={false}` và hướng dẫn format rõ.
6. Thiếu “Mã lớp lấy ở đâu?”, privacy note và contact/help.
7. Card glass/gradient vẫn mang dấu vết visual template AI.

### Khuyến nghị

- Chọn một ngôn ngữ chính; nếu phục vụ sinh viên Việt Nam, ưu tiên Vietnamese.
- Loading chỉ cần “Đang xác minh…” và spinner.
- Error inline có `role="alert"` hoặc `aria-live="polite"`.
- Thêm help text: “Mã lớp do giảng viên cung cấp”.
- Giải thích email chỉ dùng để xác minh lớp.

**Evidence:** `src/app/learn/page.tsx:84`, `src/app/learn/page.tsx:91`, `src/app/learn/page.tsx:103`, `src/app/learn/page.tsx:110`, `src/app/learn/page.tsx:124`.

---

## 5.2 Learner shell và navigation

### Điểm tốt

- Navigation chỉ có 3 mục, dễ học.
- Có class identity card.
- Zen Mode có thể ẩn sidebar.
- Logout rõ và tách khỏi main navigation.

### Vấn đề

1. Sidebar `w-64`, sticky, `h-screen`; không có mobile menu.
2. Main content dùng `p-8` ở mọi breakpoint.
3. Active state dùng so sánh tuyệt đối. Khi vào `/assignments/[id]`, mục Assignments không còn active.
4. Zen Mode không phải giải pháp responsive; người dùng mobile không nên tự tìm cách bật Zen để có diện tích.
5. “Cohorts offline” là copy khó hiểu với học sinh.
6. Không có breadcrumb/context trong shell; mỗi page tự xử lý khác nhau.

### Khuyến nghị

- Mobile bottom nav hoặc top app bar; desktop sidebar.
- Dùng `pathname.startsWith(item.href)` cho Assignments/Grades.
- Padding responsive: `p-4 md:p-6 lg:p-8`.
- “Không tải được thông tin lớp” thay cho “Cohorts offline”.
- Giữ class name/code trên mobile header.

**Evidence:** `src/app/learn/[classCode]/layout.tsx:102`, `src/app/learn/[classCode]/layout.tsx:141`, `src/app/learn/[classCode]/layout.tsx:195`.

---

## 5.3 Student Dashboard

### Điểm tốt

- “Continue Learning” là next action mạnh và đúng.
- Có progress theo course.
- Due Soon và Announcements được đặt ở cột phụ hợp lý.
- Empty state cho lớp chưa có course tốt.
- Skeleton bám sát layout thật.
- Certificate chỉ xuất hiện khi đủ điều kiện, không chiếm chỗ vô ích.

### Vấn đề nghiêm trọng

1. **Fallback danh tính:** nếu cookie email chưa có, Dashboard dùng `student@university.edu`. Đây là rủi ro hiển thị sai tiến độ/điểm/chứng chỉ và làm giảm niềm tin.
2. Fetch error chỉ log console; UI sau đó có thể giống “không có dữ liệu”.
3. Điều kiện chứng chỉ ở Dashboard dựa trên hoàn thành toàn bộ lesson + average published grade ≥ 60.
4. Trang Grades lại dựa trên nộp toàn bộ assignment + average grade ≥ 60. Hai nơi có thể báo trạng thái khác nhau.
5. `toLocaleDateString()` không chỉ định locale/timezone.
6. Course card có version badge nhưng chưa giải thích giá trị với học sinh.
7. Chữ mô tả và metadata chủ yếu 9–12px, quá nhỏ cho learner surface.

### Khuyến nghị

- Xóa hoàn toàn fallback email; nếu không có identity, redirect về Gateway với lý do rõ.
- Tách `loading`, `error`, `empty` thành 3 trạng thái.
- Dùng một service/selector duy nhất cho certificate eligibility.
- Dashboard ưu tiên 4 khối:
  1. Continue learning
  2. Due soon
  3. Courses
  4. Announcements/recent grade
- Body text tối thiểu 14px; metadata tối thiểu 12px.

**Evidence:** `src/app/learn/[classCode]/dashboard/page.tsx:58`, `src/app/learn/[classCode]/dashboard/page.tsx:163`, `src/app/learn/[classCode]/dashboard/page.tsx:170`, `src/app/learn/[classCode]/grades/page.tsx:107`.

---

## 5.4 Course Roadmap

### Điểm tốt

- Module accordion + lesson timeline phù hợp cách người học hiểu chương trình.
- Có active lesson, completed, locked và assignment CTA.
- Mặc định collapse module đã hoàn thành; expand module đang học là một quyết định tốt.
- Có progress tổng course.
- Có đường quay lại Dashboard.

### Vấn đề

1. Lesson không có schedule mặc định bị khóa. Nếu giáo viên quên tạo schedule, học sinh chỉ thấy bài bị khóa mà không biết vì sao.
2. Load failure bị hiển thị giống syllabus rỗng.
3. Unlock chỉ hiển thị ngày, không có giờ/timezone.
4. CTA dùng `router.push()` trong button thay vì Link, mất khả năng open-in-new-tab.
5. Status phụ thuộc màu và icon khá nhiều.
6. Text metadata 9–10px.

### Khuyến nghị

- Quy ước rõ: “không có schedule” là draft/admin error hay mở ngay; không để im lặng khóa.
- Error state có Retry.
- Hiển thị `dd/MM/yyyy HH:mm (GMT+7)`.
- Dùng Link cho navigation.
- Status text rõ: “Đã hoàn thành”, “Mở từ…”, “Đang học”.

**Evidence:** `src/app/learn/[classCode]/courses/[courseSlug]/roadmap/page.tsx:144`, `src/app/learn/[classCode]/courses/[courseSlug]/roadmap/page.tsx:378`, `src/app/learn/[classCode]/courses/[courseSlug]/roadmap/page.tsx:389`, `src/app/learn/[classCode]/courses/[courseSlug]/roadmap/page.tsx:407`.

---

## 5.5 Lesson Workspace và document viewers

### Điểm tốt

- Đây là phần trải nghiệm có lợi thế cạnh tranh:
  - PDF;
  - DOCX;
  - CSV/XLSX preview;
  - JSON/code/notebook;
  - stacked/split mode;
  - Zen Mode;
  - discussion;
  - complete lesson;
  - assignment links.
- Split view lý tưởng cho bài học có hướng dẫn + file thực hành.
- Signed URL và download permission được tôn trọng.
- Reading time và lesson progress context là ý tưởng tốt.
- Viewer có zoom, page navigation, fullscreen và sidebar thumbnail.

### Vấn đề

1. **Progress/next lesson hiện khó hoạt động đúng:** page query chỉ lấy `modules(title, courses(title))`, nhưng workspace lại đọc `lessonData.modules?.lessons`.
2. Split view cố định cao 680px, chưa tối ưu theo viewport mobile/laptop nhỏ.
3. Divider là `div` chỉ có `onMouseDown`; không keyboard, không touch/pointer hoàn chỉnh, không ARIA.
4. Nút back icon thiếu accessible label.
5. Mode Default/Split không lưu vào URL hoặc preference.
6. Modal preview thiếu dialog semantics, focus trap và Escape.
7. Chữ control 8–10px xuất hiện dày.
8. Celebration/confetti không tôn trọng reduced motion.
9. “Legacy default” trong comment cho thấy two-mode UX chưa được thống nhất.

### Khuyến nghị

- Sửa data contract cho module lessons hoặc bỏ progress context giả.
- Split view chỉ bật từ breakpoint lớn; mobile luôn stacked.
- Divider dùng pointer events + keyboard arrows + `role="separator"` + `aria-valuenow`.
- Viewer modal đạt dialog semantics.
- Persist view preference vào localStorage; không nhất thiết đưa vào URL nếu chỉ là preference.
- Lesson body dùng 15–17px, line-height 1.6–1.75 và max line length khoảng 65–75 ký tự.

**Evidence:** `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/page.tsx:70`, `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/LessonViewWorkspace.tsx:76`, `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/LessonViewWorkspace.tsx:238`, `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/LessonViewWorkspace.tsx:257`.

---

## 5.6 AI Tutor và Discussion

### Điểm tốt

- Tutor gắn với class + lesson, đúng hướng contextual assistant.
- Drawer không cản nội dung khi đóng.
- Có loading và network error message.
- Zen Mode tự đóng AI Tutor để giảm xao nhãng.
- Discussion có comment/reply/delete, tạo kênh học tập cộng tác.

### Vấn đề

1. Drawer không có dialog semantics, focus trap, Escape close.
2. Backdrop là `div onClick`.
3. Nút Close và Send icon-only thiếu `aria-label`.
4. Input không có label/name/autocomplete.
5. Message update không có `aria-live`.
6. AI trả lời chưa hiển thị citation tới lesson/material/rubric.
7. Không có scope statement: AI có thể trả lời gì, dữ liệu nào được gửi, khi nào nên hỏi giáo viên.
8. Conversation không persist khi reload.
9. English UI + Vietnamese content trong cùng drawer.
10. Discussion vẫn dùng `alert()` cho auth, submit và delete error.

### Khuyến nghị

- Drawer là `dialog` hoặc `complementary` có focus management.
- Thêm “Nguồn tham khảo” cho mỗi câu trả lời.
- Có disclaimer ngắn: “AI có thể sai; kiểm tra lại tài liệu”.
- Persist history theo lesson/session.
- Empty state có prompt mẫu.
- Discussion dùng inline error/toast và optimistic state có rollback.

**Evidence:** `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/AITutorDrawer.tsx:101`, `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/AITutorDrawer.tsx:113`, `src/app/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]/components/AITutorDrawer.tsx:182`, `src/components/LessonDiscussion.tsx:112`.

---

## 5.7 Assignments list và submission workspace

### Điểm tốt

- Assignment list phân biệt Not Submitted / Pending / Graded.
- Có deadline urgency và direct CTA.
- Detail page có countdown, instructions, preview, questions, upload và grading state.
- Submission success hiển thị timestamp và file đã nộp.
- Có file limit, total size limit và rollback logic ở tầng action/hook.
- Showcase consent dùng checkbox có label.

### Vấn đề

1. Assignment list dùng button + `router.push`; nên là Link.
2. Back ở assignment detail quay về Dashboard thay vì Assignments list.
3. “Finalize Submission” chưa có review/confirmation dù sau submit UI khóa form khi đã có submission.
4. Không thấy chính sách resubmit hoặc edit before deadline.
5. Upload surface nói “Choose deliverables”; trải nghiệm chưa phải drag-and-drop hoàn chỉnh dù tài liệu mô tả như vậy.
6. Không hiển thị file size, tổng size, upload progress hoặc lỗi theo file.
7. Remove-file icon button thiếu accessible label.
8. Error chưa có `aria-live`.
9. Date/time vẫn dựa locale mặc định.
10. Một số copy trộn Vietnamese và English.

### Khuyến nghị

- Back về `/assignments`; thêm breadcrumb lesson nếu cần.
- Trước submit hiển thị review:
  - số file;
  - tổng dung lượng;
  - câu hỏi chưa trả lời;
  - deadline;
  - chính sách resubmit.
- Nếu không cho resubmit, nói rõ trước khi submit.
- Upload có drag/drop thật, progress và lỗi riêng từng file.
- Dùng Link cho navigation.

**Evidence:** `src/app/learn/[classCode]/assignments/page.tsx:207`, `src/app/learn/[classCode]/assignments/[assignmentId]/page.tsx:86`, `src/app/learn/[classCode]/assignments/[assignmentId]/components/SubmissionPanel.tsx:153`, `src/app/learn/[classCode]/assignments/[assignmentId]/components/SubmissionPanel.tsx:212`.

---

## 5.8 Grades và Certificate

### Điểm tốt

- Summary card cho average, completion và certificate.
- Grade table có status, due date, score và feedback expansion.
- Rubric breakdown giúp học sinh biết mình cần cải thiện ở đâu.
- Empty state rõ.

### Vấn đề

1. Certificate eligibility mâu thuẫn với Dashboard.
2. Table dễ gây horizontal scroll trên mobile.
3. Nhiều text 9–10px.
4. “LOCKED/UNLOCKED”, `>= 60% avg` mang giọng hệ thống hơn giọng học tập.
5. Chưa giải thích điểm là điểm thô, điểm sau penalty hay điểm đã publish.
6. Feedback quote dùng dấu ngoặc thẳng và layout card dày.
7. Không có filter theo course/status và không có “recently published”.

### Khuyến nghị

- Một nguồn logic duy nhất cho certificate.
- Mobile chuyển table thành list card có progressive disclosure.
- Copy: “Đủ điều kiện nhận chứng chỉ” / “Còn 2 bài cần hoàn thành”.
- Hiển thị publish time, late deduction và final score breakdown.
- Đưa “Điều cần cải thiện tiếp theo” lên trước rubric detail nếu có thể tổng hợp.

**Evidence:** `src/app/learn/[classCode]/grades/page.tsx:107`, `src/app/learn/[classCode]/grades/page.tsx:184`, `src/app/learn/[classCode]/grades/page.tsx:293`.

---

## 6. Đánh giá xuyên suốt hệ thống

## 6.1 Visual system

### Điểm tốt

- Repo đã chủ động giữ light theme bằng inverted slate palette.
- Geist phù hợp sản phẩm data/education.
- Border, rounded, spacing và blue accent nhìn chung thống nhất.
- Skeleton và empty state có ngôn ngữ hình ảnh tương đối đồng bộ.

### Vấn đề

- Invert toàn bộ `slate-950 → white`, `slate-100 → dark` tạo semantic debt lớn. Developer đọc class như dark theme nhưng kết quả lại light.
- CSS phải override `text-white` theo thẻ và `.light/.dark`, làm hệ thống dễ có ngoại lệ.
- Nhiều accent cyan/blue/indigo/violet/purple/amber/orange cùng xuất hiện.
- Gradient, glow, glass, double-bezel, pill và CRT cùng cạnh tranh.
- Uniform rounded card được dùng gần như mọi nơi; hierarchy dựa vào “card trong card”.
- Admin và learner dùng nhiều chữ 8–11px; route tree hiện có khoảng 498 lần dùng các cỡ này.

### Hướng chuẩn hóa

- Dần chuyển sang semantic token:
  - `bg-page`
  - `bg-surface`
  - `bg-subtle`
  - `text-primary`
  - `text-secondary`
  - `border-default`
  - `accent-primary`
- Không cần migration một lần; làm theo từng surface.
- Blue là accent chính; green/amber/red chỉ dùng cho status.
- Admin giảm gradient/glow; learner có thể giữ một lượng nhỏ ambient color.
- Cỡ chữ:
  - body learner: 14–16px;
  - body admin: 13–14px;
  - metadata: không dưới 12px;
  - 10px chỉ dùng cho trường hợp rất hạn chế.

**Evidence:** `tailwind.config.ts:14`, `src/app/globals.css:292`.

---

## 6.2 Accessibility

### Các vấn đề chính

- Không có skip link.
- Không tìm thấy `prefers-reduced-motion` hoặc `motion-reduce`.
- Không tìm thấy dialog semantics/focus management trong các overlay chính.
- `aria-live` gần như vắng mặt.
- Icon-only button thường chỉ có `title` hoặc không có accessible name.
- Nhiều form control không có `name`, `autocomplete` hoặc label liên kết.
- Split divider chỉ dùng mouse.
- Drag/drop UI chưa có keyboard equivalent.
- Native table chưa có caption, `scope` và mobile alternative.
- `transition-all` xuất hiện khoảng 201 lần trong route tree, trái với hướng tối ưu animation property cụ thể.

### Mục tiêu tối thiểu

- 100% interactive element dùng keyboard được.
- Focus visible rõ và không bị trap ngoài ý muốn.
- Dialog có title, description, focus trap, Escape và restore focus.
- Async error/success dùng `aria-live`.
- Icon button có `aria-label`.
- Tôn trọng reduced motion.
- Mọi form control có label, name, type/inputmode/autocomplete phù hợp.
- Contrast đạt WCAG AA.

---

## 6.3 Content design và ngôn ngữ

Hiện tại có ít nhất 3 giọng:

1. Education/professional: Course, Lesson, Assignment, Grade.
2. System operator: Operator, Terminal, Command Center, Telemetry.
3. Vietnamese learner copy.

Điều này làm người dùng phải “dịch” giao diện trong đầu.

### Đề xuất

- Chọn Vietnamese làm ngôn ngữ chính nếu user base chính là sinh viên Việt Nam.
- Giữ thuật ngữ tiếng Anh trong ngoặc khi cần chuyên môn, không dùng như nhãn UI chính.
- Không dùng:
  - Operator
  - Command Center
  - Declassified Dossier
  - Inject Telemetry
  - Abort Operation
- Dùng:
  - Giáo viên
  - Quản lý lớp
  - Gợi ý chấm từ AI
  - Áp dụng gợi ý
  - Hủy

---

## 6.4 Feedback, error và trust

### Điểm tốt

- Nhiều màn có skeleton.
- Empty state thường có copy và icon.
- Submission/polling/grading có trạng thái.

### Vấn đề

- Admin route tree có khoảng 120 lời gọi `alert()`.
- Lỗi tải dữ liệu thường chỉ `console.error`, sau đó UI chuyển sang empty state.
- Hard-coded “Live & Secure”, profile và system information làm giảm trust.
- “AI success” được báo bằng alert nhưng thiếu log/trạng thái lâu dài.
- Date/time không nhất quán locale/timezone.
- Không có global error boundary UX rõ cho admin/learner.

### Hướng sửa

- Toast cho success ngắn.
- Inline error cho form/row.
- Error page/panel có Retry cho fetch failure.
- Audit/status history cho AI grading và publish.
- Dùng `Intl.DateTimeFormat('vi-VN', { ... })` với timezone rõ.
- Không tuyên bố status nếu không có health signal thật.

---

## 6.5 Hiệu năng cảm nhận và khả năng mở rộng

### Điểm tốt

- Dashboard fetch song song.
- Skeleton giúp giảm cảm giác chờ.
- Page/component đã được tách ở nhiều module.

### Rủi ro

- Nhiều page vẫn là client component và fetch trực tiếp từ Supabase.
- Grading/table/list tải toàn bộ dữ liệu, không pagination.
- Refined Knowledge, Lesson Editor Modal và state hook rất lớn.
- Motion/glow/blur/transition-all dày đặc.
- Large lists chưa có virtualization/content-visibility.
- Nhiều modal render từ một state tree lớn tăng khả năng re-render và bug focus.

### Khuyến nghị

- Server pagination/filter cho queue và catalog.
- RSC/server data fetch cho page shell khi phù hợp.
- Lazy-load viewer nặng và editor step chưa mở.
- Tách state theo feature.
- Dùng animation chỉ cho transform/opacity.

---

## 7. Danh sách vấn đề ưu tiên

## P0 — Ảnh hưởng trust, dữ liệu hoặc core journey

| ID | Vấn đề | Tác động | Hướng xử lý |
|---|---|---|---|
| P0-01 | Dashboard dùng fallback `student@university.edu` | Có thể đọc/ghi progress, grade, certificate sai danh tính | Không có identity thì redirect về Gateway |
| P0-02 | Điều kiện certificate khác nhau giữa Dashboard và Grades | Hai màn báo kết quả trái nhau | Một domain service/SQL view duy nhất |
| P0-03 | Fetch failure bị biến thành empty state | Người dùng tưởng “không có dữ liệu” | Tách loading/error/empty, có Retry |
| P0-04 | CTA Create Course không thực thi `action=new` | Quick action không đúng lời hứa | Đọc param và mở form, hoặc đổi CTA |
| P0-05 | Lesson progress/next lesson đọc data không được query | Feature hiển thị không ổn định | Sửa select contract hoặc bỏ UI phụ thuộc |

## P1 — Ảnh hưởng mạnh đến sử dụng hằng ngày

| ID | Vấn đề | Tác động | Hướng xử lý |
|---|---|---|---|
| P1-01 | Admin/learner shell không responsive | Gần như không dùng được trên mobile nhỏ | Mobile nav + responsive padding |
| P1-02 | Accessibility baseline chưa đạt | Keyboard/screen reader khó dùng | Dialog, labels, focus, live region, reduced motion |
| P1-03 | Grading Queue thiếu search/filter/pagination | Chậm khi số bài tăng | Server query + URL filters |
| P1-04 | Native alert quá nhiều | Mất ngữ cảnh, cản workflow | Toast + inline validation + confirm dialog |
| P1-05 | Lesson Editor quá nhiều modal/thuật ngữ | Tải nhận thức cao | Progressive disclosure, inline panels, plain copy |
| P1-06 | Assignment submit thiếu review/resubmit policy | Học sinh dễ nộp nhầm | Confirmation summary + policy rõ |
| P1-07 | Active nav learner sai ở route con | Mất orientation | `startsWith` hoặc route segments |
| P1-08 | AI Tutor thiếu citation và trust layer | Khó kiểm chứng câu trả lời | Evidence/source, scope, disclaimer |
| P1-09 | Date/time không có timezone/locale thống nhất | Deadline/release có thể bị hiểu sai | Central date formatter |

## P2 — Chuẩn hóa, polish và scale

| ID | Vấn đề | Hướng xử lý |
|---|---|---|
| P2-01 | Visual language phân mảnh | Một light design system, bỏ CRT/AI gradient ở admin |
| P2-02 | Inverted slate token gây semantic debt | Migration dần sang semantic token |
| P2-03 | Chữ 8–11px dùng quá nhiều | Thiết lập minimum type scale |
| P2-04 | Public footer/scroll control rò vào app | Route-aware app shell |
| P2-05 | Projects không được nhóm riêng | Teaching vs Showcase navigation group |
| P2-06 | Large list chưa virtualization/content visibility | Pagination trước, virtualization khi cần |
| P2-07 | Không có notification center | Gom announcement, due date, published grade |

---

## 8. Roadmap đề xuất

## Giai đoạn 1 — Trust và responsive foundation

**Mục tiêu:** Không hiển thị sai danh tính/trạng thái; dùng được trên mobile; lỗi được nói thật.

- Xóa student identity fallback.
- Hợp nhất certificate rule.
- Thêm error state + Retry cho Dashboard/Roadmap/Grades/Assignments/Admin lists.
- Sửa Create Course action.
- Sửa lesson progress data contract.
- Làm responsive admin/learner shell.
- Tách public footer khỏi app surface.
- Centralize date/time formatter.

**Kết quả mong đợi:** Core journey đáng tin và không “gãy” ở màn hình nhỏ.

## Giai đoạn 2 — Accessibility và workflow feedback

**Mục tiêu:** Keyboard dùng được, trạng thái không làm người dùng mất ngữ cảnh.

- Skip link, focus-visible baseline.
- Dialog semantics/focus trap/Escape.
- `aria-live` cho error, AI, upload, grading.
- Accessible icon buttons và form labels.
- Reduced motion.
- Thay native alert bằng toast/inline feedback.
- Submission review trước finalize.

**Kết quả mong đợi:** Đạt baseline WCAG 2.2 AA cho các flow chính.

## Giai đoạn 3 — Teacher efficiency

**Mục tiêu:** Giáo viên hoàn thành tác vụ nhanh hơn thay vì chỉ có nhiều feature hơn.

- Grading filters/search/pagination.
- Dashboard “Việc cần làm hôm nay”.
- At-risk insight có CTA.
- Lesson Editor autosave + validation summary.
- Giảm modal; đơn giản hóa terminology.
- Class tabs và URL state.

**Kết quả mong đợi:** Ít click hơn, ít gián đoạn hơn, dễ phục hồi công việc hơn.

## Giai đoạn 4 — Student learning quality

**Mục tiêu:** Mỗi màn đều trả lời “em nên làm gì tiếp theo?”.

- Mobile learner navigation.
- Continue learning/deadline/announcement/recent grade hierarchy.
- Roadmap lock reason rõ.
- Lesson reading typography.
- AI Tutor citations/history.
- Grades mobile list và actionable feedback.
- Notification center nhẹ.

## Giai đoạn 5 — Visual system hardening

**Mục tiêu:** Một hệ thống sáng, nhất quán, không còn cảm giác ghép nhiều demo.

- Semantic colors.
- One-accent rule.
- Minimum type scale.
- Giảm card nesting, gradient, glow và pill.
- Thay CRT dossier bằng AI suggestion panel.
- Chuẩn hóa Vietnamese/English.

---

## 9. Quick wins có thể làm trước

1. Đổi learner active nav từ equality sang nested route matching.
2. Đổi assignment detail back link về Assignments.
3. Xóa copy “Operator”, “Terminal”, “Command Center”.
4. Bỏ hard-coded “Live & Secure”.
5. Sửa `action=new` ở Library.
6. Xóa fallback student email.
7. Dùng một helper cho ngày giờ.
8. Thêm `aria-label` cho icon buttons ở back/close/delete/send.
9. Thêm `aria-live` cho login error và upload/grading status.
10. Đổi `p-8` thành responsive padding.
11. Chặn split view trên mobile.
12. Thêm confirm/review trước Finalize Submission và Publish Scores.

---

## 10. Tiêu chí nghiệm thu đề xuất

### Responsive

- Không có page-level horizontal scrollbar ở 360px, 768px, 1280px.
- Mobile có cách mở/đóng navigation rõ.
- Sidebar không chiếm phần lớn viewport ở mobile.
- Table quan trọng có mobile presentation hoặc controlled horizontal scroll.

### Accessibility

- 100% action dùng keyboard được.
- Mọi icon-only button có accessible name.
- Mọi dialog trap focus, đóng bằng Escape và restore focus.
- Async success/error được screen reader thông báo.
- `prefers-reduced-motion` được tôn trọng.
- Mọi input/select/textarea có label và name phù hợp.

### Trust

- Không có fake identity fallback.
- Không có hard-coded health/security assertion.
- Error không bao giờ hiển thị như empty state.
- Certificate eligibility chỉ có một nguồn logic.
- Deadline/release hiển thị locale và timezone nhất quán.

### Teacher efficiency

- Tìm một submission cần chấm trong dưới 10 giây với search/filter.
- Từ Dashboard tới submission cần xử lý không quá 2–3 click.
- Create Course quick action mở đúng form.
- Lesson Editor hiển thị trạng thái saved/unsaved rõ.
- Không còn native alert trong các flow create/save/grade chính.

### Student journey

- Mỗi page có back/context navigation đúng.
- Dashboard luôn có next action hoặc empty guidance.
- Submit flow cho biết rõ file, deadline và resubmit policy trước khi xác nhận.
- Grade feedback đọc được trên mobile.
- AI Tutor có source/citation hoặc nói rõ không tìm thấy nguồn.

---

## 11. Những điều không nên làm ở vòng redesign tiếp theo

- Không thêm dashboard card chỉ để “trông đầy”.
- Không áp dụng cinematic animation hoặc GSAP cho admin CRUD.
- Không biến toàn bộ hệ thống thành terminal/brutalist UI.
- Không đổi framework hoặc thêm design dependency khi chưa cần.
- Không redesign toàn bộ một lần; ưu tiên shell, trust và core journey trước.
- Không tiếp tục giảm font để nhét thêm thông tin.
- Không dùng AI copy/gradient để thay thế hierarchy.

---

## 12. Kết luận

Teaching OS đang ở vị trí khá tốt: **feature architecture đã đi trước UX hardening**. Đây là tình trạng dễ sửa hơn chiều ngược lại. Sản phẩm không cần thêm một làn sóng tính năng lớn; nó cần một vòng làm chắc:

1. nói thật về trạng thái;
2. bảo đảm danh tính và logic nhất quán;
3. dùng được trên mobile;
4. giảm gián đoạn trong workflow giáo viên;
5. làm lesson/assignment/grade dễ đọc hơn;
6. đưa accessibility thành tiêu chuẩn nền;
7. gom toàn bộ visual language về một Teaching OS sáng, điềm tĩnh và rõ ràng.

Nếu hoàn thành P0 và P1, điểm tổng hợp có thể tăng từ khoảng **6.3/10 lên 8/10** mà không cần thêm module lớn nào. Giá trị lớn nhất sẽ không nằm ở “giao diện đẹp hơn”, mà ở cảm giác: **giáo viên kiểm soát được lớp học, học sinh luôn biết bước tiếp theo, và cả hai đều tin điều hệ thống đang hiển thị.**

---

## Phụ lục A — Chỉ báo tĩnh

Các số sau là grep/static count mang tính định hướng, không phải kết luận WCAG tự động:

| Chỉ báo trong `src/app/admin` + `src/app/learn` | Số lượng |
|---|---:|
| File TypeScript/TSX | 75 |
| `alert()` | 121 |
| `transition-all` | 201 |
| `text-[8px]` đến `text-[11px]` | 498 |
| `aria-label` | 9 |
| `toLocaleDateString/TimeString/String` | 15 |
| Motion elements | 19 |

Ý nghĩa:

- `alert()` cao cho thấy feedback còn gián đoạn.
- Tiny text cao cho thấy readability risk.
- `aria-label` thấp so với số icon button/control cho thấy accessibility debt.
- `transition-all` cao cho thấy animation chưa được giới hạn property.
- Date/time phân tán cho thấy nên centralize formatter.

## Phụ lục B — Trạng thái xác minh

- [x] Đọc source hiện hành của admin và learner.
- [x] Đối chiếu route, state, Tailwind và data flow chính.
- [x] Đối chiếu Web Interface Guidelines.
- [x] Chạy `npx tsc --noEmit` thành công.
- [x] Không chạy Playwright/E2E theo quy định dự án.
- [ ] Chưa hoàn tất screenshot/pixel QA vì dev server local không trả response.
- [ ] Chưa thực hiện usability test với giáo viên/học sinh thật.
- [ ] Chưa đo contrast tự động hoặc screen-reader session.

