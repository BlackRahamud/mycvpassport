-- ─────────────────────────────────────────────────────────────
-- 023 — HR bulk CV import: HR-insert applications RLS + source marker
-- ─────────────────────────────────────────────────────────────
-- Feature: on a job's pipeline an HR bulk-uploads existing CV files; the
-- portal parses each in the browser, structures it into a candidate, scores
-- it against the job, and drops it into the pipeline ranked best-fit first.
--
-- Two gaps this migration closes:
--
-- 1. INSERT RLS — today applications can only be inserted by the candidate
--    themselves (001 "Candidate inserts own application", tightened by 022 to
--    bind hr_id to the job's true owner). An HR has NO insert path. This adds
--    one, scoped so an HR can only insert rows against jobs they OWN and only
--    stamped with their OWN hr_id — the same ownership binding 022 enforces on
--    the candidate side, mirrored for the HR side. The client then writes the
--    row directly (supabase.from('applications').insert) with NO new
--    serverless function (the project is at the Vercel Hobby 12/12 ceiling, so
--    an edge function is not an option).
--
-- 2. source marker — imported candidates have no signup, so candidate_id is
--    NULL (exactly like the demo seed). A `source` column distinguishes them
--    from organically-applied rows for analytics and UI affordances. NULL
--    candidate_id is already safe: the column is nullable (001), UNIQUE
--    (candidate_id, job_id) treats NULLs as distinct so many imported rows can
--    coexist on one job, and the pipeline/CRM already render NULL-candidate
--    rows (proven by the seed).
--
-- NOTE on storage — no change needed here. Imported files are uploaded to
-- `{hr_id}/{job_id}-{ts}.{ext}` in the existing private applicant-cvs bucket.
-- 021's "Candidate uploads own CV" policy (foldername[1] = auth.uid()) already
-- permits the HR to write into their own uid folder, and "HR reads CVs for own
-- applications" already lets them read it back via the cv_file_path EXISTS
-- check. Files stay private to the agency — no cross-agency leakage.
--
-- HR can already UPDATE these rows for the score writeback and stage moves via
-- 001's "HR updates application status" (USING auth.uid() = hr_id) — unchanged.
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- Idempotent: column uses IF NOT EXISTS; policy is drop-and-recreate.
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- 1. source marker — how the application entered the pipeline.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS source text DEFAULT 'organic';
COMMENT ON COLUMN applications.source IS
  'How the application entered the pipeline. organic = candidate applied via /jobs (default); imported = HR bulk-uploaded an existing CV on the pipeline (candidate_id NULL, no signup).';

-- 2. HR-insert policy — an HR may insert an application ONLY for a job they
--    own, and ONLY stamped with their own hr_id. Mirrors the ownership binding
--    022 added to the candidate INSERT path. RLS is permissive (OR across
--    policies); candidate inserts still take the candidate policy, HR imports
--    take this one.
DROP POLICY IF EXISTS "HR inserts applications for own jobs" ON applications;
CREATE POLICY "HR inserts applications for own jobs" ON applications
  FOR INSERT
  WITH CHECK (
    auth.uid() = hr_id
    AND hr_id = (SELECT j.hr_id FROM jobs j WHERE j.id = job_id)
  );

COMMIT;
