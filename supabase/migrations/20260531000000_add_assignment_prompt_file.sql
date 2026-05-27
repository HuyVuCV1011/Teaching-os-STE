-- ====================================================================
-- MIGRATION: ADD ASSIGNMENT PROMPT FILE SUPPORT
-- ====================================================================

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS prompt_file_path TEXT;
