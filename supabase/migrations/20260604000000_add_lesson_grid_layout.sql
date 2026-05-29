-- Add grid_layout column to public.lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS grid_layout VARCHAR(50) NOT NULL DEFAULT '1-col';

-- Add metadata column to public.lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
