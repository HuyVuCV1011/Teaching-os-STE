
# Self-Evolving Knowledge Engine — Full Vision

## Role & Context

You are an expert full-stack AI engineer working on Teaching-os-STE, a Next.js 15.2 + Supabase education platform with a separate RubriCore Engine (FastAPI Python) backend for AI/embedding tasks.

The system already has a functional RAG pipeline:
- Document ingestion (manual upload via admin KnowledgeBaseTab)
- Markdown chunking (heading-based, 1200 char limit)
- Vector embeddings via Gemini `text-embedding-004` (768-dim, pgvector + HNSW index)
- Hybrid search (RRF: vector cosine + keyword regex)
- RAG context injection into AI generation prompts (`<knowledge_dossier>` blocks using pinned chunks)
- Admin UI at `/admin/library` with tabs: Courses, Subjects, Knowledge Base
- Full AI generation features: assignment gen, solution gen, rubric gen, grading (all proxy through RubriCore FastAPI backend at `http://localhost:8080`)

Read the actual source files in these paths before proposing anything. Do not assume — verify the code patterns, database schema, and component structure.

## The Vision

Evolve the current static RAG into an intelligent "self-learning secretary" that automatically discovers, reads, classifies, and organizes knowledge from ALL content already on the platform — without requiring the teacher to manually upload or categorize.

### Core Philosophy

The AI acts as a proactive secretary. It:
- Knows what documents exist across the entire system
- Reads and understands each document's content
- Decides what domain/subject the knowledge belongs to (or creates new ones)
- Splits a single document across multiple domains if it contains multiple knowledge areas
- Organizes everything into a structured, searchable, reusable knowledge library
- The teacher only selects documents and clicks "Generate" — nothing else

### What the System MUST Do

#### 1. Universal Document Discovery

The system must automatically detect ALL unprocessed knowledge sources across the platform, not just manual uploads. This includes:
- Lesson content + attached materials (from `lessons` + `canonical_materials` )
- Assignment questions + confirmed solutions/answer keys (from `assignments`, `rubric_snapshots`, solutions storage)
- Already-uploaded files in the Knowledge Base tab (`knowledge_sources`)
- Any future document uploads from any admin page

These appear in a "Queue" view at the Self-Evolving Knowledge Engine page, marked as "unprocessed" vs "already refined". No manual "push" from other pages is needed — the engine proactively discovers everything.

#### 2. AI-Driven Classification (No User Guessing)

When the teacher selects documents and clicks Generate, the AI must:
- Read the full document content
- Determine what Domain(s) and Subject(s) the knowledge belongs to
- Create new Domain/Subject names if they don't exist (don't ask the teacher)
- Split a single document across multiple Domains/Subjects if its content spans multiple areas
- Extract individual Concepts from the content
- Tag concepts with cross-cutting metadata (tools, frameworks, methods — e.g. #Python, #matplotlib, #statistics)

The teacher should NEVER have to manually select a Subject before generation. The AI decides everything. If the AI is uncertain, it can propose multiple options for the teacher to confirm — but the default flow is AI-driven.

#### 3. Knowledge Structure

Use a three-tier hierarchy with a tagging system:

```
Domain (e.g. "Data Science", "Computer Science", "Mathematics")
  └── Subject (e.g. "Data Analysis with Python", "Python Basics", "Statistics")
       └── Concept (e.g. "Line chart with matplotlib", "For loop", "Normal distribution")
            └── Tags (e.g. #Python, #visualization, #probability)
```

Key rules:
- A Domain can have many Subjects
- A Subject belongs to exactly one Domain
- A Concept belongs to exactly one Subject
- Tags are cross-cutting (a Concept can have many tags, tags are shared across Domains/Subjects)
- One source document can create Concepts across multiple Domains/Subjects
- Each Concept tracks its provenance (which source document(s) it came from)

#### 4. Dedup Strategy with Teacher Review

When generating, the AI must compare against existing Concepts in the library:
- If a new Concept matches an existing one → propose `update` or `merge` with diff
- If a new Concept supersedes an old one → propose `supersede` (mark old as archived)
- If a Concept is entirely new → propose `create`
- All proposed actions are returned as a list for teacher review before committing
- Teacher can approve/reject each action individually
- Future phase: "Approve All" shortcut

#### 5. Integration with Existing AI Generation

The knowledge library must feed into all existing AI features:
- Assignment generation → pulls relevant Concepts as context
- Solution generation → references established knowledge
- Rubric generation → uses Concept definitions for criteria
- Lesson material generation → builds on existing curriculum
- Future: chatbot tutoring

The integration should follow the existing pattern (`<knowledge_dossier>` XML blocks with pinned chunks) but at a higher level — searching the refined knowledge library, not just raw vector chunks.

#### 6. User Flow

1. Teacher navigates to Self-Evolving Knowledge Engine page
2. Sees two main views:
   - **Queue**: Auto-discovered documents, filterable by type (lesson, material, assignment, etc.), with status badges
   - **Library**: Browsable knowledge tree (Domain → Subject → Concept)
3. In Queue: selects documents, chooses AI model (dropdown like existing assignment gen UI), clicks "Generate"
4. System shows preview of proposed actions (create/update/supersede) with diffs
5. Teacher reviews and approves/rejects each
6. Approved changes are saved to the database, embeddings generated, library updated
7. In Library: can browse, search, view Concept details (content, source provenance, tags, prerequisites)

### Architecture Constraints

- **Database unification**: Do NOT split knowledge across two databases. The current RAG (knowledge_chunks, knowledge_sources, embeddings, pgvector) lives in the RubriCore Engine DB (Alembic-managed). Either put the new tables there too, or migrate everything to Supabase. Pick one and justify.
- **Model selection**: Same pattern as existing assignment generation UI. Available models: `gemini-2.5-flash` (default, fast/cheap), `gemini-2.5-pro` (deep analysis), `gemini-2.5-flash-lite`, OpenRouter variants. Pass through server action → FastAPI → AI broker.
- **No auto-run background jobs**: Teacher always triggers generation explicitly. Cost-aware.
- **Follow existing patterns**: For server actions, FastAPI routes, AI broker, embedding, DB models. Don't invent new architectural patterns unless necessary.

### What I Need From You

1. Review the actual existing codebase (not just the description above)
2. Propose a complete design:
   - Database schema (Domains, Subjects, Concepts, Tags, Source Links tables — exact columns, types, FKs, indexes)
   - Where these tables live (RubriCore Alembic or Supabase migration?)
   - New FastAPI endpoints or modifications
   - New/modified server actions
   - New UI components (Queue view, Library view, Diff review modal)
   - Data flow: from discovery → generation → review → save → search
3. Show concrete file paths and key code snippets for the most important parts
4. Give a phased implementation plan (what order to build things)

Do NOT give generic advice. Go deep into the actual code. Show me the architecture, data model, and critical code paths.
