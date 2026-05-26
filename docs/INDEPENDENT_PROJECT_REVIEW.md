# Independent Project Review

Review date: 2026-05-25  
Reviewer stance: external technical review of the repository as it exists today, not of the intended future platform.

## 1. Executive Summary

The project is currently a hybrid of two products:

- a public Data Advisor / portfolio showcase with project cards, project detail pages, PDF comparison, embedded dashboards, and a project CMS still exposed under `/projects`;
- an early Teaching OS / learning platform prototype with class-code access, course roadmaps, lesson pages, student submissions, admin library tools, and grading screens.

The strongest part of the system is the visible product direction. The domain model in `supabase/migrations/20260525000000_init.sql` covers subjects, courses, modules, lessons, materials, classes, schedules, assignments, submissions, grading results, and rubric scores. The UI also has several usable concepts: a class-code gateway, a roadmap graph, a lesson editor, material upload/deduplication, and a grading queue.

The project is not currently production-ready. `npm run build` fails with a JSX parse error in `src/app/admin/grading/[submissionId]/page.tsx` at the page return. That means the app cannot currently ship as a Next.js production build.

The biggest structural risk is access control. The app uses one shared Supabase anon client from `src/lib/supabase.ts` almost everywhere, including client components and server routes. Many admin writes, portfolio CRUD operations, uploads, grading writes, and learning reads are performed directly through that client. The migration enables RLS but then grants anonymous `SELECT` on most educational tables, including `classes`, `assignments`, `grading_results`, and `rubric_scores`. Storage policies are not defined in the repository. The middleware checks JWTs for routes, but database access itself is broad and not aligned with the stated role model.

The second major risk is product mismatch. The specs say portfolio CMS should move to `/admin/projects`, classes should exist under `/admin/classes`, and admin routes should be role-protected through real Supabase auth. In the code, `/admin/projects` and `/admin/classes` do not exist, while the old project manager remains at public `/projects`. Admin navigation links point to missing routes.

Priority should be: make the app compile, fix routing mismatches, replace direct client-side admin writes with server-side actions/API routes and real auth, tighten RLS/storage policies, then clean up duplicated editors and portfolio/education boundaries.

## 2. What This Project Currently Is

Working well:

- The public home page in `src/app/page.tsx` assembles a landing flow with `Hero`, `Experience`, consulting projects, and student projects.
- Public project sections fetch live project rows from Supabase where `product_option` is `customer` or `student`.
- Project details can display an iframe dashboard, YouTube embed, React Flow process diagram, rich HTML description, and PDF pages rendered into comparison-slider images.
- The educational database model is broad enough to represent a real course platform.
- The learning area has a recognizable flow: enter class code, view assigned courses, open a course roadmap, view unlocked lessons, and submit assignment files.
- The admin area has useful early surfaces for course taxonomy, syllabus structure, lesson editing, material mapping, rubric creation, and grading.

Acceptable but weak:

- The app is a prototype with many pieces wired directly to Supabase from UI components. That is fast for iteration but makes validation, auditability, and authorization hard to control.
- The domain schema is ahead of the product UI. Some tables exist but have incomplete workflows, especially classes, scheduling, assignments, and material permissions.
- The UI style is coherent in the learning/admin zones, but it is visually disconnected from the public portfolio and overuses dark terminal-like surfaces even for routine data entry.

Problematic:

- The app does not currently build.
- `/projects` is both a public route family and an unauthenticated project CMS. This conflicts with the stated product direction and creates an obvious security/product boundary problem.
- `/admin/classes` and `/admin/projects` are linked but not implemented.
- Supabase policies expose too much educational data to anonymous clients.
- Storage buckets and policies are assumed but not defined in migrations.
- There is no clear server-side trust boundary for admin writes, student submissions, grading, or file downloads.

## 3. High-Level Architecture

Current architecture:

- Next.js App Router under `src/app`.
- One global Supabase client in `src/lib/supabase.ts`, created from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Client-heavy pages. Many route pages start with `'use client'` and perform data fetching, inserts, updates, deletes, and uploads directly.
- A small number of server routes:
  - `POST /api/v1/verify-code`
  - `POST /api/v1/grading/callback`
- A middleware guard for `/learn/:path*` and `/admin/:path*`.
- Supabase migration defining educational tables and some RLS policies.
- Public static portfolio files under `public/files`.

Working well:

