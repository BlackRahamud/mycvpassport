-- ─────────────────────────────────────────────────────────────
-- 048 — the founder account is uncapped, permanently
-- ─────────────────────────────────────────────────────────────
-- The founder/admin account hits the active job cap at its grandfathered
-- baseline. It needs unlimited active jobs, no limit banner and no
-- upgrade prompt, and that must NOT lapse when the 30 day trial expires.
--
-- WHERE THE DECISION LIVES
-- The exemption is added to hr_effective_entitlement, NOT separately to
-- the trigger and separately to the UI. Both already read that function:
-- the jobs trigger calls it directly, and the browser reaches it through
-- hr_my_entitlement. Putting the rule in one place is what stops the
-- server blocking a post the UI believed was fine.
--
-- IDENTITY
-- Matched on the same email the rest of the system already uses to
-- identify the founder (003/045 payments RLS, src/utils/founder.js). The
-- email lives in exactly ONE place in SQL, hr_founder_email(), so there
-- is no second literal to drift. No new UID is introduced anywhere.
--
-- DURABILITY
-- The founder branch is evaluated BEFORE the expiry logic, so a lapsed
-- trial can never claw the exemption back. It is not on a clock.
--
-- SECURITY
-- is_founder_user() reads auth.users, so it is SECURITY DEFINER and is
-- granted to service_role only. hr_effective_entitlement is already
-- service-role only; the browser reaches it solely through
-- hr_my_entitlement(), which resolves auth.uid() and nothing else. A
-- non-founder cannot ask for the founder's entitlement.
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

-- ═══ 1. The founder email, one place in SQL ═════════════════════
CREATE OR REPLACE FUNCTION public.hr_founder_email()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT 'connectingjunaidkhan@gmail.com'::text $$;

COMMENT ON FUNCTION public.hr_founder_email() IS
  'The founder/admin account email. Mirrors src/utils/founder.js FOUNDER_EMAILS and the payments RLS policy. Change it here and nowhere else in SQL.';

-- ═══ 2. Is this user the founder ════════════════════════════════
-- Keyed on the user id rather than auth.uid(), because the jobs trigger
-- must work for a service-role insert too, where there is no JWT.
CREATE OR REPLACE FUNCTION public.is_founder_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user_id
      AND lower(u.email) = lower(public.hr_founder_email())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_founder_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_founder_user(uuid) TO service_role;

-- ═══ 3. Resolver: founder short-circuits, before expiry ═════════
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
  -- Founder: uncapped, and evaluated FIRST so no expiry path can undo it.
  -- active_jobs is null and "unlimited" is true; every reader must treat
  -- the flag as authoritative rather than trying to compare against null.
  IF public.is_founder_user(p_user_id) THEN
    RETURN QUERY SELECT
      'foundation'::text,
      'active'::text,
      NULL::timestamptz,
      '{"active_jobs": null, "ai_evaluation": true, "analytics": true, "unlimited": true}'::jsonb,
      0;
    RETURN;
  END IF;

  SELECT * INTO r FROM public.hr_entitlements e WHERE e.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'free'::text, 'active'::text, NULL::timestamptz,
                        public.hr_plan_limits('free'), 0;
    RETURN;
  END IF;

  eff_plan   := r.plan;
  eff_status := r.status;

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

-- ═══ 4. Trigger: honour the unlimited flag ══════════════════════
-- Only this block changes. GREATEST would silently ignore a NULL
-- active_jobs and fall back to the baseline, which is exactly the cap we
-- are removing, so the flag is checked explicitly and early.
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

  -- Uncapped accounts skip everything, including the self-heal insert:
  -- the founder needs no entitlement row to be uncapped.
  IF public.is_founder_user(NEW.hr_id) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.hr_entitlements e WHERE e.user_id = NEW.hr_id) THEN
    INSERT INTO public.hr_entitlements
      (user_id, plan, status, current_period_end, source, baseline_active_jobs)
    VALUES
      (NEW.hr_id, 'free', 'active', NULL, 'self_heal',
       public.hr_active_job_count(NEW.hr_id))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  SELECT * INTO ent FROM public.hr_effective_entitlement(NEW.hr_id);

  -- Belt and braces: any entitlement carrying the unlimited flag passes.
  IF COALESCE((ent.limits ->> 'unlimited')::boolean, false) THEN
    RETURN NEW;
  END IF;

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

-- ═══ 5. Report ══════════════════════════════════════════════════
DO $$
DECLARE uid uuid; lim jsonb;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(public.hr_founder_email());
  IF uid IS NULL THEN
    RAISE WARNING '048: no auth.users row matches %, the exemption will not apply', public.hr_founder_email();
  ELSE
    SELECT limits INTO lim FROM public.hr_effective_entitlement(uid);
    RAISE NOTICE '048: founder % resolves to limits %', uid, lim;
  END IF;
END $$;
