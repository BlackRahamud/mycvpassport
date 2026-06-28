-- ─────────────────────────────────────────────────────────────
-- 022 — Fix candidate write-injection (RLS audit GAP-1 / GAP-2)
-- ─────────────────────────────────────────────────────────────
-- The candidate-facing write policies on `applications` (INSERT/UPDATE)
-- and `candidate_events` (INSERT) validated only the WRITER's identity
-- (candidate_id = auth.uid()) but NOT the hr_id stamped on the row. A
-- candidate could therefore write a row tagged with an ARBITRARY agency's
-- hr_id (with is_visible_to_hr = true), injecting a fabricated application
-- or event into that agency's pipeline / journey feed.
--
-- This migration binds hr_id to the referenced job's TRUE owner on every
-- candidate write path, so a candidate can only stamp the hr_id that
-- actually owns the job they are writing against.
--
-- SCOPE — this migration ONLY tightens WITH CHECK on three candidate write
-- policies. It does NOT touch any SELECT (read) policy, the HR-side
-- applications policies, candidate_events HR self-insert, the interviews
-- policies, or storage. No read path is weakened.
--
-- Why the legitimate writes still pass (verified against the client):
--   • applications apply/reapply (src/pages/JobPage.jsx) always sets
--     hr_id = job.hr_id and job_id = job.id → the binding holds.
--   • candidate journey event ('applied'/'reapplied', JobPage.jsx) sets
--     hr_id = job.hr_id and job_id = job.id → the binding holds.
--   • analytics events (src/lib/analytics/logEvent.js) write candidate_id
--     only, with hr_id = NULL and job_id = NULL. A NULL hr_id targets no
--     agency and is invisible to every HR SELECT (auth.uid() = hr_id never
--     matches NULL), so it is NOT an injection vector — the candidate
--     branch keeps allowing hr_id IS NULL to preserve analytics logging.
--   • all other candidate_events inserts (WhatsAppComposer,
--     ScheduleInterviewModal, JobPipelinePage) are HR-side and take the
--     auth.uid() = hr_id branch, which is unchanged.
--
-- Note: the hr_id sub-select reads `jobs` under the caller's RLS. Live jobs
-- (status published/active) are publicly readable, so the lookup resolves
-- for any job a candidate can legitimately apply to. Applying/re-applying
-- to a non-live job (draft/closed) yields a NULL lookup and is correctly
-- rejected — which is the desired behaviour.
--
-- Drop-and-recreate so the migration is idempotent.
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- ── applications: candidate INSERT — bind hr_id to the job's true owner ──
DROP POLICY IF EXISTS "Candidate inserts own application" ON applications;
CREATE POLICY "Candidate inserts own application" ON applications
  FOR INSERT
  WITH CHECK (
    auth.uid() = candidate_id
    AND hr_id = (SELECT j.hr_id FROM jobs j WHERE j.id = job_id)
  );

-- ── applications: candidate UPDATE — keep USING, ADD a matching WITH CHECK
--    (today this policy has no WITH CHECK, so the new row is unvalidated). ──
DROP POLICY IF EXISTS "Candidate updates own application" ON applications;
CREATE POLICY "Candidate updates own application" ON applications
  FOR UPDATE
  USING (auth.uid() = candidate_id)
  WITH CHECK (
    auth.uid() = candidate_id
    AND hr_id = (SELECT j.hr_id FROM jobs j WHERE j.id = job_id)
  );

-- ── candidate_events: tighten the candidate INSERT path; keep HR self-insert.
--    HR branch (auth.uid() = hr_id) unchanged. Candidate branch now requires
--    hr_id to be NULL (analytics) OR equal to the related job's true owner. ──
DROP POLICY IF EXISTS "System inserts events" ON candidate_events;
CREATE POLICY "System inserts events" ON candidate_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = hr_id
    OR (
      auth.uid() = candidate_id
      AND (
        hr_id IS NULL
        OR hr_id = (SELECT j.hr_id FROM jobs j WHERE j.id = job_id)
      )
    )
  );

COMMIT;
