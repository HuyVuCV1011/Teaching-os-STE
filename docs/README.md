# Teaching OS - System Specifications

This directory contains system designs, specifications, database blueprints, and architectural overview documents for Teaching OS (STE).

## Specifications Directory Index

Refer to the documents inside the **[specs/](specs/)** directory for implementation-ready guides:

- **[00-spec-index.md](specs/00-spec-index.md)**: Index and chronological read-order.
- **[01-platform-overview.md](specs/01-platform-overview.md)**: Core zones (Showcase, Learner Desk, Admin Terminal).
- **[17-rag-knowledge-hub.md](specs/17-rag-knowledge-hub.md)**: Admin knowledge hub behavior and RAG flywheel intent.
- **[18-rag-knowledge-engine.md](specs/18-rag-knowledge-engine.md)**: Knowledge engine and retrieval implementation notes.

Operational documents:

- **[FEATURE_TEST_MATRIX.md](FEATURE_TEST_MATRIX.md)**: Current feature inventory and non-E2E test matrix.
- **[QA_WORKFLOW.md](QA_WORKFLOW.md)**: Current verification workflow for Codex/Antigravity and dedicated testing agents.
- **[ELEARNING_FEATURES_VERIFICATION_GUIDE.md](ELEARNING_FEATURES_VERIFICATION_GUIDE.md)**: Focused verification notes for e-learning features.

## RubriCore Integration Layout

The platform integrates the **RubriCore** Python grading engine inside the `/rubricore-engine` folder.
* **Architecture**: Stateless API bridge. Next.js triggers evaluations and stores submissions, prompts, and criteria.
* **Service Endpoint**: `POST http://localhost:8080/pilot/grade-submission`
* **Local Postgres Settings**: The engine connects to `rubricore-postgres` on port `5432` for administrative and version testing logs.

## Theme & Visual Style Guide

All sub-modules must respect the platform-wide **Bright White Tone** layout:
- **Default HTML Theme**: `<html class="light">`
- **Utility Mappings**:
  - `bg-slate-950` -> `#ffffff` (White background)
  - `bg-slate-900` -> `#f8fafc` (Sidebars & panel panels)
  - `border-slate-800` -> `#e2e8f0` (Borders)
  - `text-slate-100` -> `#0f172a` (Dark slate titles & body text)
- Ensure all custom forms, tables, editors, and PDFs leverage high-contrast dark text on light backgrounds for excellent scannability and instructional focus.

## Security & Scope Boundaries

Core specifications detailing:
- Raw supabase database migrations and active RLS scripts
- JWT verify-code payload contracts
- Webhook encryption signatures

are kept in private repository volumes. When implementing changes, ensure RLS constraints are maintained and public routes never expose user session records.
