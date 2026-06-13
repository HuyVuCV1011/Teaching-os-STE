-- ====================================================================
-- MIGRATION: ADVANCED FEATURES ROADMAP (SHOWCASE, MEMORY LOOP, SIMILARITY)
-- ====================================================================

-- 1. Alter submissions to support Student Showcase
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS showcase_requested BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS showcase_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure vector extension is enabled (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. AI Grading Memory Loop Embeddings Table
CREATE TABLE IF NOT EXISTS public.grading_feedback_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  rubric_criterion_id uuid REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  original_suggested_score numeric,
  original_suggested_feedback text,
  override_score numeric,
  override_feedback text,
  override_reason text,
  student_submission_text text,
  embedding vector(1536), -- 1536 dimensions for text-embedding-004
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grading_feedback_embeddings_pkey PRIMARY KEY (id)
);

-- 3. Submission Similarity Search Embeddings Table
CREATE TABLE IF NOT EXISTS public.submission_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  embedding vector(1536), -- 1536 dimensions for text-embedding-004
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT submission_embeddings_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.grading_feedback_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_embeddings ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies (Grants for authenticated teachers/admins)
DROP POLICY IF EXISTS admin_select_feedback_embeddings ON public.grading_feedback_embeddings;
CREATE POLICY admin_select_feedback_embeddings ON public.grading_feedback_embeddings 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_feedback_embeddings ON public.grading_feedback_embeddings;
CREATE POLICY admin_insert_feedback_embeddings ON public.grading_feedback_embeddings 
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS admin_select_submission_embeddings ON public.submission_embeddings;
CREATE POLICY admin_select_submission_embeddings ON public.submission_embeddings 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_submission_embeddings ON public.submission_embeddings;
CREATE POLICY admin_insert_submission_embeddings ON public.submission_embeddings 
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Cosine Similarity Matching Functions
CREATE OR REPLACE FUNCTION public.match_grading_feedback(
  query_embedding vector(1536),
  match_criterion_id uuid,
  match_count int
)
RETURNS TABLE (
  id uuid,
  submission_id uuid,
  rubric_criterion_id uuid,
  assignment_id uuid,
  original_suggested_score numeric,
  original_suggested_feedback text,
  override_score numeric,
  override_feedback text,
  override_reason text,
  student_submission_text text,
  similarity numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gfe.id,
    gfe.submission_id,
    gfe.rubric_criterion_id,
    gfe.assignment_id,
    gfe.original_suggested_score,
    gfe.original_suggested_feedback,
    gfe.override_score,
    gfe.override_feedback,
    gfe.override_reason,
    gfe.student_submission_text,
    (1 - (gfe.embedding <=> query_embedding))::numeric AS similarity
  FROM public.grading_feedback_embeddings gfe
  WHERE gfe.rubric_criterion_id = match_criterion_id
  ORDER BY gfe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_submission_embeddings(
  query_embedding vector(1536),
  match_assignment_id uuid,
  match_count int
)
RETURNS TABLE (
  id uuid,
  submission_id uuid,
  similarity numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.submission_id,
    (1 - (se.embedding <=> query_embedding))::numeric AS similarity
  FROM public.submission_embeddings se
  JOIN public.submissions s ON se.submission_id = s.id
  WHERE s.assignment_id = match_assignment_id
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
