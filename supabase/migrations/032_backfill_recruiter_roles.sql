-- 032_backfill_recruiter_roles.sql
--
-- Repairs employer accounts created while recruiter signup was silently
-- broken: trimAuthFields() dropped userType/workEmail/companyName, so
-- every "Employer" signup landed as a plain candidate — no user_type,
-- no hr_profiles row, company name discarded.
--
-- Job ownership (jobs.hr_id) is the only reliable marker of HR-portal
-- usage, so roles are assigned from it. Additive + idempotent: no rows
-- are deleted, no user_type is ever downgraded.

-- 1) Job owners who ALSO have candidate-side artifacts (built CVs or
--    applications as a candidate) wear both hats.
UPDATE public.profiles p
SET user_type = 'both'
WHERE EXISTS (SELECT 1 FROM public.jobs j WHERE j.hr_id = p.id)
  AND (
    EXISTS (SELECT 1 FROM public.cvs c WHERE c.user_id = p.id)
    OR EXISTS (SELECT 1 FROM public.applications a WHERE a.candidate_id = p.id)
  )
  AND p.user_type IS DISTINCT FROM 'both';

-- 2) Remaining job owners become recruiters.
UPDATE public.profiles p
SET user_type = 'recruiter'
WHERE EXISTS (SELECT 1 FROM public.jobs j WHERE j.hr_id = p.id)
  AND p.user_type IS DISTINCT FROM 'both'
  AND p.user_type IS DISTINCT FROM 'recruiter';

-- 3) hr_profiles rows for recruiters missing one. company_name is NOT NULL:
--    recover it from the most recent job posting (jobs.company is NOT NULL),
--    falling back to any profiles.company_name captured at signup.
INSERT INTO public.hr_profiles (user_id, company_name, work_email)
SELECT p.id,
       COALESCE(
         (SELECT j.company
          FROM public.jobs j
          WHERE j.hr_id = p.id AND j.company <> ''
          ORDER BY j.created_at DESC
          LIMIT 1),
         NULLIF(p.company_name, ''),
         'Unknown company'
       ),
       COALESCE(p.work_email, '')
FROM public.profiles p
WHERE p.user_type IN ('recruiter', 'both')
  AND NOT EXISTS (SELECT 1 FROM public.hr_profiles h WHERE h.user_id = p.id);
