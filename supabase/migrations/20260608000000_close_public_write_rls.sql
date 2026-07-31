-- ====================================================================
-- MIGRATION: CLOSE PUBLIC WRITE RLS POLICIES
-- ====================================================================
--
-- Purpose:
-- - Remove legacy permissive anon/auth write policies from public Data API tables.
-- - Keep read-only policies for public learning/showcase data required by the app.
-- - Force student-private and CMS writes through verified server actions/service-role.
--
-- Notes:
-- - service_role bypasses RLS, so existing backend-only actions continue to work.
-- - Do not add SECURITY DEFINER shortcuts here; prefer backend service-role actions.

-- --------------------------------------------------------------------
-- 1. Ensure RLS is enabled on exposed public tables used by the app.
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canonical_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grading_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grading_feedback_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submission_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evidence_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answer_key_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answer_key_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evidence_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submission_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criterion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.artifact_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.file_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.output_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prompt_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refined_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refined_knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subject_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concept_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_score_suggestions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. Drop legacy permissive policies.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage Subjects Policy" ON public.subjects;
DROP POLICY IF EXISTS "Manage Courses Policy" ON public.courses;
DROP POLICY IF EXISTS "Manage Modules Policy" ON public.modules;
DROP POLICY IF EXISTS "Manage Lessons Policy" ON public.lessons;
DROP POLICY IF EXISTS "Manage Canonical Materials Policy" ON public.canonical_materials;
DROP POLICY IF EXISTS "Manage Rubrics Policy" ON public.rubrics;
DROP POLICY IF EXISTS "Manage Rubric Criteria Policy" ON public.rubric_criteria;
DROP POLICY IF EXISTS "Manage Assignments Policy" ON public.assignments;

DROP POLICY IF EXISTS insert_students ON public.students;
DROP POLICY IF EXISTS update_students ON public.students;
DROP POLICY IF EXISTS select_students ON public.students;

DROP POLICY IF EXISTS insert_progress ON public.student_lesson_progress;
DROP POLICY IF EXISTS delete_progress ON public.student_lesson_progress;
DROP POLICY IF EXISTS select_progress ON public.student_lesson_progress;

DROP POLICY IF EXISTS insert_comments ON public.discussion_comments;
DROP POLICY IF EXISTS select_comments ON public.discussion_comments;

DROP POLICY IF EXISTS insert_announcements ON public.class_announcements;
DROP POLICY IF EXISTS select_announcements ON public.class_announcements;

DROP POLICY IF EXISTS insert_certificates ON public.certificates;
DROP POLICY IF EXISTS select_certificates ON public.certificates;

DROP POLICY IF EXISTS student_select_own_grades ON public.grading_results;
DROP POLICY IF EXISTS student_select_own_rubric_scores ON public.rubric_scores;

DROP POLICY IF EXISTS admin_select_feedback_embeddings ON public.grading_feedback_embeddings;
DROP POLICY IF EXISTS admin_insert_feedback_embeddings ON public.grading_feedback_embeddings;
DROP POLICY IF EXISTS admin_select_submission_embeddings ON public.submission_embeddings;
DROP POLICY IF EXISTS admin_insert_submission_embeddings ON public.submission_embeddings;

DROP POLICY IF EXISTS "Allow all actions for authenticated administrators" ON public.concept_tags;
DROP POLICY IF EXISTS "Allow all actions for authenticated administrators" ON public.knowledge_domains;
DROP POLICY IF EXISTS "Allow all actions for authenticated administrators" ON public.knowledge_tags;
DROP POLICY IF EXISTS "Allow anon delete access" ON public.projects;
DROP POLICY IF EXISTS "Allow anon insert access" ON public.projects;
DROP POLICY IF EXISTS "Allow anon update access" ON public.projects;
DROP POLICY IF EXISTS insert_snapshots ON public.rubric_snapshots;
DROP POLICY IF EXISTS select_snapshots ON public.rubric_snapshots;

DROP POLICY IF EXISTS "Select Solutions Policy" ON storage.objects;
DROP POLICY IF EXISTS "Modify Solutions Policy" ON storage.objects;

DROP POLICY IF EXISTS public_read_subjects ON public.subjects;
DROP POLICY IF EXISTS public_read_courses ON public.courses;
DROP POLICY IF EXISTS public_read_modules ON public.modules;
DROP POLICY IF EXISTS public_read_lessons ON public.lessons;
DROP POLICY IF EXISTS public_read_canonical_materials ON public.canonical_materials;
DROP POLICY IF EXISTS public_read_rubrics ON public.rubrics;
DROP POLICY IF EXISTS public_read_rubric_criteria ON public.rubric_criteria;
DROP POLICY IF EXISTS public_read_assignments ON public.assignments;
DROP POLICY IF EXISTS public_read_classes ON public.classes;
DROP POLICY IF EXISTS public_read_class_courses ON public.class_courses;
DROP POLICY IF EXISTS public_read_class_schedules ON public.class_schedules;
DROP POLICY IF EXISTS public_read_class_announcements ON public.class_announcements;
DROP POLICY IF EXISTS public_read_certificates_for_verification ON public.certificates;
DROP POLICY IF EXISTS public_read_projects ON public.projects;

-- --------------------------------------------------------------------
-- 3. Public read-only policies.
-- --------------------------------------------------------------------
CREATE POLICY public_read_subjects ON public.subjects
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_courses ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (status IS DISTINCT FROM 'archived');

CREATE POLICY public_read_modules ON public.modules
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_lessons ON public.lessons
  FOR SELECT
  TO anon, authenticated
  USING (
    metadata IS NULL
    OR metadata->>'status' IS NULL
    OR metadata->>'status' <> 'draft'
  );

CREATE POLICY public_read_canonical_materials ON public.canonical_materials
  FOR SELECT
  TO anon, authenticated
  USING (visibility IS NULL OR visibility IN ('student', 'both'));

CREATE POLICY public_read_rubrics ON public.rubrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_rubric_criteria ON public.rubric_criteria
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_assignments ON public.assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_classes ON public.classes
  FOR SELECT
  TO anon, authenticated
  USING (status = 'running');

CREATE POLICY public_read_class_courses ON public.class_courses
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_class_schedules ON public.class_schedules
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_class_announcements ON public.class_announcements
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY public_read_projects ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- --------------------------------------------------------------------
-- 4. Private tables intentionally have no anon/auth policies here.
-- --------------------------------------------------------------------
-- students
-- student_lesson_progress
-- discussion_comments
-- certificates
-- submissions
-- submission_files
-- grading_runs
-- grading_feedback_embeddings
-- submission_embeddings
--
-- These are accessed by verified server actions or service-role admin code.

-- Published grade reads are intentionally served by server actions so the
-- lightweight class-session JWT can be validated in application code.

-- --------------------------------------------------------------------
-- 5. Harden public functions reported by Supabase security advisors.
-- --------------------------------------------------------------------
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'calculate_total_score',
        'reorder_canonical_materials',
        'match_grading_feedback',
        'match_submission_embeddings',
        'fn_sync_student_enrollment',
        'fn_sync_student_submission'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Extension `vector` is intentionally not moved in this migration. Moving an
-- installed extension changes type/function qualification and needs a dedicated
-- compatibility pass over embedding columns, indexes, and RPC definitions.
