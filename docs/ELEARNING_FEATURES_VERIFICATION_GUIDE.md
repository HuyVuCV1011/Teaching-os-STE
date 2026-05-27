# 🎓 E-Learning Suite: Features & Verification Guide (UAT Manual)

This document is a comprehensive **User Acceptance Testing (UAT) manual** for the **Teaching OS (STE)** e-learning system. Follow these step-by-step scenarios to verify each feature, user experience flow, security boundary, and data integrity system.

---

## 🗺️ System Map & Roles

| Role | Access Level | Primary Interfaces | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Learner** | Class Code Authenticated | `/learn` & `/learn/[classCode]/*` | View lectures, review grades, upload assignment deliverables |
| **Admin** | Supabase Role Authenticated | `/admin` & `/admin/*` | Manage courses, configure cohorts/schedules, grade submissions |

---

## 🔑 Phase 1: Student Security & Learning Portal

### 1. Secure Class-Code Gateway
*   **Path**: `/learn`
*   **Goal**: Restrict cohort content to whitelisted students. Access is verified on the server side and stored in an HTTP-Only cookie, preventing email spoofing or unauthorized queries.
*   **Test Scenarios**:
    1.  **Unauthorized Direct Link Interception**:
        *   Navigate directly to `/learn/DATA-2026/dashboard` in a fresh browser session (or incognito window).
        *   *Expected Result*: Next.js Middleware intercepts the request, blocks access, and redirects you back to `/learn` with a `session_expired` query parameter.
    2.  **Valid Portal Sign-in**:
        *   Input a whitelisted student email (e.g. `student@domain.com` mapped in database) and a valid class code (e.g., `DATA-2026`). Click **Verify Access**.
        *   *Expected Result*: The backend returns a signed JWT cookie named `class_session_DATA-2026`. The client redirects you to `/learn/DATA-2026/dashboard` where you can view class content.
    3.  **Invalid Access Rejection**:
        *   Input an unwhitelisted email or an incorrect class code and submit.
        *   *Expected Result*: Access is denied, displaying a clear validation error message, and no session cookie is created.

---

### 2. Interactive Learning Roadmap (React Flow Nodes)
*   **Path**: `/learn/[classCode]/dashboard`
*   **Goal**: Render an interactive layout of modules and lessons, locking content until its visible date and offering direct action paths.
*   **Test Scenarios**:
    1.  **Dynamic Lesson Lock Check**:
        *   View the roadmap. Check lessons with future release dates (`visible_after` in the future or null).
        *   *Expected Result*: The nodes appear in grey with lock icons and are not clickable.
    2.  **Active Lesson Unlock Check**:
        *   Check lessons with past release dates (`visible_after` in the past).
        *   *Expected Result*: Nodes render in full color, showing active status and lesson titles. Clicking them routes you directly to the lesson content.
    3.  **Direct "Submit Task" Shortcut Button**:
        *   Look at unlocked lesson nodes that have assignments linked to them.
        *   *Expected Result*: The node displays an inline **Submit Task** CTA button. Clicking this button redirects you straight to the submission workspace (`/learn/[classCode]/assignments/[assignmentId]`), bypassing manual navigation.

---

### 3. Interactive Multi-Format Lesson Viewer
*   **Path**: `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`
*   **Goal**: Present learning materials in specialized readers while preserving secure database storage paths.
*   **Test Scenarios**:
    1.  **Tiptap Rich Content**:
        *   Verify that the main column displays the lesson outline with formatting (headers, bullet points, blockquotes).
    2.  **Accessible PDF Document Viewer**:
        *   Load a lesson containing a PDF guide.
        *   *Expected Result*: The PDF renders in the custom reader. You can now select, highlight, and copy text natively (text and annotation layers are enabled), and you can use standard browser keyboard combinations. The document remains secure via signed URL tokens.
    3.  **Word Document (DOCX) Reading View**:
        *   Load a lesson with a DOCX attachment.
        *   *Expected Result*: The file is parsed and displayed as a clean HTML document matching the light theme.
    4.  **Spreadsheet (CSV/XLSX) Grid Preview**:
        *   Load a lesson with a spreadsheet (CSV/Excel) file.
        *   *Expected Result*: The screen displays an interactive data grid containing the first 15 rows of the spreadsheet, avoiding the download of huge datasets while showing sample values.
    5.  **Private Signed Downloads**:
        *   Click the **Download Reference File** link.
        *   *Expected Result*: The link uses a secure, short-lived signed URL to pull the file directly from the private bucket, preventing exposure of raw storage paths.

