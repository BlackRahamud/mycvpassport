-- ─────────────────────────────────────────────────────────────
-- 018 — Interviews (HR schedules a candidate interview)
-- ─────────────────────────────────────────────────────────────
-- One row per scheduled interview, owned by the HR who created it.
-- Tied to an application (and denormalised job_id / candidate_id for
-- convenient, RLS-cheap reads). HR-scoped throughout: every policy keys
-- off hr_id = auth.uid(), matching the jobs/applications convention in
-- 001_hr_jobs_schema.sql.
--
-- Wrap in BEGIN; ... COMMIT; when running in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.interviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id        uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  hr_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id  uuid REFERENCES auth.users(id),
  scheduled_at  timestamptz NOT NULL,
  duration_min  integer DEFAULT 30,
  meeting_link  text,
  note          text,
  status        text DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at    timestamptz DEFAULT now()
);

-- HR's calendar reads ("my upcoming interviews"); plus per-application lookup.
CREATE INDEX IF NOT EXISTS interviews_hr_scheduled_idx
  ON public.interviews (hr_id, scheduled_at);
CREATE INDEX IF NOT EXISTS interviews_application_idx
  ON public.interviews (application_id);

COMMENT ON TABLE public.interviews IS
  'Interviews scheduled by an HR for a candidate application. HR-owned (hr_id = auth.uid()); RLS lets the owning HR SELECT/INSERT/UPDATE their own rows only.';

-- ─────────────────────────────────────────────────────────────
-- RLS — HR can SELECT / INSERT / UPDATE only their own rows.
-- No DELETE policy (denied by default). service_role bypasses RLS.
-- Drop-and-recreate so the migration is idempotent.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR selects own interviews" ON public.interviews;
CREATE POLICY "HR selects own interviews"
  ON public.interviews
  FOR SELECT
  TO authenticated
  USING (hr_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "HR inserts own interviews" ON public.interviews;
CREATE POLICY "HR inserts own interviews"
  ON public.interviews
  FOR INSERT
  TO authenticated
  WITH CHECK (hr_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "HR updates own interviews" ON public.interviews;
CREATE POLICY "HR updates own interviews"
  ON public.interviews
  FOR UPDATE
  TO authenticated
  USING (hr_id = (SELECT auth.uid()))
  WITH CHECK (hr_id = (SELECT auth.uid()));

COMMIT;
