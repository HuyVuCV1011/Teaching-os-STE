-- ====================================================================
-- MIGRATION: CMS DATA CONTENT WRITE ACCESS POLICIES (PERMISSIVE)
-- ====================================================================

-- 1. Policies for subjects
DROP POLICY IF EXISTS "Manage Subjects Policy" ON public.subjects;
CREATE POLICY "Manage Subjects Policy" ON public.subjects FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 2. Policies for courses
DROP POLICY IF EXISTS "Manage Courses Policy" ON public.courses;
CREATE POLICY "Manage Courses Policy" ON public.courses FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 3. Policies for modules
DROP POLICY IF EXISTS "Manage Modules Policy" ON public.modules;
CREATE POLICY "Manage Modules Policy" ON public.modules FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 4. Policies for lessons
DROP POLICY IF EXISTS "Manage Lessons Policy" ON public.lessons;
CREATE POLICY "Manage Lessons Policy" ON public.lessons FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 5. Policies for canonical_materials
DROP POLICY IF EXISTS "Manage Canonical Materials Policy" ON public.canonical_materials;
CREATE POLICY "Manage Canonical Materials Policy" ON public.canonical_materials FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 6. Policies for rubrics
DROP POLICY IF EXISTS "Manage Rubrics Policy" ON public.rubrics;
CREATE POLICY "Manage Rubrics Policy" ON public.rubrics FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 7. Policies for rubric_criteria
DROP POLICY IF EXISTS "Manage Rubric Criteria Policy" ON public.rubric_criteria;
CREATE POLICY "Manage Rubric Criteria Policy" ON public.rubric_criteria FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );

-- 8. Policies for assignments
DROP POLICY IF EXISTS "Manage Assignments Policy" ON public.assignments;
CREATE POLICY "Manage Assignments Policy" ON public.assignments FOR ALL TO authenticated, anon
  USING (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  )
  WITH CHECK (
    coalesce(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role', 
             current_setting('request.jwt.claims', true)::json->>'role', 
             'anon') IN ('admin', 'teacher', 'super-admin', 'content-admin', 'class-operator', 'anon')
  );
