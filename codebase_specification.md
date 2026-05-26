# Codebase Specification: Teaching OS (STE)

This document provides a concise overview of the architecture, data models, key components, and usage instructions of this Teaching OS and Portfolio application for downstream AI coding assistants.

---

## 1. Overview & Architecture

Teaching OS (STE) is a hybrid Next.js application that integrates:
1. **Public Marketing & Portfolio Showcase**: Contains pages showcasing data advisory projects, process flowcharts (built with React Flow), and before/after report comparison sliders.
2. **Student Learning Portal (`/learn`)**: A gated learning desk where student cohorts login via a whitelisted email and class access code to access roadmaps, view lectures, check schedules, and upload assignments.
3. **Admin CMS & Grading Panel (`/admin`)**: Administrative screens for editing curricula (subjects, courses, modules, lessons), managing class settings, whitelisting student emails, and scoring assignments against criteria-based rubrics.
4. **Relocated RubriCore Engine (`/rubricore-engine`)**: A Python-based FastAPI service that runs automated LLM grading processes on submitted student files.

---

## 2. Tech Stack

- **Framework**: Next.js 15.1.7 App Router (React 19, TypeScript)
- **Database & Storage**: Supabase (`@supabase/supabase-js`) with active Row-Level Security (RLS)
- **Python Engine**: FastAPI, Alembic (SQLite/PostgreSQL database migration support for local engine settings), and SQLAlchemy
- **UI Components & Visuals**:
  - `reactflow` & `dagre` (Interactive process pipelines & roadmap graphs)
  - `@img-comparison-slider/react` (Visual before/after comparisons)
  - `react-pdf` (High-performance secure PDF report rendering)
  - `@tiptap/react` (Rich Text WYSIWYG editor for lesson materials)
- **Styling & Motion**: Tailwind CSS v3 & Framer Motion (`motion/react`)

---

## 3. Database Schema

The system uses the following Supabase PostgreSQL tables:

### A. Taxonomy & Reusable Content Library
- **`subjects`**: Core categories / learning disciplines.
- **`courses`**: Syllabi containing slug, title, subject ID, version pointer, and status (`draft`, `review`, `published`, `archived`).
- **`modules`**: Chapters inside a course, ordered by an `order_index`.
- **`lessons`**: Sub-chapters/lessons inside a module, containing rich HTML/markdown content from Tiptap.
- **`canonical_materials`**: Assets attached to lessons. Can be of type `pdf`, `code_repo`, `flow_diagram`, or `link`. Stores file paths or React Flow JSON maps.

### B. Class Cohorts & Schedules
- **`classes`**: Cohorts linking to a course, containing unique class codes (e.g. `DATA-2026`), status, start date, and end date.
- **`class_schedules`**: Maps lesson schedules to cohorts, gating content by `visible_after` and `due_date` timestamps.

### C. Assessments, Submissions & Grading
- **`rubrics`**: Evaluation rubrics.
- **`rubric_criteria`**: Metrics inside a rubric with specific `max_points` and weighting.
- **`assignments`**: Learning tasks attached to lessons, linked to a specific rubric.
- **`submissions`**: Student uploads, containing student email, submitted text, files, and status indicators.
- **`grading_results`**: Final evaluation scores, grader ID, overall feedback, and status (`draft`, `published`).
- **`rubric_scores`**: Breakdowns of final criteria scores, supporting override reasons when teachers adjust AI suggestions.
- **`grading_runs`**: Logs of automated evaluation runs triggered through the RubriCore engine.
- **`rubric_score_suggestions`**: AI-generated score suggestions output by the RubriCore engine, reviewed by teachers prior to finalizing the score.

---

## 4. Key Paths & Components

