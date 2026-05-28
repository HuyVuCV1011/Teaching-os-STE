-- ====================================================================
-- MIGRATION: FORMALIZED STUDENTS REGISTRY & SYNC TRIGGERS
-- ====================================================================

-- 1. Create students registry table
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- Enable RLS for students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anon/authenticated selects (reads)
DROP POLICY IF EXISTS select_students ON public.students;
CREATE POLICY select_students ON public.students FOR SELECT USING (true);

-- Insert policy: Allow writes
DROP POLICY IF EXISTS insert_students ON public.students;
CREATE POLICY insert_students ON public.students FOR INSERT WITH CHECK (true);

-- Update policy: Allow updates
DROP POLICY IF EXISTS update_students ON public.students;
CREATE POLICY update_students ON public.students FOR UPDATE USING (true);


-- 2. Populate students registry with existing student emails from whitelist and submissions
INSERT INTO public.students (email)
SELECT DISTINCT student_email FROM public.class_enrollments
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.students (email)
SELECT DISTINCT student_identifier FROM public.submissions
ON CONFLICT (email) DO NOTHING;


-- 3. Add student_id foreign key column to class_enrollments
ALTER TABLE public.class_enrollments ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE;

-- Backfill class_enrollments
UPDATE public.class_enrollments ce
SET student_id = s.id
FROM public.students s
WHERE LOWER(TRIM(ce.student_email)) = s.email;


-- 4. Add student_id foreign key column to submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

-- Backfill submissions
UPDATE public.submissions sub
SET student_id = s.id
FROM public.students s
WHERE LOWER(TRIM(sub.student_identifier)) = s.email;


-- 5. Trigger: Automatically insert/get student ID on class_enrollments insert/update
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_student_enrollment ON public.class_enrollments;
CREATE TRIGGER tr_sync_student_enrollment
BEFORE INSERT OR UPDATE OF student_email ON public.class_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_student_enrollment();


-- 6. Trigger: Automatically insert/get student ID on submissions insert/update
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_student_submission ON public.submissions;
CREATE TRIGGER tr_sync_student_submission
BEFORE INSERT OR UPDATE OF student_identifier ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_student_submission();
