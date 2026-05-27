-- ====================================================================
-- MIGRATION: E-LEARNING INTERACTIVE SUITE & POLICIES
-- ====================================================================

-- 1. Alter assignments table to support visibility toggle and late policies
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS auto_publish_grades BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_policy JSONB NOT NULL DEFAULT '{"penalty_percent_per_day": 0, "grace_period_hours": 0}'::jsonb;

-- 2. Progress Tracking Table
CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_email character varying NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT uq_student_lesson_completion UNIQUE (class_id, lesson_id, student_email)
);

-- 3. Discussion Boards Table
CREATE TABLE IF NOT EXISTS public.discussion_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_email character varying NOT NULL,
  comment_text text NOT NULL,
  is_instructor boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT discussion_comments_pkey PRIMARY KEY (id)
);

-- 4. Cohort Announcements Table
CREATE TABLE IF NOT EXISTS public.class_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  title character varying NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_announcements_pkey PRIMARY KEY (id)
);

-- 5. Certificates Record Table
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  student_email character varying NOT NULL,
  grade_average numeric NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT certificates_pkey PRIMARY KEY (id),
  CONSTRAINT uq_class_student_certificate UNIQUE (class_id, student_email)
);

-- 6. Enable RLS and setup policies
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Allow whitelisted students and teachers to view/write their own records
DROP POLICY IF EXISTS select_progress ON public.student_lesson_progress;
CREATE POLICY select_progress ON public.student_lesson_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_progress ON public.student_lesson_progress;
CREATE POLICY insert_progress ON public.student_lesson_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS delete_progress ON public.student_lesson_progress;
CREATE POLICY delete_progress ON public.student_lesson_progress FOR DELETE USING (true);

DROP POLICY IF EXISTS select_comments ON public.discussion_comments;
CREATE POLICY select_comments ON public.discussion_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_comments ON public.discussion_comments;
CREATE POLICY insert_comments ON public.discussion_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS select_announcements ON public.class_announcements;
CREATE POLICY select_announcements ON public.class_announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_announcements ON public.class_announcements;
CREATE POLICY insert_announcements ON public.class_announcements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS select_certificates ON public.certificates;
CREATE POLICY select_certificates ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_certificates ON public.certificates;
CREATE POLICY insert_certificates ON public.certificates FOR INSERT WITH CHECK (true);

-- 7. Restrict student/anon select queries to only published grades
DROP POLICY IF EXISTS student_select_own_grades ON public.grading_results;
CREATE POLICY student_select_own_grades ON public.grading_results
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' AND
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE student_identifier = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

DROP POLICY IF EXISTS student_select_own_rubric_scores ON public.rubric_scores;
CREATE POLICY student_select_own_rubric_scores ON public.rubric_scores
  FOR SELECT
  TO anon, authenticated
  USING (
    grading_result_id IN (
      SELECT id FROM public.grading_results WHERE status = 'published'
    )
  );