- **`src/app/`**: Route directories
  - `src/app/page.tsx`: Showcase Landing page.
  - `src/app/projects/`: Individual portfolio pages.
  - `src/app/learn/`: Gateway login (`page.tsx`) and student layout dashboard (`[classCode]/layout.tsx`, `[classCode]/dashboard/page.tsx`).
  - `src/app/admin/`: Admin layout and dashboard (`layout.tsx`, `page.tsx`), curriculum authoring (`library/page.tsx`), class settings (`classes/page.tsx`), and rubric evaluator (`grading/[submissionId]/page.tsx`).
- **`rubricore-engine/`**: The relocated python grading engine
  - `app/pilot/fastapi_app.py`: Contains the stateless grading bridge endpoint `POST /pilot/grade-submission`.
- **`src/components/`**: Feature components
  - `RichTextEditor.tsx`: WYSIWYG editor integration with Tiptap.
  - `DocumentViewer.tsx`: Custom React PDF viewer with security features (anti-scraping overlays, page locks).
  - `FloatingNavbar.tsx`: Smooth scroll animated menu header.

---

## 5. Styling Guidelines

- The application is styled with a **bright white/light theme** (activated via the `light` HTML class).
- It relies on custom-inverted `slate` classes configured in `tailwind.config.ts`:
  - `bg-slate-950` maps to `#ffffff` (pure white background)
  - `bg-slate-900` maps to `#f8fafc` (card/sidebar panels)
  - `border-slate-800` maps to `#e2e8f0` (clean borders)
  - `text-slate-100` maps to `#0f172a` (dark main text)
- Synced CSS variables inside `globals.css` force libraries (Tiptap, React Flow) to fall back to the light theme, maintaining high visual excellence.

---

## 6. RubriCore Engine Code Structure

The Python grading service logic is encapsulated in `rubricore-engine/app/` with the following architectural package division:

```
rubricore-engine/app/
├── ai/                     # LLM Provider Adapters
│   └── ollama.py           # Evaluates rubric evidence schemas using local llama3.2
├── core/                   # Shared Configuration
│   └── config.py           # Loads engine env settings (e.g. database credentials, models)
├── db/                     # DB Entities & Persistence Layers
│   ├── base.py             # SQLAlchemy model registry
│   ├── session.py          # Session engines linking to rubricore_ste DB
│   ├── models/             # SQLAlchemy schemas (runs, results, users, organizations)
│   └── services/           # Orchestrators (grading_orchestration.py, review_policy.py)
├── pilot/                  # Web Interface & API Routes
│   ├── fastapi_app.py      # Entry point exposing API routers (health, grade-submission)
│   ├── contracts.py        # Pydantic schemas validating payloads
│   ├── db_loaders.py       # Helper functions pulling models for request context
│   └── workflows.py        # Executes workflow sequences running the grading checks
└── taxonomy/               # General Education Taxonomy Types
    └── categories.py       # Taxonomy validation and tagging logic
```

### Key Modules and Responsibilities:
* **[fastapi_app.py](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/pilot/fastapi_app.py)**: Serves HTTP request routes. Maps stateless request payloads to AI models and returns structured suggestion matrices.
* **[ollama.py](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/ai/ollama.py)**: Adapts requests into chat templates, configures the structured output JSON format schemas, queries the Ollama daemon, and handles normalization of fallback grading models.
* **[contracts.py](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/pilot/contracts.py)**: Declares request and response models enforcing static type validation (e.g., `StatelessGradingRequest`, `GradingRunResponse`).
* **[workflows.py](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/pilot/workflows.py)**: Controls sequential state progression of a grading run, coordinating database logs with RAG context fetch parameters.
* **[services/](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/db/services/)**: Encapsulates core grading logic rules like checking criteria point ceilings, executing teacher override operations, and resolving manual grading scores.
* **[models/](file:///Users/mac/Data/STE/vuth-portfolio-main/rubricore-engine/app/db/models/)**: Declares mapping objects matching postgres databases (such as `Submission`, `GradingRun`, `RubricVersion`) enabling Alembic migration compatibility.

