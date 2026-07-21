-- ─────────────────────────────────────────────────────────────
-- 046 — HR entitlement spine
-- ─────────────────────────────────────────────────────────────
-- The employer portal has never had server-side entitlement. hr_profiles.plan
-- (001) has been written by nothing and read by nothing since creation, and
-- the only gate that ships is a client-side 90 day clock in src/utils/freeTier.js
-- which anyone can edit in devtools.
--
-- WHY A DEDICATED TABLE, NOT hr_profiles.plan
-- 001_hr_jobs_schema.sql:149 declares:
--     CREATE POLICY "HR sees own profile" ON hr_profiles FOR ALL USING (auth.uid() = user_id);
-- FOR ALL covers UPDATE, and the app already updates that row with the
-- user's own JWT (recruiterStatus.js:62, useCvpAuth.js:158). Putting the
-- entitlement there would let any employer grant themselves Foundation
-- from the browser console. This table has SELECT-only RLS and no write
-- policy at all, so only the service role can write it.
--
-- KEY IS user_id, NOT company_id
-- Everything that consults this is keyed to hr_id = auth.uid(): jobs (001:155),
-- applications (001:164), the RESTRICTIVE post gate (035:12). companies /
-- company_members are schema-only by locked decision. company_id is stored
-- but never read, so multi-seat later is a key swap in one table.
--
-- LIMITS LIVE IN SQL
-- Two things need the limits: the JS resolver and the trigger that actually
-- blocks a job insert. If the map lived in JS the trigger would need a second
-- copy and they would drift. hr_plan_limits() is the one definition; the app
-- reads it through hr_my_entitlement().
--
-- NO CRON. Expiry is derived at read time in hr_effective_entitlement().
-- Stored status is the last written intent, not the effective state.
--
-- TIME. current_period_end is a plain timestamptz, a UTC instant. No timezone
-- string is stored anywhere. Countdowns render in device time on the client.
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

-- Trial length, used by BOTH the signup trigger and the backfill below.
-- Founder decision: 30 days.

-- ═══════════════════════════════════════════════════════════════
-- 1. Table
-- ═══════════════════════════════════════════════════════════════
-- company_id carries NO inline foreign key. public.companies is created by
-- migration 033, which is tracked as pending in the live database, and an
-- inline REFERENCES would make this whole migration fail there. The FK is
-- added conditionally below if and only if companies exists. The column is
-- stored for future multi-seat and is read by nothing today, so its absence
-- of a constraint changes no behaviour.
CREATE TABLE IF NOT EXISTS public.hr_entitlements (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id           uuid,
  plan                 text NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free','foundation')),
  status               text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('trial','active','expired')),
  current_period_end   timestamptz,
  source               text NOT NULL
                         CHECK (source IN ('signup_trial','ziina','razorpay','backfill','manual','self_heal')),
  baseline_active_jobs integer NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Attach the companies FK only if 033 has actually been applied.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='companies')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='hr_entitlements_company_id_fkey')
  THEN
    ALTER TABLE public.hr_entitlements
      ADD CONSTRAINT hr_entitlements_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
    RAISE NOTICE '046: companies FK attached';
  ELSE
    RAISE NOTICE '046: companies table absent or FK present, skipping FK';
  END IF;
END $$;

COMMENT ON TABLE public.hr_entitlements IS
  'Employer entitlement. One row per recruiter (auth.users id). Service role writes only; owner reads only. Expiry is derived at read time by hr_effective_entitlement(), never by a scheduled job.';
COMMENT ON COLUMN public.hr_entitlements.baseline_active_jobs IS
  'Grandfather floor. Active job count recorded at backfill so a tighter new cap never blocks an employer below what they already had. Enforcement uses GREATEST(plan limit, this).';
COMMENT ON COLUMN public.hr_entitlements.current_period_end IS
  'UTC instant when the trial or paid period lapses. NULL means permanent (free tier).';

