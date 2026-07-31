-- Remove obsolete public SELECT policies superseded by the intentionally
-- scoped public_read_* policies from 20260608000000.
DROP POLICY IF EXISTS select_subjects_policy ON public.subjects;
DROP POLICY IF EXISTS select_courses_policy ON public.courses;
DROP POLICY IF EXISTS select_modules_policy ON public.modules;
DROP POLICY IF EXISTS select_lessons_policy ON public.lessons;
DROP POLICY IF EXISTS select_canonical_materials_policy ON public.canonical_materials;
DROP POLICY IF EXISTS select_rubrics_policy ON public.rubrics;
DROP POLICY IF EXISTS select_rubric_criteria_policy ON public.rubric_criteria;
DROP POLICY IF EXISTS select_assignments_policy ON public.assignments;
DROP POLICY IF EXISTS select_classes_policy ON public.classes;
DROP POLICY IF EXISTS select_class_courses_policy ON public.class_courses;
DROP POLICY IF EXISTS select_class_schedules_policy ON public.class_schedules;
DROP POLICY IF EXISTS select_projects_policy ON public.projects;
DROP POLICY IF EXISTS "Allow public read access" ON public.projects;

-- Private reads and writes now run exclusively through verified server code
-- using the service role. These legacy Data API policies both duplicated the
-- authorization layer and evaluated JWT settings once per row.
DROP POLICY IF EXISTS manage_own_submissions ON public.submissions;
DROP POLICY IF EXISTS select_submission_files ON public.submission_files;
DROP POLICY IF EXISTS select_grading_runs ON public.grading_runs;
DROP POLICY IF EXISTS select_suggestions ON public.rubric_score_suggestions;
DROP POLICY IF EXISTS manage_class_enrollments_policy ON public.class_enrollments;