- The route split between `/`, `/learn`, and `/admin` is conceptually good.
- React Flow is used appropriately for process diagrams and learning roadmaps.
- The database tables have useful foreign keys and uniqueness constraints for module order, lesson order, class-course assignment, class schedules, and rubric scores.

Acceptable but weak:

- `src/components/ui/FlowDiagram.tsx` contains both a reusable `CustomNode` and dead/static flow scaffolding whose `flowData` nodes are empty. This component is now half shared primitive, half abandoned page section.
- Types are mostly local interfaces or `any`; there is no generated Supabase type layer.
- Business operations are duplicated across large page files instead of living in domain services.

Problematic:

- The specs require module boundaries in `src/modules`, server-side data fetching, and server actions/API routes for client writes. The current code does not follow that. There is no `src/modules` directory.
- Admin and student logic both depend on public anon Supabase configuration.
- Middleware route checks are treated as security, but the database policies do not consistently enforce the same model.

## 4. Current Product Logic

### Portfolio Projects

Public home sections:

- `ConsultingProject` queries `projects` with `product_option = 'customer'`.
- `StudentsProject` queries `projects` with `product_option = 'student'`.
- Each project card renders one thumbnail as an image or two thumbnails through `ImgComparisonSlider`.
- Descriptions are inserted with `dangerouslySetInnerHTML`.
- Icons are mapped from stored string keys to local SVG paths.

Project detail:

- `/projects/[projectId]` fetches one row by ID.
- It conditionally renders dashboard iframe, YouTube iframe, React Flow diagram, description, and PDF viewer/comparison section.
- For PDFs, the page renders `react-pdf` pages into hidden canvases, converts canvases into PNG data URLs, then displays those images. Two PDFs are shown through comparison sliders.

Project CMS:

- `/projects` lists all projects and provides edit/delete actions.
- `/projects/create` uploads thumbnails to `thumbnails`, PDFs to `files`, then inserts a `projects` row.
- `/projects/edit/[projectId]` fetches existing data, allows replacement uploads, and updates the row.
- Delete attempts to remove storage files and then delete the project row.

Problematic behavior:

- The project CMS is not under `/admin`; it is publicly routed at `/projects`.
- The create page redirects to `/#project`, but the home page section id is `projects`, not `project`; this is a navigation bug.
- Storage deletion path extraction is inconsistent. `/projects` delete uses `parts.slice(-2).join('/')`, while edit delete uses `new URL(url).pathname.split('/').slice(4).join('/')`. These are fragile assumptions about Supabase public URL structure.
- The portfolio migration is incomplete: the migration references `public.projects` and policies for it, but does not create the `projects` table.

### Learning Platform

Class-code gateway:

- `/learn` posts a code to `/api/v1/verify-code`.
- The API finds a `classes` row by class code and requires `status = 'running'`.
- It signs a lightweight JWT containing `class_id`, `class_code`, and `role: 'student'`.
- It stores that token in an HTTP-only cookie named `class_session_[classCode]`.

Student dashboard:

- `/learn/[classCode]/dashboard` fetches the class by code, then fetches `class_courses` with `courses(*)`.
- It shows assigned non-archived courses.

Roadmap:

- `/learn/[classCode]/courses/[courseSlug]/roadmap` fetches class, course, modules, lessons, and all class schedules for the class.
- A lesson is locked unless it has a `class_schedules.visible_after` timestamp in the past.
- Lessons are laid out left-to-right with Dagre and displayed in React Flow.

Lesson page:

- `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]` enforces release schedule server-side before rendering content.
- It fetches lesson content and `canonical_materials`.
- PDF materials are served via `createSignedUrl` from `teaching-materials` for 300 seconds.
- Non-PDF materials render as external links.

Assignment page:

- `/learn/[classCode]/assignments/[assignmentId]` loads an assignment, schedule due date, and class ID.
- Students type an email identifier, click Load to check for an existing submission, then upload up to 3 files with a total 50MB limit.
- Upload path includes class code, assignment ID, a short SHA-256 hash of email, and a short SHA-256 file hash.
- It inserts into `submissions` with `student_identifier`, `submitted_text`, and uploaded storage paths.

Problematic behavior:

- There is no navigation path from roadmap or lessons to assignments. Assignment routes exist, but the learner flow does not expose assignment links from lesson pages or dashboard.
- The assignment page calculates `isLate` but never stores or displays it.
- Student identity is just a typed email. It is not tied to the class-code JWT, a Supabase auth user, or an enrollment table.
- Duplicate submissions are not prevented at the database level. The UI checks for an existing submission by email, but two tabs or changed email casing/spacing patterns could create multiple submissions.

