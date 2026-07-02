-- 033_companies_schema.sql
--
-- Companies + memberships, SCHEMA-ONLY (locked decision: no RLS rewrite of
-- jobs/applications — hr_id scoping stays canonical). This lays the ground
-- for multi-recruiter teams later: a recruiter belongs to a company via
-- company_members (owner|member); hr_profiles gains a company_id link.
-- Backfill creates one company per existing recruiter, owner = that user.

-- 1) companies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text,
  website text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2) company_members (owner|member)
CREATE TABLE IF NOT EXISTS public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS company_members_user_idx
  ON public.company_members(user_id);

-- 3) Link recruiter profile → company
ALTER TABLE public.hr_profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 4) RLS
-- NOTE: policies on company_members deliberately avoid subqueries on
-- company_members itself (Postgres RLS self-reference recurses). Teammate
-- visibility / invites are Phase-6; a SECURITY DEFINER membership helper
-- gets added when that lands.

-- Members read their company.
CREATE POLICY "Members read own company" ON public.companies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members m
      WHERE m.company_id = companies.id AND m.user_id = auth.uid()
    )
  );

-- Any authenticated user can create a company (employer onboarding grants
-- the recruiter role in the same flow).
CREATE POLICY "Authenticated creates company" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Only owners update company details.
CREATE POLICY "Owner updates company" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- Users see their own memberships.
CREATE POLICY "User reads own memberships" ON public.company_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- A user may only add THEMSELVES, and only to a company they created
-- (the onboarding create-company → become-owner step). Invites come later.
CREATE POLICY "Creator joins own company" ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.created_by = auth.uid()
    )
  );

-- 5) Backfill: one company per recruiter profile without one. Idempotent —
--    re-running skips rows that already have company_id set.
WITH created AS (
  INSERT INTO public.companies (name, size, created_by)
  SELECT h.company_name, h.company_size, h.user_id
  FROM public.hr_profiles h
  WHERE h.company_id IS NULL
  RETURNING id, created_by
)
UPDATE public.hr_profiles h
SET company_id = c.id
FROM created c
WHERE h.user_id = c.created_by
  AND h.company_id IS NULL;

INSERT INTO public.company_members (company_id, user_id, role)
SELECT h.company_id, h.user_id, 'owner'
FROM public.hr_profiles h
WHERE h.company_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;
