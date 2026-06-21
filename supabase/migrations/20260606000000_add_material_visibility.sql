-- ====================================================================
-- MIGRATION: ADD AUDIENCE VISIBILITY TO CANONICAL MATERIALS
-- ====================================================================

-- 1. Add visibility column with default 'student'
ALTER TABLE public.canonical_materials ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'student';

-- 2. Backfill existing records to ensure they have 'student' visibility
UPDATE public.canonical_materials SET visibility = 'student' WHERE visibility IS NULL;

-- 3. Add constraint to restrict visibility to allowed values
ALTER TABLE public.canonical_materials DROP CONSTRAINT IF EXISTS canonical_materials_visibility_check;
ALTER TABLE public.canonical_materials ADD CONSTRAINT canonical_materials_visibility_check CHECK (
  visibility = ANY (ARRAY['student'::text, 'teacher'::text, 'both'::text])
);
