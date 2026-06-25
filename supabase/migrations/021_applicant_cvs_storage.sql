-- ─────────────────────────────────────────────────────────────
-- 021 — original applicant CV file: storage + pointer
-- ─────────────────────────────────────────────────────────────
-- Today the CV file a candidate uploads in the apply form is held in
-- React state only to gate the Submit button, then dropped — nothing
-- about the original file (photo, layout) ever survives. The HR only
-- ever sees the parsed cv_snapshot JSON.
--
-- This migration starts keeping it. The file itself lives in a PRIVATE
-- Storage bucket (applicant-cvs); the applications row keeps only a
-- short pointer (cv_file_path). Access is gated by Storage RLS + short
-- signed URLs, so no file sits on a guessable public URL.
--
-- Path layout written by the client:  {candidate_uid}/{job_id}-{ts}.{ext}
-- The first folder segment is the owner's auth uid — that is what the
-- candidate read/write policies key on.
--
-- ⚠️  Apply this migration BEFORE deploying the client that selects
--     cv_file_path, or the HR Candidates / Pipeline selects will error
--     on an unknown column.
-- ─────────────────────────────────────────────────────────────

-- 1. Pointer column on the application row (the file's path, not the file)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_file_path text;
COMMENT ON COLUMN applications.cv_file_path IS
  'Path within the private applicant-cvs Storage bucket to the original uploaded CV file ({candidate_uid}/{job_id}-{ts}.{ext}). NULL for easy-apply candidates who built their CV on CVPassport and uploaded no file.';

-- 2. Private bucket to hold the actual files (not public — never a guessable URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('applicant-cvs', 'applicant-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS on the objects in this bucket.
--    RLS is already enabled on storage.objects by Supabase; we only add
--    policies scoped to bucket_id = 'applicant-cvs'.

-- Candidate may UPLOAD into their own folder (first path segment = their uid).
DROP POLICY IF EXISTS "Candidate uploads own CV" ON storage.objects;
CREATE POLICY "Candidate uploads own CV" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'applicant-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Candidate may READ back their own uploaded CVs.
DROP POLICY IF EXISTS "Candidate reads own CV" ON storage.objects;
CREATE POLICY "Candidate reads own CV" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'applicant-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Candidate may OVERWRITE their own file on re-apply (upload with upsert).
DROP POLICY IF EXISTS "Candidate updates own CV" ON storage.objects;
CREATE POLICY "Candidate updates own CV" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'applicant-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- HR may READ a CV only if it is pointed to by one of THEIR applications.
-- The EXISTS subquery is itself filtered by the applications SELECT RLS
-- (auth.uid() = hr_id AND is_visible_to_hr), so an HR can never reach
-- another agency's files, and hidden applications stay unreachable.
DROP POLICY IF EXISTS "HR reads CVs for own applications" ON storage.objects;
CREATE POLICY "HR reads CVs for own applications" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'applicant-cvs'
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.cv_file_path = storage.objects.name
        AND a.hr_id = auth.uid()
    )
  );
