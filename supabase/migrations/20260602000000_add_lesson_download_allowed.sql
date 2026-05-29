-- ====================================================================
-- MIGRATION: ADD LESSON DOWNLOAD ALLOWED TOGGLE AND TYPE CONSTRAINTS
-- ====================================================================

-- 1. Add download_allowed column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS download_allowed BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Drop the old constraint if it exists and add the new one supporting markdown and json
ALTER TABLE public.canonical_materials DROP CONSTRAINT IF EXISTS canonical_materials_type_check;
ALTER TABLE public.canonical_materials ADD CONSTRAINT canonical_materials_type_check CHECK (
  type::text = ANY (ARRAY[
    'pdf'::character varying, 
    'docx'::character varying, 
    'csv'::character varying, 
    'xlsx'::character varying, 
    'code_repo'::character varying, 
    'flow_diagram'::character varying, 
    'link'::character varying,
    'markdown'::character varying,
    'json'::character varying
  ]::text[])
);
