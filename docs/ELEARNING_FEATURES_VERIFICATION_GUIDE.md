# 🎓 E-Learning Suite: Features & Verification Guide

This document acts as a User Acceptance Testing (UAT) manual for the **Teaching OS (STE)** e-learning system. Use this guide to step through and verify each implemented feature, user flow, and database integration.

---

## 🔑 Zone 1: Student Learning Workspace

### 1. Lightweight Class-Code Gateway
*   **Path**: `/learn`
*   **Goal**: Restrict course materials to authorized cohort students using a simple verify-code system (no passwords required).
*   **Use Cases & Test Scenarios**:
    1.  **Unauthorized Access Attempt**: Navigate to `/learn/DATA-2026/dashboard` directly without logging in. You should be intercepted by Next.js Middleware and redirected back to `/learn` with a `session_expired` indicator.
    2.  **Valid Sign-in**: Enter a whitelisted student email and a valid class code (e.g., `DATA-2026`). Upon validation:
        *   A signed JWT cookie containing `class_code`, `class_id`, and `role: class_viewer` is written to the browser.
        *   You are redirected to `/learn/DATA-2026/dashboard`.
    3.  **Invalid Access Attempt**: Enter a non-whitelisted email or incorrect code. The gateway should reject the attempt, display a high-visibility validation error, and prevent login.

---

### 2. Interactive Learning Roadmap (React Flow)
*   **Path**: `/learn/[classCode]/dashboard`
*   **Goal**: Render an interactive graphical roadmap of the course syllabus.
*   **Use Cases & Test Scenarios**:
    1.  **Roadmap Layout Rendering**: The page should render a directed acyclic graph (DAG) mapping modules and lessons in sequence using `React Flow` and `Dagre`.
    2.  **Dynamic Node Locks**:
        *   Lessons whose release dates (`visible_after`) are in the past should display as **Active** clickable nodes.
        *   Lessons with future release dates or null dates should display as **Locked** greyed-out nodes with lock icons.
    3.  **Navigation**: Clicking on an active roadmap node should route the student directly to that lesson's viewport page.

---

### 3. Interactive Lesson Viewer & Multi-Format Ingestion
*   **Path**: `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`
*   **Goal**: Render rich lesson text, WYSIWYG outlines, and format-specific viewers for guide materials.
*   **Use Cases & Test Scenarios**:
    1.  **Rich Text Overview**: The main column should render clean lesson content compiled from Tiptap HTML.
    2.  **Secure PDF Guide**: If a PDF is uploaded, a custom `DocumentViewer` renders it with:
        *   Copy-protection overlays.
        *   Context-menu disabled.
        *   Watermarking.
    3.  **Word Document (DOCX) Reading View**: If a DOCX is uploaded, it renders inline as a clean, styled HTML text article matching the bright light theme.
    4.  **Spreadsheet (CSV/XLSX) Tabular Preview**: If a CSV or Excel file is mapped, it renders as a grid displaying column headers and the first 15 rows of sample cells, preventing massive downloads.
    5.  **Private Downloads**: A signed download URL is generated for private assets, letting students download original guides while protecting the file storage keys.

---

### 4. Lesson Completion Tracking
*   **Path**: `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`
*   **Goal**: Track student course progress in real-time.
*   **Use Cases & Test Scenarios**:
    1.  **Mark Completed**: Click the "Mark as Completed" button. The button status updates, a check icon is toggled, and progress is logged in the `student_lesson_progress` table.
    2.  **Interactive Updates**: Refresh the dashboard page. The corresponding roadmap node should render a green checkmark or progress indicator showing completion.

---

### 5. Lesson Discussion Boards
*   **Path**: `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`
*   **Goal**: Enable students to collaborate and ask questions directly inside lessons.
*   **Use Cases & Test Scenarios**:
    1.  **Post Comment**: Type a question in the editor box and submit. The comment appears instantly in the discussion feed.
    2.  **Instructor Badges**: Comments posted by verified teacher accounts (using the whitelisted instructor flag) should render with a distinct "Instructor" badge to stand out.

---

### 6. Homework Submissions Terminal
*   **Path**: `/learn/[classCode]/assignments/[assignmentId]`
*   **Goal**: Submit deliverables, check for duplicates, and monitor background grading.
*   **Use Cases & Test Scenarios**:
    1.  **File Upload**: Upload assignment files. The client calculates the SHA-256 hash.
    2.  **Deduplication Check**: If the file hash matches a previously uploaded file in database, the system reuses the existing storage URL, reducing storage waste.
    3.  **Evaluation Polling View**: After submitting, the frontend transitions into a polling viewport:
        *   Displays status: *"Waiting in grading queue..."*
        *   Triggers background processing.
        *   Updates when the evaluation succeeds or fails.

---

## 🛠️ Zone 2: Administrator CMS & Operations

### 7. Curriculum Authoring (CMS Library)
*   **Path**: `/admin/library` and `/admin/library/lesson-editor`
*   **Goal**: Configure courses, subjects, lessons, and reference files.
*   **Use Cases & Test Scenarios**:
    1.  **Lesson Editor**: Edit a lesson description using the Tiptap rich-text editor (with tables, headers, and code block formatting).
    2.  **Deliverables Mapping**: Upload a document (PDF, DOCX, CSV, XLSX) or register a link.
        *   Select a resource type (e.g., Word Document).
        *   Upload the file.
        *   The background parser automatically extracts the preview artifact (Markdown/HTML or tabular cells) and stores it in the database.

---

### 8. Class Cohorts & Schedules Controller
*   **Path**: `/admin/classes`
*   **Goal**: Create cohorts, generate gateway keys, and set release dates.
*   **Use Cases & Test Scenarios**:
    1.  **Cohort Creation**: Create a class (e.g., "Intro to SQL") and generate a unique Class Code.
    2.  **Release Offsets**: Map course lessons to class schedules:
        *   Configure visibility dates (`visible_after`) and deadlines (`due_date`).
        *   Verify that student roadmaps update immediately to lock/unlock nodes.

---

### 9. Grading & Rubrics Dashboard
*   **Path**: `/admin/grading` and `/admin/grading/[submissionId]`
*   **Goal**: Evaluate homework against criteria tables and publish grades.
*   **Use Cases & Test Scenarios**:
    1.  **Grading Hub**: Lists all student submissions, showing their late status and evaluation metrics.
    2.  **AI Suggested Rubrics**: View AI-generated scores and evidence details populated by the grading engine callback.
    3.  **Teacher Adjustments**: Override suggestions manually. The system validates constraints (scores must not exceed the criterion ceiling or fall below zero) and records adjustment reasons.
    4.  **Publish Grades**: Click **Publish**. This changes the status from `draft` to `published` and unlocks the grade in the student's dashboard.
