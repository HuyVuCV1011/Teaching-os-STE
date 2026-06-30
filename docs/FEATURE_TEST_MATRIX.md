# Teaching OS Feature Inventory & Test Matrix

Last reviewed: 2026-06-30

This document records the current product surface and the non-E2E verification plan for Teaching-os-STE. It is safe to commit publicly: it does not include secrets, private account emails, screenshots, or local browser findings.

## Product Surface

Teaching-os-STE is a Next.js App Router platform with three major zones:

- Public showcase and portfolio pages for projects, case studies, system architecture, contact, and certificate verification.
- Learner zone protected by class-code and whitelisted-student flows.
- Admin CMS for class operations, curriculum, lesson materials, project portfolio content, grading, and knowledge/RAG operations.

Supporting services:

- Supabase database and storage for classes, lessons, materials, submissions, grading records, projects, knowledge sources, and learner access.
- RubriCore Python engine for AI grading, RAG retrieval, knowledge processing, and prompt-pack experiments.

## Public Showcase Features

| Area | Current Features |
|---|---|
| Home `/` | Header, floating navigation, hero, metrics stack, about/approach sections, project showcase, before/after showcase, student projects, system architecture, testimonials, and footer contact CTA. |
| Projects `/projects` | Redirects to the home project section. |
| Project detail `/projects/[projectId]` | Dynamic project metadata from Supabase with fallback local data, thumbnail/PDF/media support, table of contents, project description, document viewer, and process diagram rendering. |
| Certificate verification `/verify/[certHash]` | Looks up certificate hash, renders learner/class/course verification state, shows issued certificate details, and handles invalid/missing hashes. |
| Static assets | Tool icons, images, PDFs, project thumbnails, and generated public visual assets under `public/`. |

## Learner Zone Features

| Area | Current Features |
|---|---|
| Sign-in `/learn` | Class code + student email gateway, Supabase whitelist validation, class running-status check, signed JWT session cookie, learner email cookie, and redirect to learner dashboard. |
| Learner middleware | Protects `/learn/[classCode]/*`, verifies class-scoped session JWT, and redirects unauthenticated learners to `/learn`. |
| Learner shell | Sidebar navigation, class/course context loading, student identity display, zen-mode state, logout, responsive mobile drawer, and current-route highlighting. |
| Dashboard `/learn/[classCode]/dashboard` | Class summary, active courses, progress metrics, announcements, next lessons/assignments, certificate eligibility, and print/certificate modal. |
| Roadmap `/learn/[classCode]/courses/[courseSlug]/roadmap` | Course/module/lesson timeline, release schedule lock state, lesson completion state, assignment shortcut, progress bar, and React Flow/Dagre-supported roadmap behavior. |
| Lesson reader `/learn/[classCode]/courses/[courseSlug]/lessons/[lessonId]` | Lesson body, material sidebar, split/grid display modes, PDF preview, DOCX-to-HTML preview, CSV/XLSX grid preview, markdown/code/JSON viewers, signed material URLs, completion button, lesson comments, and AI tutor drawer. |
| Assignment list `/learn/[classCode]/assignments` | Assignment catalog for learner class, due state, grading/submission status, filters, and entry links. |
| Assignment workspace `/learn/[classCode]/assignments/[assignmentId]` | Assignment instructions, question form, text answer support, drag-and-drop file upload, file count/size validation, SHA-256 deduplication, submission rollback handling, late-policy display, grading status polling, and RubriCore grading trigger metadata. |
| Grades `/learn/[classCode]/grades` | Published grade feed, rubric criterion scores, final mark, late deductions, teacher feedback, and certificate readiness indicators. |

## Admin Zone Features

| Area | Current Features |
|---|---|
| Admin middleware | Protects `/admin/*`, supports Supabase admin role checks, and supports local dev bypass through `BYPASS_ADMIN_AUTH=true`. |
| Dashboard `/admin` | Counts for subjects, courses/classes, pending submissions, and quick navigation to admin workspaces. |
| Classes `/admin/classes` | Class cohort CRUD, primary course assignment, many-course mapping, status tracking, student whitelist management, notice board, schedule generation, schedule editing, and class analytics. |
| Class analytics | Average grade, submission rate, grading backlog, grade distribution, concept difficulty, and at-risk learner indicators. |
| Library `/admin/library` | Subject CRUD, course registry, course search, duplicate course, module/lesson creation, reorder/move, publish toggles, timeline visualizer, and roadmap visualization. |
| Admin assignments `/admin/library/assignments` | Assignment list, search, edit shortcut, and delete action. |
| Knowledge hub `/admin/library/knowledge` | Knowledge source upload, chunking status, source and chunk browsing, semantic search drawer, prompt setting persistence, refined knowledge proposal review, commit/edit/archive workflows. |
| Lesson editor `/admin/library/lesson-editor` | Step-based content/materials builder, TipTap editor, canonical material upload, material categorization, data/reference classification, display mode configuration, assignment generation, solution key generation, AI rubric builder, rubric sandbox, and draft/official save flows. |
| Presentation `/admin/presentation/[lessonId]` | Teacher presentation mode, slide navigation, markdown/PDF/code/data viewers, fullscreen controls, teacher-only material grouping, and lesson practice/assignment sections. |
| Projects CMS `/admin/projects` | Supabase project list, create/edit/delete routes, project metadata, thumbnails, PDFs, iframe/YouTube links, product category fields, tech icons, React Flow process diagram, Dagre layout, and cycle detection. |
| Grading `/admin/grading` | Submission queue, search/filter/pagination state, single and batch AI grading trigger, grading status display, and URL-state filters. |
| Grading detail `/admin/grading/[submissionId]` | Student submission review, uploaded deliverables, rubric score editing, AI suggestions, override reasons, late penalty, publish/draft actions, and identity notes. |
| Similarity audit `/admin/grading/similarity` | Lexical/semantic/Jaccard comparison matrix, threshold controls, pair drill-down, and plagiarism-risk review workflow. |

