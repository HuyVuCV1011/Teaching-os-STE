-- ====================================================================
-- MIGRATION: UPDATE CANONICAL MATERIALS TYPE CONSTRAINT
-- ====================================================================

-- Drop the old constraint if it exists and add the new one supporting docx, csv, xlsx
ALTER TABLE public.canonical_materials DROP CONSTRAINT IF EXISTS canonical_materials_type_check;
ALTER TABLE public.canonical_materials ADD CONSTRAINT canonical_materials_type_check CHECK (
  type::text = ANY (ARRAY[
    'pdf'::character varying, 
    'docx'::character varying, 
    'csv'::character varying, 
    'xlsx'::character varying, 
    'code_repo'::character varying, 
    'flow_diagram'::character varying, 
    'link'::character varying
  ]::text[])
);
