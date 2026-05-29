-- Add display_order column to canonical_materials
ALTER TABLE public.canonical_materials ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Function to bulk update display_order in a transaction
CREATE OR REPLACE FUNCTION public.reorder_canonical_materials(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates) LOOP
    UPDATE public.canonical_materials
    SET display_order = (item->>'display_order')::integer
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