## API Features

| Route | Current Features |
|---|---|
| `POST /api/v1/verify-code` | Validates class code and whitelisted student email, requires running class status, signs learner JWT, sets class-scoped cookies, and returns dashboard redirect data. |
| `POST /api/v1/logout` | Clears class-scoped learner cookies. |
| `POST /api/v1/grading/callback` | Validates RubriCore callback token, handles idempotency, stores grading result and criterion scores, and supports auto-publish metadata. |
| `POST /api/v1/generate-assignment` | Proxies assignment generation requests to RubriCore. |

## RubriCore Engine Features

| Area | Current Features |
|---|---|
| FastAPI service | Grading routes, health/version routes, provider abstraction, logging, and request/response contracts. |
| AI providers | Gemini, Groq, OpenRouter, Ollama, deterministic fallback, provider routing, and subject-pack support. |
| Knowledge/RAG | Knowledge ingestion, chunking, retrieval, prompt assembly, semantic search, and refined knowledge loops. |
| Tests | Pytest coverage for grading, calibration, provider behavior, prompt policies, knowledge indexing, and API contracts. |

## Non-E2E Verification Plan

Codex/Antigravity should not write or run Playwright E2E tests in this project. Use fast verification plus manual Chrome checks. E2E coverage belongs to a dedicated testing agent or CI process.

| Layer | Command / Method | Pass Criteria |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | No TypeScript errors. |
| Unit tests | `npm run test` | All Vitest tests pass. |
| Production build | `npm run build` | Next.js production compilation completes without runtime build errors. |
| Lint status | `npm run lint` | Known limitation: `next lint` is deprecated in Next 15 and currently reports existing lint debt. Do not hide this result. |
| Manual browser QA | Chrome extension or browser at `http://localhost:3000` | Key public, learner, and admin routes render without blank screens, obvious layout breakage, or console runtime errors. |
| Secret hygiene | `.gitignore`, `git status`, staged diff review | `.env*`, local databases, generated reports, traces, screenshots, and private specs are not staged. |

## Manual Route Test Matrix

Use a whitelisted learner test identity from Supabase for learner login. Do not document private emails or secrets in committed files.

| Priority | Route / Flow | Test Cases |
|---|---|---|
| P0 | Home `/` | Page loads, hero/media render, navigation anchors work, project cards display icons/images, footer CTA opens mail client, no empty social links are clickable. |
| P0 | Learner login `/learn` | Empty form validation, invalid class/email rejection, valid class/email signs in and redirects to dashboard. |
| P0 | Learner dashboard | Class context loads, course cards render, progress/certificate sections handle zero and populated states, logout clears cookies. |
| P0 | Roadmap | Course lessons render in order, locked/unlocked state matches schedule, lesson and assignment CTAs navigate correctly. |
| P0 | Lesson reader | Lesson content renders, material preview modes open, completion button updates state or shows current completion, discussion section renders, AI tutor drawer opens without crashing. |
| P0 | Assignment workspace | Instructions render, question fields accept input, upload validation blocks invalid count/size, submit path handles missing/valid inputs safely. |
| P0 | Admin dashboard | Dev bypass or admin session reaches dashboard, counters render, quick links navigate. |
| P0 | Classes CMS | Class list loads, tab navigation works, whitelist/schedule/notice/analytics sections render. Avoid destructive data edits unless explicitly requested. |
| P0 | Library CMS | Subjects/courses/modules/lessons render, search works, tabs switch between timeline, subjects, assignments, and knowledge surfaces. |
| P0 | Lesson editor | Editor shell loads, material/assignment/rubric steps switch, existing data can be viewed. Avoid uploading or overwriting production materials during smoke tests. |
| P0 | Projects CMS | Project list loads, create/edit routes render, existing project media and diagram fields display. Avoid delete unless explicitly requested. |
| P0 | Grading queue | Empty and populated states render, filters/search/pagination do not crash, batch buttons respect disabled state. |
| P1 | Grading detail | Existing submission detail renders when data exists; manual scoring and publish controls require deliberate test data. |
| P1 | Similarity audit | Matrix empty/populated states render, threshold controls update view, pair drill-down opens when data exists. |
| P1 | Certificate verify | Invalid hash shows safe empty state; valid hash renders certificate metadata when available. |
| P1 | Project detail | Existing project detail opens from public card, thumbnails/PDFs/media render, table of contents links scroll. |
| P2 | Responsive checks | Home, learner shell, lesson reader, admin tables, and modals remain usable on mobile and desktop widths. |
| P2 | Error/empty states | No classes, no assignments, no submissions, no announcements, no certificates, and missing material URLs show readable fallbacks. |

## Commit Readiness Checklist

- Feature inventory and test matrix are updated when a major surface is added or removed.
- Browser findings and screenshots stay out of committed markdown unless the user explicitly asks for a public QA report.
- `.env.local`, service-role keys, JWT secrets, webhook tokens, local DB files, traces, screenshots, and generated reports remain ignored/untracked.
- Build/type/test results are reported honestly, including known lint debt.
