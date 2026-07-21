-- ─────────────────────────────────────────────────────────────
-- 047 — hr_profiles gains the onboarding fields
-- ─────────────────────────────────────────────────────────────
-- The Foundation onboarding design collects five things hr_profiles has
-- never had. Landing the columns now so the onboarding task that follows
-- is pure UI with no schema work in the middle of a flow that sits on the
-- trial-seeding trigger.
--
--   title     recruiter job title, shown on interview email signatures
--   phone     used for interview coordination, never shown publicly
--   industry  company industry, onboarding step two
--   region    company region, onboarding step two
--   city      company city, onboarding step two (optional in the design)
--
-- ALL NULLABLE, no defaults, no backfill. Every existing employer keeps
-- working with these empty, and nothing reads them until the onboarding
-- UI ships. Additive only: this cannot break a running deploy, and it is
-- safe to apply before or after any code deploy.
--
-- SECURITY NOTE. hr_profiles carries an RLS policy of
--     CREATE POLICY "HR sees own profile" ON hr_profiles FOR ALL USING (auth.uid() = user_id)
-- so a recruiter can write these five columns themselves. That is correct
-- for profile data they own. It is also exactly why entitlement lives in
-- hr_entitlements (046) and NOT on this table: anything on hr_profiles is
-- client-writable, so no billing state may ever live here.
--
-- phone is stored as text on purpose. It is a dial string with a country
-- prefix, not a number, and must survive leading zeros and spacing.
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS title    text;
ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS phone    text;
ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS region   text;
ALTER TABLE public.hr_profiles ADD COLUMN IF NOT EXISTS city     text;

COMMENT ON COLUMN public.hr_profiles.title IS
  'Recruiter job title. Appears on interview invites and email signatures so candidates know who they are speaking with.';
COMMENT ON COLUMN public.hr_profiles.phone IS
  'Recruiter phone as a dial string including country prefix. Used for interview coordination, never shown publicly. Text, not numeric, so leading zeros and spacing survive.';
COMMENT ON COLUMN public.hr_profiles.industry IS 'Company industry, collected at onboarding.';
COMMENT ON COLUMN public.hr_profiles.region   IS 'Company region, collected at onboarding.';
COMMENT ON COLUMN public.hr_profiles.city     IS 'Company city, collected at onboarding. Optional in the design.';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='hr_profiles'
    AND column_name IN ('title','phone','industry','region','city');
  RAISE NOTICE '047: hr_profiles now has % of the 5 onboarding columns', n;
END $$;