### Admin Platform

Admin dashboard:

- `/admin` counts courses, classes, submitted submissions, and subjects.
- Quick action links include `/admin/classes` and `/admin/library`.

Library:

- `/admin/library` supports three tabs: courses/syllabus, subjects, and rubrics.
- Admins can create subjects, courses, modules, lessons, and rubrics with criteria.
- Selecting a course shows modules and lessons, with a link to the lesson editor.

Lesson editor:

- `/admin/library/lesson-editor?lessonId=...` edits lesson title/content and increments version.
- It can upload PDF materials to `teaching-materials`, dedupe by file hash, and register canonical material rows.
- It can register external links and code repos.

Grading:

- `/admin/grading` lists submissions and links to `/admin/grading/[submissionId]`.
- The grading detail page is intended to fetch submission, rubric, and existing grading result, then save draft or publish scores.
- Current build failure prevents this route from compiling.

Problematic behavior:

- `/admin/classes` is not implemented.
- `/admin/projects` is not implemented.
- Admin identity in the layout is hard-coded as `Administrator` and `admin@ste-education.org`.
- Admin actions are client-side Supabase writes. The middleware checks for a token, but write authority ultimately depends on Supabase policies and storage policies that are incomplete or missing.

## 5. Route and Feature Map

Implemented and public:

- `/`: portfolio landing page.
- `/projects`: project CMS list, not a public gallery page.
- `/projects/create`: project creator.
- `/projects/edit/[projectId]`: project editor.
- `/projects/[projectId]`: public project detail.
- `/learn`: class-code gateway.
- `/learn/[classCode]/dashboard`: learner course list.
- `/learn/[classCode]/courses/[courseSlug]/roadmap`: course roadmap.
- `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]`: lesson content and materials.
- `/learn/[classCode]/assignments/[assignmentId]`: assignment submission.
- `/admin`: dashboard.
- `/admin/library`: subjects/courses/rubrics.
- `/admin/library/lesson-editor`: lesson editor.
- `/admin/grading`: submission queue.
- `/admin/grading/[submissionId]`: intended grading UI, currently fails build.
- `/api/v1/verify-code`: class code verification.
- `/api/v1/grading/callback`: grading engine callback.

Linked but missing:

- `/admin/classes`
- `/admin/projects`
- `/admin/library?tab=courses&action=new` has no action handling beyond tab state.
- `/admin/classes?action=new` points to a missing page.

Documented but not currently matched:

- Specs describe public route groups like `src/app/(public)`, but the repo uses flat routes.
- Specs describe `/admin/projects` as the portfolio CMS destination, but CMS remains under `/projects`.
- Specs describe classes scheduling workflows, but there is no classes admin route.

## 6. UI/UX Review

### Public User UX

Working well:

- Public project cards are easy to understand: image, title, truncated description, tool icons, and a “Xem ngay” action.
- The project detail page attempts to combine dashboard, video, process flow, description, and PDFs in one place.
- The comparison-slider idea is strong for before/after portfolio work.

Acceptable but weak:

- Both consulting and student sections use the same `id="projects"`, which weakens anchor navigation.
- The root metadata is still `Create Next App`, which hurts public polish and SEO.
- `Header` renders an empty div; navigation is handled by `FloatingNav`, but the existence of an empty header suggests an unfinished shell.
- There is no loading/empty state on public project sections beyond silently showing nothing if Supabase fails.

Problematic:

- Public `/projects` is not a public gallery. It is a management table with edit/delete controls.
- `dangerouslySetInnerHTML` is used for project descriptions coming from Supabase. If untrusted or weakly controlled admin content enters this table, public users can receive unsafe HTML.
- The detail page’s left table-of-contents is fixed and can compete with the global floating nav and content on smaller screens.
- The PDF rendering approach can become slow for large PDFs because every page is rendered to canvas and converted to a data URL.

### Student UX

Working well:

- The class-code gateway is clear.
- The dashboard clearly shows assigned courses.
- Roadmap locking is visually understandable.
- Lesson pages provide breadcrumbs, rich content, and resource links.
- The assignment page gives file count and size limits in the UI.

Acceptable but weak:

