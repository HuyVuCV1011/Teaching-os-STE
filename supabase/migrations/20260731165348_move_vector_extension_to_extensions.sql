-- Keep pgvector outside the exposed public schema, as recommended by Supabase.
-- Existing vector columns and indexes retain their object dependencies when the
-- relocatable extension changes schema.
ALTER EXTENSION vector SET SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- The similarity functions resolve pgvector operators at execution time.
-- Include the extension schema while retaining the hardened public search path.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('match_grading_feedback', 'match_submission_embeddings')
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, extensions',
      fn
    );
  END LOOP;
END $$;