---

### 4. Progress Tracking & Discussion Forums
*   **Path**: `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`
*   **Goal**: Track learner progress and enable context-rich class discussions.
*   **Test Scenarios**:
    1.  **Lesson Progress Tracking**:
        *   Click the **Mark as Completed** button at the bottom of the lesson.
        *   *Expected Result*: The button updates to a green checkmark state. Refresh the dashboard roadmap, and verify the corresponding lesson node displays a green completed checkmark.
    2.  **Discussion Posting**:
        *   Type a question in the lesson comments input field and submit.
        *   *Expected Result*: The comment appears instantly in the discussion feed.
    3.  **Instructor Badge Identification**:
        *   Log in as an instructor/admin and post a response on the discussion board.
        *   *Expected Result*: The admin comment displays a distinct high-visibility **Instructor** badge next to the username.

---

### 5. Secure Deliverables Submission Terminal
*   **Path**: `/learn/[classCode]/assignments/[assignmentId]`
*   **Goal**: Submit deliverables while enforcing size/file count restrictions, reusing duplicate assets, and handling upload failures gracefully.
*   **Test Scenarios**:
    1.  **Upload Limit Validation (File Count)**:
        *   Attempt to upload more files than the assignment's `max_files` limit (e.g., uploading 4 files when the limit is 3).
        *   *Expected Result*: The interface blocks the upload, showing a warning message. The server action enforces this rule as well.
    2.  **Upload Limit Validation (Total Size)**:
        *   Attempt to upload files whose aggregate size exceeds `max_total_size_mb`.
        *   *Expected Result*: The upload is rejected with a message showing the maximum size capacity.
    3.  **Deduplication (SHA-256 Hash Comparison)**:
        *   Upload a file that was previously uploaded by yourself or another user.
        *   *Expected Result*: The client calculates the file's SHA-256 hash. The server detects that the file hash exists in database metadata, skips physical storage writing, and references the existing storage URL, saving bucket space.
    4.  **Database Write Failure Rollback**:
        *   Simulate a database failure during insertion (e.g. upload a file and trigger a database constraint violation).
        *   *Expected Result*: The server action catches the database insertion error, executes a rollback routine, and deletes the uploaded file from the `student-submissions` storage bucket, avoiding orphan files.
    5.  **AI Grading Job Queue**:
        *   Submit a valid set of files.
        *   *Expected Result*: The page displays a polling state: *"Waiting in grading queue..."*. An AI evaluation job is registered in `grading_runs` to be picked up by the RubriCore engine.

---

### 6. Secure Student Gradebook Dashboard
*   **Path**: `/learn/[classCode]/grades`
*   **Goal**: Provide students with a centralized panel displaying all task marks and comments without letting them query other cohorts.
*   **Test Scenarios**:
    1.  **Dashboard Load**:
        *   Access the grades page while logged in as a verified student.
        *   *Expected Result*: The page renders a list of all course assignments, submission dates, evaluation status (Pending / Graded), overall scores, and rubric score breakdowns.
    2.  **Email Parameter Spoofing Block**:
        *   Open the browser's developer tools and attempt to alter the student email parameters or session tokens to match another student's email.
        *   *Expected Result*: The grades page verifies the session via the HTTP-Only cookie and ignores client-side parameter injections, displaying only the grades that match the authenticated email.