- The student interface is mostly English while the portfolio/CMS project flows are mostly Vietnamese. That may be intentional, but currently it feels like two separate products.
- The learner layout only has one navigation item, “Learning Roadmap,” and it points to dashboard rather than a full roadmap index.
- Students must know or receive direct assignment URLs; the natural route from lesson to assignment is missing.

Problematic:

- There is no grade dashboard. Students can only see a published grade by returning to the assignment page and entering the same email.
- Email identity is easy to mistype and creates a poor recovery experience.
- The “copy protection” document viewer blocks keyboard copy/save/right-click in the browser. That is not real protection, can frustrate legitimate learners, and does not prevent screenshots or network access to signed URLs.

### Admin UX

Working well:

- Admin dashboard provides a useful high-level hub.
- Library tabs give a compact way to manage courses, subjects, and rubrics.
- Lesson editor combines content and materials in a useful authoring workspace.
- Grading queue table is readable and sorted by newest submissions.

Acceptable but weak:

- Most admin forms rely on browser alerts for success/error handling.
- There is little inline validation beyond required fields.
- Module/lesson ordering is manual and can collide with unique constraints.
- The UI shows “Live & Secure” and “RLS Activated,” but the implementation does not justify that confidence.

Problematic:

- Admin navigation includes dead links.
- There is no class/cohort management UI even though classes are central to the product.
- There is no assignment creation UI in the library, despite assignment submission being implemented.
- The grading detail page currently blocks production build.

## 7. Data Flow Review

### Portfolio Data Flow

1. Admin opens `/projects/create`.
2. Browser validates selected files.
3. Browser uploads files directly to Supabase Storage buckets `thumbnails` and `files`.
4. Browser gets public URLs from Supabase.
5. Browser inserts a `projects` row with title, HTML description, icon keys, public URLs, iframe links, YouTube link, and flow diagram JSON.
6. Public home sections fetch the project rows from the browser and render them.
7. Project detail fetches the project row from the browser and renders dynamic media.

Main weakness: there is no server-side normalization, sanitization, or authorization layer for project writes.

### Learning Access Data Flow

1. Student enters a class code in `/learn`.
2. API route checks `classes` by code and status.
3. API route signs a cookie-scoped JWT.
4. Middleware checks the cookie for `/learn/[classCode]/*`.
5. Client pages fetch class/course/schedule rows from Supabase directly.

Main weakness: route access is gated, but table-level reads are broadly open to anon, so the data model itself does not enforce the same privacy assumptions.

### Lesson Material Data Flow

1. Admin uploads a PDF from lesson editor.
2. Browser calculates a short SHA-256 hash.
3. Server action checks `canonical_materials.metadata->>file_hash`.
4. Browser uploads to `teaching-materials` if not duplicate.
5. Server action registers the material row.
6. Lesson page creates a signed URL for PDF materials and passes it into `DocumentViewer`.

Main weakness: upload still happens from the browser via the anon client, so storage write policy has to be perfect. No storage policy is included in the repo.

### Submission and Grading Data Flow

1. Student enters email on assignment page.
2. Page queries existing submissions and published grading results for that email.
3. Student uploads files to `student-submissions`.
4. Page inserts a `submissions` row.
5. Admin grading queue fetches submissions.
6. Grading page is intended to save grading rows and rubric scores.
7. Published grading result becomes visible in assignment page.

Main weaknesses:

- `grading_results` and `rubric_scores` have anonymous select policies in the migration, so draft/private grading data is exposed at the database policy level.
- Submission ownership depends on a typed email, not a verified student identity.
- The grading page currently does not compile.

## 8. Supabase / Storage / CRUD Review

Working well:

- The educational schema has useful core entities and relationships.
- Several constraints prevent duplicate module order, lesson order, class-course links, class-lesson schedule links, and duplicate rubric scores.
- There is a database trigger to recalculate total score from rubric scores.
- File paths for teaching materials and submissions are deterministic enough to support later cleanup and audit.

Acceptable but weak:

- The migration enables RLS for educational tables.
- The project uses signed URLs for teaching PDFs.
- The material dedupe mechanism is useful, although the spec says MD5 while the implementation uses SHA-256 truncated to 16 characters.

Problematic:

