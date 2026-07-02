-- 035_jobs_require_recruiter.sql
--
-- Never trust the frontend: the RequireRecruiter route guard is UX only.
-- The permissive "HR manages own jobs" policy (001) lets ANY authenticated
-- user insert a job with hr_id = their own uid. This RESTRICTIVE policy
-- ANDs on top: job creation additionally requires an hr_profiles row —
-- i.e. an account that went through employer signup/onboarding.
--
-- Run AFTER 032 (backfill creates hr_profiles for every existing job
-- owner), or legitimate recruiters would be blocked from posting.

CREATE POLICY "Job posting requires recruiter profile" ON public.jobs
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hr_profiles h WHERE h.user_id = auth.uid())
  );
