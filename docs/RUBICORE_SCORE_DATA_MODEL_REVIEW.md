# RubiCore Score Data Model Review

Review date: 2026-05-25  
Scope: current Teaching OS schema in `supabase/migrations/20260525000000_init.sql`, reviewed specifically for future RubiCore Score integration.

## Executive Summary

The current schema is a reasonable prototype foundation for manual rubric grading, but it is not yet sufficient for a full RubiCore Score application.

The strongest existing pieces are:

- `assignments`
- `submissions`
- `rubrics`
- `rubric_criteria`
- `grading_results`
- `rubric_scores`

These tables already represent the basic grading chain:

```text
assignment -> submission -> grading_result -> rubric_scores
```

However, RubiCore Score will need more than basic rubric rows. It will need grading runs, score provenance, rubric version snapshots, submission file metadata, student identity, regrade support, teacher override history, and secure access rules.

Current status:

- Good enough for: manual grading prototype.
- Partially good enough for: a simple RubiCore callback that writes draft scores.
- Not good enough for: production RubiCore scoring with auditability, regrading, explainability, security, or long-term score integrity.

## RubiCore-Ready Requirements

A RubiCore-ready schema should support:

- immutable submission artifacts;
- explicit student/class identity;
- rubric criteria that can be safely versioned;
- one or more grading attempts per submission;
- automated score suggestions separate from final teacher-approved scores;
- per-criterion feedback, confidence, and scoring source;
- teacher override history;
- grade publication workflow;
- late submission and resubmission policy;
- storage paths with file metadata and hashes;
- secure draft-vs-published visibility;
- API-safe integration for external scoring engines.

## Current Schema Map

| Current Table | Current Purpose | RubiCore Decision | Reason |
| --- | --- | --- | --- |
| `subjects` | Top-level learning taxonomy | Keep | Not central to RubiCore, but useful context for courses and reporting. |
| `courses` | Reusable course catalog | Extend | Needs stronger versioning/status if RubiCore reports by course version. |
| `modules` | Course structure grouping | Keep | Useful delivery structure; not scoring-critical. |
| `lessons` | Lesson content nodes | Extend | Assignments and materials should be more explicitly attached to lesson versions. |
| `canonical_materials` | Lesson resources/files/links | Split | Teaching materials and scoring artifacts have different lifecycle/security needs. |
| `classes` | Cohort/class run | Extend | Needs enrollment, scoring policy, and integration settings. |
| `class_courses` | Maps classes to courses | Keep | Good many-to-many structure. |
| `class_schedules` | Lesson visibility and due dates | Extend | Needs assignment-level due windows and late policy. |
| `assignments` | Assignment prompt and rubric link | Extend | Needs canonical assignment versioning, release config, allowed files, RubiCore config. |
| `submissions` | Student submission record | Split | Current table mixes identity, status, text, and file paths too loosely. |
| `rubrics` | Rubric template | Extend | Needs immutability/versioning once used. |
| `rubric_criteria` | Rubric rows | Extend | Needs machine-readable scoring instructions and version snapshots. |
| `grading_results` | Overall grade wrapper | Extend | Needs source/status/publish/audit fields and relation to grading runs. |
| `rubric_scores` | Per-criterion scores | Split | Suggested machine scores and final approved scores should be modeled distinctly or strongly typed. |

## Table-by-Table Review

## `subjects`

Decision: **Keep**

Current shape is good enough:

- `id`
- `slug`
- `name`
- `description`
- timestamps

RubiCore impact is low. Subjects are useful for analytics, filtering, and reporting, but they do not need to participate directly in scoring.

Recommended changes:

- Keep as-is for now.
- Add `archived_at` later if taxonomy cleanup matters.

## `courses`

Decision: **Extend**

Current shape:

- `subject_id`
- `slug`
- `title`
- `description`
- `status`
- `version`

This is acceptable for catalog display, but weak for scoring history. If a RubiCore report later says a student was graded under “Data Engineering v3”, the system needs to know exactly what that version contained.

Recommended additions:

```sql
published_at timestamptz
archived_at timestamptz
created_by uuid
updated_by uuid
```

Longer-term:

- introduce `course_versions`;
- freeze module/lesson/assignment references per active class.

Decision rationale:

- Do not replace `courses`.
- Extend it only if course-version reporting matters in RubiCore dashboards.

## `modules`

Decision: **Keep**

Current shape is enough for ordering lessons inside a course.

Recommended changes:

- Add `updated_at`.
- Add `description` only if modules become visible reporting sections.

RubiCore impact is low.

## `lessons`

Decision: **Extend**

Current shape:

- `module_id`
- `title`
- `content`
- `order_index`
- `version`

The table works for content delivery. It is weaker for RubiCore if assignments depend on specific lesson versions.

Recommended additions:

```sql
status text check (status in ('draft', 'review', 'published', 'archived'))
published_at timestamptz
updated_at timestamptz
```

Possible future split:

- `lessons` as stable identity;
- `lesson_versions` as immutable content snapshots.

RubiCore-specific note:

If RubiCore feedback references lesson concepts, the system should know which lesson version the student saw.

## `canonical_materials`

Decision: **Split**

Current shape:

- `lesson_id`
- `title`
- `type`
- `storage_url`
- `flow_diagram`
- `metadata`

This is fine for teaching resources, but RubiCore needs separate artifact handling for scoring inputs and outputs.

Keep this table for:

- lesson PDFs;
- code repo links;
- external references;
- flow diagrams.

Do not use this table for:

- student uploaded files;
- extracted text/code;
- RubiCore generated reports;
- test result artifacts;
- grading logs.

Recommended new tables:

```sql
submission_files
grading_artifacts
```

Example `grading_artifacts` purpose:

- RubiCore JSON report;
- generated PDF score report;
- extracted notebook cells;
- lint/test output;
- model traces;
- normalized code bundle.

## `classes`

Decision: **Extend**

Current shape:

- `class_code`
- `name`
- `status`
- `start_date`
- `end_date`

This supports class-code access but not a serious scoring system.

Recommended additions:

```sql
created_by uuid
updated_at timestamptz
late_policy jsonb default '{}'::jsonb
rubricore_enabled boolean default false
rubricore_config jsonb default '{}'::jsonb
```

Needed companion table:

```sql
class_enrollments
```

Why:

RubiCore should not rely on typed email strings alone. A submission should belong to a known class participant, even if the initial login remains lightweight.

## `class_courses`

Decision: **Keep**

The many-to-many mapping is appropriate.

Recommended changes:

- Add `course_version` or `course_snapshot_id` if classes must freeze a course at launch.

Without that, RubiCore score history may drift if course/assignment/rubric definitions change after a class starts.

## `class_schedules`

Decision: **Extend**

Current shape:

- `class_id`
- `lesson_id`
- `visible_after`
- `due_date`

This currently schedules lessons, not assignments directly. RubiCore scoring is assignment-centered, so due dates should be explicit at assignment delivery level.

Recommended change:

Either extend:

```sql
assignment_id uuid references assignments(id)
late_cutoff_at timestamptz
accept_submissions_until timestamptz
```

Or better, introduce:

```sql
class_assignment_schedules
```

Recommended table:

```sql
create table class_assignment_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  visible_after timestamptz,
  due_at timestamptz,
  accept_until timestamptz,
  late_policy jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  unique (class_id, assignment_id)
);
```

Why:

RubiCore needs clear due windows for late penalties, grading eligibility, and regrade policy.

## `assignments`

Decision: **Extend**

Current shape:

- `lesson_id`
- `title`
- `instructions`
- `rubric_id`
- `max_score`

This is a useful start. But RubiCore needs assignment configuration that is separate from human-readable instructions.

Recommended additions:

```sql
slug text
status text check (status in ('draft', 'review', 'published', 'archived'))
version int default 1 not null
submission_type text check (submission_type in ('file', 'text', 'link', 'mixed'))
allowed_file_types text[]
max_files int default 3
max_total_size_mb int default 50
rubric_snapshot_id uuid
rubricore_config jsonb default '{}'::jsonb
created_by uuid
updated_at timestamptz
published_at timestamptz
```

Important:

`rubric_id` alone is not enough once submissions exist. RubiCore should grade against a frozen rubric snapshot, not a mutable template.

Recommended future split:

- `assignments` as stable assignment identity;
- `assignment_versions` as immutable prompt/config snapshots.

## `submissions`

Decision: **Split**

Current shape:

- `class_id`
- `assignment_id`
- `student_identifier`
- `submitted_text`
- `submitted_files text[]`
- `status`
- `submitted_at`

This is too compact for RubiCore.

Problems:

- `student_identifier` is plain text.
- file paths are stored as `TEXT[]`, with no metadata;
- no attempt number;
- no late flag;
- no source hash at submission level;
- no regrade state;
- no audit fields;
- no draft lifecycle despite specs mentioning draft.

Recommended revised `submissions`:

```sql
create table submissions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid references students(id),
  enrollment_id uuid references class_enrollments(id),
  student_identifier text not null,
  attempt_number int default 1 not null,
  submitted_text text,
  status text not null check (
    status in (
      'draft',
      'submitted',
      'grading_queued',
      'grading_in_progress',
      'graded',
      'returned',
      'reopened'
    )
  ),
  is_late boolean default false not null,
  submitted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (class_id, assignment_id, student_identifier, attempt_number)
);
```