- The migration references `public.projects` but does not create it.
- Anonymous select policies are granted to nearly every educational table, including `classes`, `class_schedules`, `assignments`, `grading_results`, and `rubric_scores`.
- `submissions` policy uses `current_setting('request.jwt.claims')` with email/role claims, but class-code JWTs are custom cookies, not Supabase JWTs. Browser Supabase requests will not automatically carry those claims.
- The submission insert policy has no explicit `WITH CHECK`. For `FOR ALL`, PostgreSQL may use the `USING` expression for checks, but this still depends on a Supabase JWT email claim that the student does not have.
- There are no visible storage bucket migrations or policies for `thumbnails`, `files`, `teaching-materials`, or `student-submissions`.
- Admin CRUD operations for subjects, courses, modules, lessons, rubrics, grading, and projects are performed from browser components.
- The grading callback uses a global fallback token if `GRADING_SECRET_TOKEN` is missing. That is dangerous if deployed accidentally.
- The class-code JWT uses a hard-coded fallback secret if `JWT_SECRET` is missing. That is also dangerous if deployed accidentally.
- Admin middleware decodes Supabase-like cookies manually without verifying token signatures. It trusts the decoded payload role if the cookie shape looks like a JWT.
- Storage download in grading detail constructs a URL under `/storage/v1/object/sign/student-submissions/...` but does not actually create a signed URL. That link is unlikely to work as intended and also hard-codes a fallback Supabase project URL.

## 9. Code Quality Review

Working well:

- The code is readable at the page level.
- Naming is generally clear.
- UI components use established libraries rather than hand-rolling complex editors or flow canvases.
- The migration is organized and readable.

Acceptable but weak:

- Local interfaces repeat across files instead of sharing generated types.
- Several pages are very large and mix UI, validation, storage, database writes, and navigation.
- Error handling is mostly `console.error` plus `alert`.
- Many queries ignore `error` or do not surface it to users.
- Several states and imports are unused, such as `rubric` in the grading detail page and `AlertCircle` import there.

Problematic:

- Build failure means code quality is below the minimum bar for merge/release.
- `any` is heavily used in admin/learning flows.
- There are duplicated rich text editor implementations: project create/edit pages inline full TipTap setup, while `RichTextEditor.tsx` exists for lessons.
- Project create and edit pages duplicate large amounts of upload, editor, validation, and React Flow logic.
- The `FlowDiagram` component contains placeholder/dead flow data and a comment saying the rest remains unchanged, but no real node data remains.
- `next lint` script uses `next lint`, which has been removed/deprecated in newer Next.js workflows; in this setup it is likely not a reliable quality gate.
- `src/data/index.ts` still contains hard-coded portfolio project data, but public project sections now fetch from Supabase. This looks like legacy fallback data that is no longer integrated.

## 10. Main Risks and Structural Problems

1. The app cannot build.

`npm run build` fails in `src/app/admin/grading/[submissionId]/page.tsx` with:

```text
Unexpected token `div`. Expected jsx identifier
```

The reported location is the JSX return around line 196. Until fixed, no production deployment should be trusted.

2. Public/admin route boundaries are wrong.

The project manager is publicly available at `/projects`, while the specs say public `/projects` should be a gallery/detail area and project CMS should live under `/admin/projects`.

3. Admin route links are broken.

The admin sidebar links to `/admin/classes` and `/admin/projects`, but neither route exists.

4. RLS does not match the product security model.

Anonymous select access on educational tables conflicts with class-code-gated learning, unpublished grading, and admin-only operational data.

5. Storage access model is undefined.

The app assumes buckets and permissions, but the repo does not define storage buckets or policies. Direct browser uploads to private buckets can only be safe if storage policies are carefully written.

6. Middleware is not enough security.

Middleware protects page routes, not arbitrary Supabase queries made with the anon key. Admin middleware also decodes role claims without signature verification.

7. Student identity is weak.

Student access is class-code based, but submissions and grade lookup are email-text based. This causes impersonation, typo, duplicate submission, and privacy risks.

8. Draft grades are exposed by policy.

The spec says draft grades are hidden from students, but the migration creates anonymous select policies for `grading_results` and `rubric_scores` without filtering `status = 'published'`.

9. CRUD is not transactional.

Project creation uploads storage first and then inserts a row. If the DB insert fails, uploaded files remain orphaned. Edit deletes old files before completing row update. Similar risks exist for material uploads and submission inserts.

10. Long-term maintainability is limited by page-level coupling.

Large client pages own too many responsibilities. This will slow feature growth once classes, schedules, assignments, enrollments, and permissions become real.

## 11. Mismatches Between Vision and Current Code