-- ═══════════════════════════════════════════════════════════════
-- 2. Limits map — the ONE definition
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_plan_limits(p_plan text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_plan
    WHEN 'foundation' THEN
      '{"active_jobs": 3, "ai_evaluation": true,  "analytics": true}'::jsonb
    ELSE
      '{"active_jobs": 1, "ai_evaluation": false, "analytics": false}'::jsonb
  END;
$$;

COMMENT ON FUNCTION public.hr_plan_limits(text) IS
  'Plan to limits. Single source of truth, read by both hr_effective_entitlement() and the jobs insert trigger. Unknown or NULL plan falls through to free, which is the safe direction.';

-- ═══════════════════════════════════════════════════════════════
-- 3. Active job count (what the cap actually counts)
-- ═══════════════════════════════════════════════════════════════
-- kind='pool' rows are created by the bulk-import and verdict RPCs
-- (028, 036) as containers, never as listings, and are excluded here.
-- COALESCE covers rows written before 027 added the column.
CREATE OR REPLACE FUNCTION public.hr_active_job_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::integer
  FROM public.jobs j
  WHERE j.hr_id = p_user_id
    AND j.source = 'hr_portal'
    AND COALESCE(j.kind, 'active') = 'active'
    AND j.status IN ('active', 'published');
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. Resolver — lazy expiry, no writeback
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_effective_entitlement(p_user_id uuid)
RETURNS TABLE (
  plan       text,
  status     text,
  period_end timestamptz,
  limits     jsonb,
  baseline   integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.hr_entitlements%ROWTYPE;
  eff_plan   text;
  eff_status text;
BEGIN
  SELECT * INTO r FROM public.hr_entitlements e WHERE e.user_id = p_user_id;

  IF NOT FOUND THEN
    -- No row: treat as free. The seed trigger and the backfill mean this
    -- should not happen for a real employer; returning free rather than
    -- raising keeps a read path from breaking a page.
    RETURN QUERY SELECT 'free'::text, 'active'::text, NULL::timestamptz,
                        public.hr_plan_limits('free'), 0;
    RETURN;
  END IF;

  eff_plan   := r.plan;
  eff_status := r.status;

  -- Lapsed trial or lapsed paid period both fall back to free. Derived
  -- every read; nothing is written here, so this function stays STABLE
  -- and safe to call from a trigger.
  IF r.current_period_end IS NOT NULL
     AND r.current_period_end <= pg_catalog.now()
     AND r.status IN ('trial', 'active')
     AND r.plan <> 'free'
  THEN
    eff_plan   := 'free';
    eff_status := 'expired';
  END IF;

  RETURN QUERY SELECT eff_plan, eff_status, r.current_period_end,
                      public.hr_plan_limits(eff_plan), r.baseline_active_jobs;
END;
$$;

-- Authenticated wrapper: resolves auth.uid() and nothing else, so it
-- cannot be pointed at another employer's entitlement.
CREATE OR REPLACE FUNCTION public.hr_my_entitlement()
RETURNS TABLE (
  plan       text,
  status     text,
  period_end timestamptz,
  limits     jsonb,
  baseline   integer,
  active_jobs integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
    SELECT e.plan, e.status, e.period_end, e.limits, e.baseline,
           public.hr_active_job_count(uid)
    FROM public.hr_effective_entitlement(uid) e;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Trial seeding on employer signup
-- ═══════════════════════════════════════════════════════════════
-- hr_profiles rows are created client-side (recruiterStatus.js:62), so the
-- trial cannot be seeded by the client without giving it write access to
-- this table. A trigger seeds it server-side regardless of who inserts.
-- ON CONFLICT DO NOTHING so signup can never fail because of this.
CREATE OR REPLACE FUNCTION public.hr_seed_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.hr_entitlements
    (user_id, company_id, plan, status, current_period_end, source, baseline_active_jobs)
  VALUES
    (NEW.user_id, NEW.company_id, 'foundation', 'trial',
     pg_catalog.now() + interval '30 days', 'signup_trial', 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr_profiles_seed_trial ON public.hr_profiles;
CREATE TRIGGER hr_profiles_seed_trial
  AFTER INSERT ON public.hr_profiles
  FOR EACH ROW EXECUTE FUNCTION public.hr_seed_trial();

-- ═══════════════════════════════════════════════════════════════
-- 6. Enforcement — active job cap
-- ═══════════════════════════════════════════════════════════════
-- A TRIGGER, not a RESTRICTIVE policy, on purpose:
--   * it fires for the service role too, closing the direct client insert
--     at CandidatesPage.jsx:1243 and the RPC inserts in 028 and 036,
--     which an RLS policy would not;
--   * RAISE gives an honest message where an RLS violation gives a
--     generic one.
-- Only real listings are counted or blocked. Drafts, closed jobs, pools
-- and non-portal rows pass straight through.
CREATE OR REPLACE FUNCTION public.hr_enforce_job_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ent      record;
  used     integer;
  allowed  integer;
BEGIN
  IF NEW.source IS DISTINCT FROM 'hr_portal'
     OR COALESCE(NEW.kind, 'active') <> 'active'
     OR NEW.status NOT IN ('active', 'published')
  THEN
    RETURN NEW;
  END IF;

  IF NEW.hr_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Self-heal: an employer with no entitlement row is grandfathered at
  -- their current count rather than blocked. Backfill and the seed
  -- trigger mean this is an anomaly path, not the normal one.
  IF NOT EXISTS (SELECT 1 FROM public.hr_entitlements e WHERE e.user_id = NEW.hr_id) THEN
    INSERT INTO public.hr_entitlements
      (user_id, plan, status, current_period_end, source, baseline_active_jobs)
    VALUES
      (NEW.hr_id, 'free', 'active', NULL, 'self_heal',
       public.hr_active_job_count(NEW.hr_id))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  SELECT * INTO ent FROM public.hr_effective_entitlement(NEW.hr_id);

  used    := public.hr_active_job_count(NEW.hr_id);
  allowed := GREATEST((ent.limits ->> 'active_jobs')::integer, ent.baseline);

  IF used >= allowed THEN
    RAISE EXCEPTION
      'You have reached your plan limit of % active jobs. Close a listing or upgrade to post another.',
      allowed
      USING ERRCODE = 'HR001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_enforce_limit ON public.jobs;
CREATE TRIGGER jobs_enforce_limit
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.hr_enforce_job_limit();

-- ═══════════════════════════════════════════════════════════════
-- 7. Activation, called from the webhook grant path
-- ═══════════════════════════════════════════════════════════════
-- Idempotency is handled UPSTREAM by the payments.payment_intent_id
-- unique index plus the webhook's existing short-circuit, exactly as the
-- candidate grants are. This function is therefore a plain upsert: it is
-- only reached once per payment intent.
--
-- NO AUTO RENEW. This extends by p_days from now and stops. When auto
-- renew is built it plugs in HERE, by scheduling the next charge off
-- current_period_end; nothing else in the spine needs to change.
CREATE OR REPLACE FUNCTION public.grant_hr_foundation(
  p_user_id uuid,
  p_days    integer,
  p_source  text
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_end timestamptz;
BEGIN
  IF p_source NOT IN ('ziina','razorpay','manual') THEN
    RAISE EXCEPTION 'grant_hr_foundation: bad source %', p_source USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.hr_entitlements
    (user_id, plan, status, current_period_end, source, updated_at)
  VALUES
    (p_user_id, 'foundation', 'active',
     GREATEST(pg_catalog.now(), pg_catalog.now()) + (p_days || ' days')::interval,
     p_source, pg_catalog.now())
  ON CONFLICT (user_id) DO UPDATE SET
    plan   = 'foundation',
    status = 'active',
    -- Stack from the later of now or any remaining time, so paying while
    -- a trial is still running does not throw away the unused days.
    current_period_end = GREATEST(
      pg_catalog.now(),
      COALESCE(public.hr_entitlements.current_period_end, pg_catalog.now())
    ) + (p_days || ' days')::interval,
    source     = p_source,
    updated_at = pg_catalog.now()
  RETURNING current_period_end INTO new_end;

  RETURN new_end;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8. RLS — owner reads, service role writes
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.hr_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_entitlements read own" ON public.hr_entitlements;
CREATE POLICY "hr_entitlements read own"
  ON public.hr_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Deliberately NO insert/update/delete policy. The service role bypasses
-- RLS, which is how the webhook writes. FOR SELECT rather than FOR ALL is
-- the whole point: the FOR ALL on hr_profiles is the mistake this avoids.

-- ═══════════════════════════════════════════════════════════════
-- 9. Function grants
-- ═══════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.grant_hr_foundation(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_hr_foundation(uuid, integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.hr_effective_entitlement(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.hr_effective_entitlement(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.hr_active_job_count(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.hr_active_job_count(uuid) TO service_role;

-- The only function the browser may call. Resolves auth.uid() only.
GRANT EXECUTE ON FUNCTION public.hr_my_entitlement() TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 10. Backfill — grandfather everyone, expire nobody
-- ═══════════════════════════════════════════════════════════════
-- Every existing employer gets the same 30 day Foundation trial a new
-- signup gets, plus a baseline equal to what they already have live, so
-- the tighter free cap can never block them below their status quo.
-- Existing jobs are not touched, hidden, closed or expired by this.
-- hr_profiles.company_id is also added by 033, so the backfill reads it
-- only when the column exists. Dynamic SQL keeps this one statement from
-- failing on a database where 033 has not run.
DO $$
DECLARE
  has_company_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hr_profiles' AND column_name='company_id'
  ) INTO has_company_id;

  EXECUTE format($f$
    INSERT INTO public.hr_entitlements
      (user_id, company_id, plan, status, current_period_end, source, baseline_active_jobs)
    SELECT h.user_id, %s, 'foundation', 'trial',
           pg_catalog.now() + interval '30 days', 'backfill',
           public.hr_active_job_count(h.user_id)
    FROM public.hr_profiles h
    WHERE h.user_id IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING
  $f$, CASE WHEN has_company_id THEN 'h.company_id' ELSE 'NULL::uuid' END);

  RAISE NOTICE '046: backfill done (company_id column present: %)', has_company_id;
END $$;

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.hr_entitlements;
  RAISE NOTICE '046: hr_entitlements now holds % rows', n;
END $$;
