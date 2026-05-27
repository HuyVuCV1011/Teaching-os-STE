-- ====================================================================
-- MIGRATION: ADD ASSIGNMENT FILE LIMITS AND RUBRIC SNAPSHOTS
-- ====================================================================

-- 1. Create rubric_snapshots table to hold static criteria snapshots
CREATE TABLE IF NOT EXISTS public.rubric_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rubric_snapshots_pkey PRIMARY KEY (id)
);

-- 2. Alter assignments table to add maximum files, max size, and snapshot reference
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS max_files integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_total_size_mb integer NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS rubric_snapshot_id uuid REFERENCES public.rubric_snapshots(id) ON DELETE SET NULL;

-- 3. Alter submissions table to add snapshot reference captured at submission time
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS rubric_snapshot_id uuid REFERENCES public.rubric_snapshots(id) ON DELETE SET NULL;

-- 4. Enable RLS on rubric_snapshots
ALTER TABLE public.rubric_snapshots ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS policies for rubric_snapshots
DROP POLICY IF EXISTS select_snapshots ON public.rubric_snapshots;
CREATE POLICY select_snapshots ON public.rubric_snapshots 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_snapshots ON public.rubric_snapshots;
CREATE POLICY insert_snapshots ON public.rubric_snapshots 
  FOR INSERT WITH CHECK (true);