---

## 🛠️ Phase 2: Admin CMS, Class Operations & Grading

### 7. Lesson Assignments Inline Editor
*   **Path**: `/admin/library/lesson-editor`
*   **Goal**: Configure, edit, and link deliverables directly in the lesson view.
*   **Test Scenarios**:
    1.  **Assignment Panel Management**:
        *   Open the Lesson Editor and select a lesson.
        *   *Expected Result*: The right-hand column renders the **Lesson Assignments** management panel showing all linked tasks.
    2.  **Inline Task Creation & Linkage**:
        *   Click **Add Assignment**. Fill out the form: set Title, Guidelines, Max Score, Max Files, Max Total Size, Grace Hours, Late Penalty (% per day), and select a Rubric. Save the task.
        *   *Expected Result*: The assignment is created, a static rubric snapshot is captured, and the task list updates.
    3.  **Materials Upload Rollback**:
        *   In the Materials section of the Lesson Editor, attempt to upload a reference document, but trigger a database registration failure.
        *   *Expected Result*: The system uploads the file to `teaching-materials` bucket, catches the database insertion failure, deletes the newly uploaded file from storage, and alerts you of the failure.

---

### 8. Class Cohorts & Schedule Controller
*   **Path**: `/admin/classes`
*   **Goal**: Deploy syllabus roadmaps and manage cohort access dates.
*   **Test Scenarios**:
    1.  **Class Code Generation**:
        *   Create a class cohort, assign it to a syllabus course, and set it to `running`.
        *   *Expected Result*: A unique class access code is generated to gate student entry.
    2.  **Schedules Visibility Dates**:
        *   Map lessons to visibility dates (`visible_after`) and deadlines (`due_date`).
        *   *Expected Result*: Confirm that student roadmap nodes automatically lock/unlock and reflect the specified schedule timestamps.

---

### 9. Grading Terminal & Rubric Snapshots
*   **Path**: `/admin/grading` and `/admin/grading/[submissionId]`
*   **Goal**: Evaluate student files against frozen rubric snapshots, apply late penalties, and release scores.
*   **Test Scenarios**:
    1.  **Rubric Snapshot Drift Prevention**:
        *   Go to the Rubrics CMS and edit a criteria name or point weight for an active rubric template.
        *   Open the grading page (`/admin/grading/[submissionId]`) for a student submission that was submitted before your changes.
        *   *Expected Result*: The grading page loads the criteria values from the frozen `rubric_snapshots` table rather than the live rubric template, ensuring older submissions are not affected by template updates.
    2.  **AI Suggested Scores Comparison**:
        *   Open the grading page.
        *   *Expected Result*: The grading panel displays the AI suggested scores, feedback, and confidence levels generated by the RubriCore engine next to the manual scoring inputs.
    3.  **Late Submission Penalty Calculation**:
        *   Review a submission that was uploaded after the scheduled due date.
        *   *Expected Result*: The system calculates the penalty:
            *   If within `grace_period_hours`, it highlights: *Within grace period. No penalty.*
            *   If past the grace period, it calculates: *`Days Overdue * Penalty Percent Per Day`*, showing a recommended deduction (e.g. -10%).
            *   Admins can check/uncheck **Enforce late penalty deduction** to apply or waive the deduction.
    4.  **Manual Override & Reason Log**:
        *   Manually change a score to differ from the AI suggestion.
        *   *Expected Result*: The interface highlights the change and requires the grader to fill out an **Override Reason** field. If this field is empty, submission is blocked.
    5.  **Grade Release & Publication**:
        *   Click **Publish Scores** on the grading page.
        *   *Expected Result*: The submission status changes to `graded`. Log in as the student and check `/learn/[classCode]/grades`; the marks and criteria feedback are now unlocked and visible.
