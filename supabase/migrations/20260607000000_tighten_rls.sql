-- ====================================================================
-- MIGRATION: TIGHTEN RLS POLICIES FOR SECURITY
-- ====================================================================

-- 1. Redefine trigger functions as SECURITY DEFINER to bypass RLS for system operations
CREATE OR REPLACE FUNCTION public.fn_sync_student_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Normalise email
  NEW.student_email := LOWER(TRIM(NEW.student_email));
  
  -- Insert into students registry if not exists and retrieve ID
  INSERT INTO public.students (email)
  VALUES (NEW.student_email)
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_student_id;
  
  NEW.student_id := v_student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_sync_student_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Normalise email
  NEW.student_identifier := LOWER(TRIM(NEW.student_identifier));
  
  -- Insert/get registry entry
  INSERT INTO public.students (email)
  VALUES (NEW.student_identifier)
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_student_id;
  
  NEW.student_id := v_student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Restrict INSERT and UPDATE on students table to admins/teachers
DROP POLICY IF EXISTS insert_students ON public.students;
CREATE POLICY insert_students ON public.students 
  FOR INSERT 
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
  );

DROP POLICY IF EXISTS update_students ON public.students;
CREATE POLICY update_students ON public.students 
  FOR UPDATE 
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
  );

-- 3. Restrict INSERT and DELETE on student_lesson_progress table
DROP POLICY IF EXISTS insert_progress ON public.student_lesson_progress;
CREATE POLICY insert_progress ON public.student_lesson_progress 
  FOR INSERT 
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
    OR
    student_email = coalesce(
      current_setting('request.jwt.claims', true)::json->>'email',
      current_setting('request.jwt.claims', true)::json->>'student_email'
    )
  );

DROP POLICY IF EXISTS delete_progress ON public.student_lesson_progress;
CREATE POLICY delete_progress ON public.student_lesson_progress 
  FOR DELETE 
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
    OR
    student_email = coalesce(
      current_setting('request.jwt.claims', true)::json->>'email',
      current_setting('request.jwt.claims', true)::json->>'student_email'
    )
  );