Recommended new table:

```sql
create table submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  content_type text,
  size_bytes bigint,
  sha256 text,
  uploaded_at timestamptz default now() not null,
  processing_status text default 'pending'
);
```

Why:

RubiCore must know exactly which files were graded, whether they changed, and what processing state they reached.

## `rubrics`

Decision: **Extend**

Current shape:

- `title`
- `description`
- `created_at`

This is a good template table, but it lacks versioning and lifecycle controls.

Recommended additions:

```sql
slug text
status text check (status in ('draft', 'review', 'published', 'archived'))
version int default 1 not null
created_by uuid
updated_at timestamptz
published_at timestamptz
locked_at timestamptz
```

Important rule:

Once a rubric is attached to an assignment with submissions, do not mutate its criteria in place. Create a new version or snapshot.

## `rubric_criteria`

Decision: **Extend**

Current shape:

- `rubric_id`
- `name`
- `description`
- `max_points`
- `weight`

This is enough for manual scoring, but too vague for RubiCore scoring.

Recommended additions:

```sql
order_index int
scoring_instructions text
level_descriptors jsonb default '[]'::jsonb
rubricore_key text
rubricore_config jsonb default '{}'::jsonb
required_evidence jsonb default '{}'::jsonb
created_at timestamptz default now()
updated_at timestamptz
```

Examples of `rubricore_config`:

```json
{
  "checks": ["sql_correctness", "chart_interpretation"],
  "evidence_required": ["query_output", "written_explanation"],
  "allow_partial_credit": true
}
```

Why:

RubiCore needs machine-readable criterion configuration, not just human-readable descriptions.

## `grading_results`

Decision: **Extend**

Current shape:

- `submission_id`
- `graded_by`
- `overall_feedback`
- `total_score`
- `status`
- `graded_at`

This is a good wrapper for final visible results, but weak for multi-stage scoring.

Recommended additions:

```sql
rubric_id uuid references rubrics(id)
rubric_snapshot_id uuid
finalized_by uuid
published_by uuid
published_at timestamptz
source text check (source in ('manual', 'rubricore', 'hybrid'))
latest_grading_run_id uuid
created_at timestamptz default now()
updated_at timestamptz default now()
```

Recommended statuses:

```text
draft
suggested
under_review
published
retracted
```

Important:

If RubiCore writes suggestions, `grading_results.status` should not immediately become `published`.

## `rubric_scores`

Decision: **Split**

Current shape:

- `grading_result_id`
- `rubric_criterion_id`
- `score`
- `feedback`

This is useful, but it collapses all score types into one final row.

For RubiCore, there are two good design options.

### Option A: Extend `rubric_scores`

Add:

```sql
source text check (source in ('manual', 'rubricore'))
status text check (status in ('suggested', 'approved', 'overridden', 'rejected'))
scored_by uuid
grading_run_id uuid
confidence numeric(5,4)
evidence jsonb default '{}'::jsonb
created_at timestamptz default now()
updated_at timestamptz
```

This is simpler and may be enough for v1.

### Option B: Split Suggested and Final Scores

Recommended for RubiCore:

```sql
rubric_score_suggestions
rubric_scores
```

Where:

- `rubric_score_suggestions` stores RubiCore outputs.
- `rubric_scores` stores final teacher-approved scores.

Suggested table:

```sql
create table rubric_score_suggestions (
  id uuid primary key default gen_random_uuid(),
  grading_run_id uuid not null references grading_runs(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  rubric_criterion_id uuid not null references rubric_criteria(id),
  suggested_score numeric(5,2) not null,
  suggested_feedback text,
  confidence numeric(5,4),
  evidence jsonb default '{}'::jsonb not null,
  status text default 'suggested' check (
    status in ('suggested', 'accepted', 'edited', 'rejected')
  ),
  created_at timestamptz default now() not null
);
```

Final table can remain close to current `rubric_scores`, but should add:

```sql
derived_from_suggestion_id uuid references rubric_score_suggestions(id)
approved_by uuid
approved_at timestamptz
override_reason text
```

Recommendation:

Use Option B if RubiCore is expected to be a serious scoring engine with explainability and teacher review.

## New Tables Needed for RubiCore

## `students`

Decision: **Add**

Purpose:

Stable learner identity.

Suggested shape:

```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  external_ref text,
  created_at timestamptz default now() not null
);
```

## `class_enrollments`

Decision: **Add**

