-- Alter public.assignments to support solutions and track the AI model used
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS solution_storage_path TEXT,
ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(80) NOT NULL DEFAULT 'ollama';

-- Alter public.rubric_criteria to support evaluation hints (regex/exact rules)
ALTER TABLE public.rubric_criteria
ADD COLUMN IF NOT EXISTS evaluation_hints JSONB NOT NULL DEFAULT '{}'::jsonb;


-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('student-submissions', 'student-submissions', false, 52428800, NULL), -- 50MB
  ('assignment-solutions', 'assignment-solutions', false, 10485760, NULL) -- 10MB
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects inside assignment-solutions
-- Enable RLS on storage.objects if not enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Select policy: Only authenticated instructors/admins/teachers can view solutions
DROP POLICY IF EXISTS "Select Solutions Policy" ON storage.objects;
CREATE POLICY "Select Solutions Policy" ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (
    bucket_id = 'assignment-solutions' AND (
      -- Check role in request JWT metadata
      current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
      OR
      current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
    )
  );

-- Insert/Delete/Update policies: Only instructors/admins/teachers can modify solutions
DROP POLICY IF EXISTS "Modify Solutions Policy" ON storage.objects;
CREATE POLICY "Modify Solutions Policy" ON storage.objects
  FOR ALL
  TO authenticated, anon
  WITH CHECK (
    bucket_id = 'assignment-solutions' AND (
      current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
      OR
      current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
    )
  )
  USING (
    bucket_id = 'assignment-solutions' AND (
      current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
      OR
      current_setting('request.jwt.claims', true)::json->>'role' IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator')
    )
  );
