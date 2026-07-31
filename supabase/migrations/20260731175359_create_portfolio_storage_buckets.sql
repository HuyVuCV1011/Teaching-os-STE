-- Portfolio media is public by product design, but all mutations remain
-- server-only through the service-role protected admin actions.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'thumbnails',
    'thumbnails',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'files',
    'files',
    true,
    104857600,
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No INSERT, UPDATE, or DELETE policies are created for anon/authenticated.
-- Admin uploads use a server-only service-role client, so direct public writes
-- stay denied by storage.objects RLS.