Purpose:

Map students to classes and prevent grade lookup by arbitrary email.

Suggested shape:

```sql
create table class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text default 'active' check (status in ('active', 'inactive', 'dropped')),
  joined_at timestamptz default now() not null,
  unique (class_id, student_id)
);
```

## `submission_files`

Decision: **Add**

Purpose:

Normalize submitted file metadata and let RubiCore process files safely.

See proposed shape above under `submissions`.

## `grading_runs`

Decision: **Add**

Purpose:

Track each RubiCore execution attempt.

Suggested shape:

```sql
create table grading_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  assignment_id uuid not null references assignments(id),
  engine text default 'rubricore' not null,
  engine_version text,
  status text not null check (
    status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  request_payload jsonb default '{}'::jsonb,
  response_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);
```

Why:

Without this table, RubiCore cannot support retries, debugging, audit logs, model version comparison, or failed-run diagnosis.

## `rubric_snapshots`

Decision: **Add**

Purpose:

Freeze a rubric and its criteria at assignment/submission time.

Suggested shape:

```sql
create table rubric_snapshots (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references rubrics(id),
  version int not null,
  snapshot jsonb not null,
  created_at timestamptz default now() not null,
  unique (rubric_id, version)
);
```

Alternative:

Use normalized `rubric_versions` and `rubric_criterion_versions`. This is cleaner but more work.

## `grading_artifacts`

Decision: **Add**

Purpose:

Store RubiCore-generated files and outputs.

Suggested shape:

```sql
create table grading_artifacts (
  id uuid primary key default gen_random_uuid(),
  grading_run_id uuid not null references grading_runs(id) on delete cascade,
  artifact_type text not null,
  storage_bucket text,
  storage_path text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);
```

Examples:

- `normalized_submission`
- `test_output`
- `rubricore_report_json`
- `rubricore_report_pdf`
- `extracted_text`
- `plagiarism_signal`

## Recommended RubiCore v1 Schema Strategy

For the first serious RubiCore implementation, do not replace everything. Use a staged path.

### Keep

- `subjects`
- `modules`
- `class_courses`

### Extend

- `courses`
- `lessons`
- `classes`
- `class_schedules`
- `assignments`
- `rubrics`
- `rubric_criteria`
- `grading_results`

### Split

- `canonical_materials`
- `submissions`
- `rubric_scores`

### Add

- `students`
- `class_enrollments`
- `submission_files`
- `grading_runs`
- `rubric_snapshots`
- `rubric_score_suggestions`
- `grading_artifacts`
- optionally `class_assignment_schedules`

### Replace

No current table needs full replacement immediately. The current model is salvageable. The main issue is that several tables are overloaded or under-specified.

## Minimal RubiCore-Compatible Version

If the goal is to integrate RubiCore quickly with the smallest schema change, add only:

```text
grading_runs
rubric_score_suggestions
submission_files
```

And extend:

```text
submissions:
- attempt_number
- is_late
- updated_at

grading_results:
- latest_grading_run_id
- published_at
- published_by

rubric_scores:
- derived_from_suggestion_id
- approved_by
- approved_at
- override_reason
```

This would allow the system to:

1. accept a student submission;
2. store uploaded files with metadata;
3. queue RubiCore;
4. store RubiCore suggestions;
5. let a teacher approve or override;
6. publish final scores.

## Ideal RubiCore-Compatible Flow

```text
Student submits assignment
  -> submissions row created
  -> submission_files rows created
  -> grading_runs row created with status = queued
  -> RubiCore processes files
  -> RubiCore writes rubric_score_suggestions
  -> grading_runs status = succeeded
  -> teacher reviews suggestions
  -> final rubric_scores rows written or updated
  -> grading_results status = published
  -> student sees final grade only
```

## Security Requirements Before RubiCore

Before connecting RubiCore, fix the access model.

Required:

- remove anonymous select on `grading_results`;
- remove anonymous select on `rubric_scores`;
- expose only published grade results to the owning student;
- keep RubiCore API tokens out of public client code;
- remove fallback secrets for grading callback;
- use signed URLs for submission file reads;
- restrict `student-submissions` bucket by enrollment/session ownership;
- ensure RubiCore writes through a server route or service-role backend, not directly from browser clients.

## Final Verdict

The current data structure is directionally correct but incomplete.

It should be treated as:

```text
manual grading prototype schema
```

not yet:

```text
RubiCore Score production schema
```

The best path is evolutionary: keep the current learning/catalog foundation, extend the rubric and grading wrapper tables, split submission files and score suggestions into their own tables, and add a `grading_runs` layer as the RubiCore integration backbone.

