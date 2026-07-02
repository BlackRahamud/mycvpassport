-- rls_tenant_scoping.sql — NOT a migration. Run in the Supabase SQL editor
-- after applying migrations 032-035 to verify the tenant-scoping and
-- role-gating posture. Every query below must return ok = true rows only;
-- any row with ok = false is a policy regression.

-- 1) RLS is enabled on every employer-side table.
SELECT c.relname AS table_name, c.relrowsecurity AS ok
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('jobs', 'applications', 'candidate_events', 'hr_profiles',
                    'interviews', 'companies', 'company_members')
ORDER BY c.relname;

-- 2) The tenant-scoping policies exist (HR reads only their own rows —
--    a recruiter can never see another company's applicants).
SELECT expected.policyname,
       EXISTS (
         SELECT 1 FROM pg_policies p
         WHERE p.schemaname = 'public'
           AND p.tablename  = expected.tablename
           AND p.policyname = expected.policyname
       ) AS ok
FROM (VALUES
  ('jobs',             'HR manages own jobs'),
  ('jobs',             'Job posting requires recruiter profile'),     -- 035, RESTRICTIVE
  ('applications',     'HR sees visible applications for own jobs'),
  ('applications',     'Candidate sees own applications'),
  ('candidate_events', 'HR sees events for own jobs'),
  ('hr_profiles',      'HR sees own profile'),
  ('companies',        'Members read own company'),
  ('companies',        'Creator reads own company'),                  -- 034
  ('company_members',  'User reads own memberships'),
  ('company_members',  'Creator joins own company')
) AS expected(tablename, policyname);

-- 3) The 035 job-posting gate is RESTRICTIVE (ANDs with the permissive
--    ownership policy instead of widening it).
SELECT policyname, permissive = 'RESTRICTIVE' AS ok
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'jobs'
  AND policyname = 'Job posting requires recruiter profile';

-- 4) Backfill sanity (032): every job owner holds a recruiter role and an
--    hr_profiles row. Zero rows returned = ok.
SELECT DISTINCT j.hr_id AS unrepaired_job_owner
FROM public.jobs j
LEFT JOIN public.profiles p ON p.id = j.hr_id
LEFT JOIN public.hr_profiles h ON h.user_id = j.hr_id
WHERE p.user_type NOT IN ('recruiter', 'both') OR h.user_id IS NULL;

-- 5) Companies backfill sanity (033): every hr_profile links to a company
--    whose membership includes the recruiter as owner. Zero rows = ok.
--    (New signups get their company self-healed on first portal entry, so
--    transient rows here right after signup are expected — re-run.)
SELECT h.user_id AS recruiter_missing_company
FROM public.hr_profiles h
LEFT JOIN public.company_members m
  ON m.company_id = h.company_id AND m.user_id = h.user_id
WHERE h.company_id IS NULL OR m.user_id IS NULL;