Vision: `/admin/projects` contains the portfolio CMS.  
Current code: project CMS remains at `/projects`; `/admin/projects` does not exist.

Vision: `/admin/classes` manages class codes, cohort dates, course assignments, and schedules.  
Current code: `/admin/classes` does not exist.

Vision: admin access uses authenticated admin credentials and role checks.  
Current code: middleware manually parses token payloads and accepts several roles; admin pages write with the shared anon Supabase client.

Vision: students access only class-specific, unlocked content.  
Current code: middleware gates routes, but RLS allows anonymous select on classes, schedules, lessons, assignments, grading results, and rubric scores.

Vision: private assets are served via signed URLs.  
Current code: teaching PDFs use signed URLs, but grading download links are constructed manually and student submission storage policy is not defined.

Vision: grading engine token is associated with a submission's class.  
Current code: callback compares against one global `GRADING_SECRET_TOKEN` or a hard-coded fallback.

Vision: implementation rules require server-side data access and domain modules.  
Current code: most data access is inside client components and there are no domain modules.

Vision: educational content uses clear versioning and content lifecycle.  
Current code: lesson save increments a version integer, but there is no draft/published lesson state, review workflow, previous version storage, or rollback.

Vision: complete student learning environment.  
Current code: there is no grade dashboard, no assignment discovery from lessons, no enrollment model, and no admin class scheduling UI.

## 12. Priority Recommendations

### P0: Make the Current App Build

- Fix the JSX parse failure in `src/app/admin/grading/[submissionId]/page.tsx`.
- Run `npm run build` after the fix and treat build success as a required gate.
- Replace or update the lint script so it actually works with the current Next.js version.

### P0: Correct Route Boundaries

- Move or duplicate the project CMS into `/admin/projects`.
- Change `/projects` into a public gallery or redirect it intentionally.
- Add `/admin/classes` or remove the link until the page exists.
- Fix project create redirect from `/#project` to `/#projects`.

### P0: Rework Access Control

- Remove broad anonymous select policies for operational education tables.
- Add explicit policies per action and role.
- Ensure draft grading results are never selectable by students or anonymous users.
- Do not rely on middleware as the only data protection layer.
- Remove hard-coded fallback secrets for `JWT_SECRET` and `GRADING_SECRET_TOKEN` in production paths.

### P1: Move Admin Writes Server-Side

- Put admin writes behind server actions or route handlers that verify real auth.
- Keep browser components responsible for UI state, not database authority.
- Use generated Supabase types and typed DTOs for server actions.

### P1: Define Storage Buckets and Policies

- Add migrations or documented SQL for `thumbnails`, `files`, `teaching-materials`, and `student-submissions`.
- Use signed URLs for student submission downloads.
- Make upload policies match verified roles and class/session ownership.
- Add cleanup behavior for failed multi-step upload/insert operations.

### P1: Strengthen Student Identity and Submissions

- Tie submission identity to the class session, an enrollment record, or Supabase auth.
- Add a uniqueness constraint for one submission per class/assignment/student where appropriate.
- Store late status or submitted-after-due metadata if it matters to grading.
- Expose assignments naturally from lesson pages and/or dashboards.

### P2: Reduce Duplication and Coupling

- Extract project form logic, upload helpers, flow diagram serialization, and TipTap config into shared modules.
- Consolidate rich text editors.
- Replace repeated `any` types with domain interfaces or generated Supabase types.
- Split large route pages into smaller feature components and server-side data functions.

### P2: Improve UX Polish

- Replace alert-based admin feedback with inline toasts and form-level validation.
- Add empty/error states to public project sections.
- Fix metadata title/description.
- Clarify language strategy across public, student, and admin zones.
- Replace the copy-blocking document viewer language with honest signed-link access controls.

### P3: Add Verification Coverage

- Add schema tests or migration checks for constraints and RLS behavior.
- Add API tests for invalid class codes, inactive classes, invalid grading callback tokens, and published-grade overwrite prevention.
- Add Playwright coverage for public project browsing, class-code login, roadmap locked/unlocked lessons, assignment submission, and admin library creation.

## Closing Assessment

This repository shows a real product direction and several useful prototype flows, but the current implementation is still in a transitional state. It is part portfolio CMS, part learning platform, and part specification scaffold. The immediate work is not to add more features; it is to make the existing behavior coherent, buildable, and enforceable at the route, database, and storage layers.

