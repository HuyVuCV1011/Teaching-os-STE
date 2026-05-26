-- ====================================================================
-- TEACHING OS / PORTFOLIO DATABASE SCHEMA
-- Corrected Execution Order and Valid PostgreSQL Array Syntax
-- ====================================================================

-- 1. BASE SYSTEM LOOKUPS & CATEGORIES
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid,
  slug character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  description text,
  status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'review'::character varying, 'published'::character varying, 'archived'::character varying]::text[])),
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL
);

CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid,
  title character varying NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT modules_pkey PRIMARY KEY (id),
  CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid,
  title character varying NOT NULL,
  content text,
  order_index integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE
);

-- 2. CLASSROOMS & COHORTS (WHITELISTS)
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid,
  class_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'upcoming'::character varying CHECK (status::text = ANY (ARRAY['upcoming'::character varying, 'running'::character varying, 'completed'::character varying, 'archived'::character varying]::text[])),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

CREATE TABLE public.class_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  course_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_courses_pkey PRIMARY KEY (id),
  CONSTRAINT class_courses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT class_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

CREATE TABLE public.class_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  student_email character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT uq_class_student UNIQUE (class_id, student_email)
);

CREATE TABLE public.class_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  lesson_id uuid,
  visible_after timestamp with time zone,
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT class_schedules_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT class_schedules_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

-- 3. RUBRICS MATRICES & ASSIGNMENTS
CREATE TABLE public.rubrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rubrics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rubric_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rubric_id uuid,
  name character varying NOT NULL,
  description text,
  max_points integer NOT NULL CHECK (max_points > 0),
  weight numeric NOT NULL DEFAULT 1.00 CHECK (weight >= 0.00),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rubric_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE CASCADE
);

CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid,
  title character varying NOT NULL,
  instructions text NOT NULL,
  rubric_id uuid,
  max_score integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE RESTRICT,
  CONSTRAINT assignments_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE SET NULL
);

-- 4. SUBMISSIONS & INDIVIDUAL FILE METADATA
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  assignment_id uuid,
  student_identifier character varying NOT NULL,
  submitted_text text,
  submitted_files text[] NOT NULL, -- Corrected from ARRAY
  status character varying NOT NULL DEFAULT 'submitted'::character varying CHECK (status::text = ANY (ARRAY['submitted'::character varying, 'grading_in_progress'::character varying, 'graded'::character varying]::text[])),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  attempt_number integer NOT NULL DEFAULT 1,
  is_late boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE RESTRICT
);

CREATE TABLE public.submission_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  storage_bucket character varying NOT NULL,
  storage_path text NOT NULL,
  original_filename character varying NOT NULL,
  content_type character varying,
  size_bytes bigint,
  sha256 character varying,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  processing_status character varying NOT NULL DEFAULT 'pending'::character varying,
  CONSTRAINT submission_files_pkey PRIMARY KEY (id),
  CONSTRAINT submission_files_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE
);

-- 5. GRADING RUNS & RESULTS (RUBRICORE ENGINE INTEGRATION)
CREATE TABLE public.grading_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  engine character varying NOT NULL DEFAULT 'rubricore'::character varying,
  engine_version character varying,
  status character varying NOT NULL DEFAULT 'queued'::character varying CHECK (status::text = ANY (ARRAY['queued'::character varying, 'running'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grading_runs_pkey PRIMARY KEY (id),
  CONSTRAINT grading_runs_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE,
  CONSTRAINT grading_runs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE
);

CREATE TABLE public.grading_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid UNIQUE,
  graded_by uuid,
  overall_feedback text,
  total_score numeric NOT NULL DEFAULT 0.00,
  status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying]::text[])),
  graded_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  published_by uuid,
  latest_grading_run_id uuid,
  CONSTRAINT grading_results_pkey PRIMARY KEY (id),
  CONSTRAINT grading_results_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE,
  CONSTRAINT grading_results_latest_grading_run_id_fkey FOREIGN KEY (latest_grading_run_id) REFERENCES public.grading_runs(id) ON DELETE SET NULL
);

CREATE TABLE public.rubric_score_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grading_run_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  rubric_criterion_id uuid NOT NULL,
  suggested_score numeric NOT NULL,
  suggested_feedback text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  status character varying NOT NULL DEFAULT 'suggested'::character varying CHECK (status::text = ANY (ARRAY['suggested'::character varying, 'accepted'::character varying, 'edited'::character varying, 'rejected'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rubric_score_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT rubric_score_suggestions_grading_run_id_fkey FOREIGN KEY (grading_run_id) REFERENCES public.grading_runs(id) ON DELETE CASCADE,
  CONSTRAINT rubric_score_suggestions_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE,
  CONSTRAINT rubric_score_suggestions_rubric_criterion_id_fkey FOREIGN KEY (rubric_criterion_id) REFERENCES public.rubric_criteria(id) ON DELETE CASCADE
);

CREATE TABLE public.rubric_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grading_result_id uuid,
  rubric_criterion_id uuid,
  score numeric NOT NULL,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  derived_from_suggestion_id uuid,
  override_reason text,
  CONSTRAINT rubric_scores_pkey PRIMARY KEY (id),
  CONSTRAINT rubric_scores_grading_result_id_fkey FOREIGN KEY (grading_result_id) REFERENCES public.grading_results(id) ON DELETE CASCADE,
  CONSTRAINT rubric_scores_rubric_criterion_id_fkey FOREIGN KEY (rubric_criterion_id) REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
  CONSTRAINT rubric_scores_derived_from_suggestion_id_fkey FOREIGN KEY (derived_from_suggestion_id) REFERENCES public.rubric_score_suggestions(id) ON DELETE SET NULL
);

-- 6. CANONICAL MATERIALS & PORTFOLIO PROJECTS
CREATE TABLE public.canonical_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid,
  title character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['pdf'::character varying, 'code_repo'::character varying, 'flow_diagram'::character varying, 'link'::character varying]::text[])),
  storage_url text NOT NULL,
  flow_diagram jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT canonical_materials_pkey PRIMARY KEY (id),
  CONSTRAINT canonical_materials_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  product_option text CHECK (product_option = ANY (ARRAY['student'::text, 'customer'::text])),
  thumbnails text[], -- Corrected from ARRAY
  files text[],      -- Corrected from ARRAY
  icons text[],      -- Corrected from ARRAY
  iframe_link text,
  youtube_link text,
  flow_diagram jsonb DEFAULT '{"edges": [], "nodes": []}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);
