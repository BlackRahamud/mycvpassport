-- ─────────────────────────────────────────────────────────────
-- 022 — job description images: public Storage bucket
-- ─────────────────────────────────────────────────────────────
-- The Post-a-Job description editor lets an employer drop an image
-- into the listing body. The file is uploaded straight from the
-- browser to Supabase Storage (no Vercel function), and the editor
-- stores the returned PUBLIC URL as an <img src> — never base64.
--
-- Bucket is PUBLIC (read) because the image is embedded in a public
-- job page anyone can view. Writes are locked to the owning employer:
-- the first path segment must equal their auth uid.
--
-- Path layout written by the client:  {hr_uid}/{ts}-{rand}.{ext}
--
-- ⚠️  Apply this migration in Supabase BEFORE the employer tries to
--     upload an image, or the storage upload will 400 (bucket missing).
-- ─────────────────────────────────────────────────────────────

-- 1. Public bucket for job images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-assets', 'job-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS on objects in this bucket. (RLS is already enabled on
--    storage.objects by Supabase; we only add bucket-scoped policies.)

-- Anyone may READ (public job images). Public buckets serve the
-- /object/public/ endpoint without auth; this explicit policy also lets
-- the authenticated API read them.
DROP POLICY IF EXISTS "Public read job assets" ON storage.objects;
CREATE POLICY "Public read job assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-assets');

-- Employer may UPLOAD into their own folder (first path segment = uid).
DROP POLICY IF EXISTS "Employer uploads own job asset" ON storage.objects;
CREATE POLICY "Employer uploads own job asset" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Employer may OVERWRITE / DELETE their own files.
DROP POLICY IF EXISTS "Employer updates own job asset" ON storage.objects;
CREATE POLICY "Employer updates own job asset" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'job-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employer deletes own job asset" ON storage.objects;
CREATE POLICY "Employer deletes own job asset" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
