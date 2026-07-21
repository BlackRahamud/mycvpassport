-- ─────────────────────────────────────────────────────────────
-- verify-hr-entitlements.sql — proof for the PL/pgSQL half of 046
-- ─────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor AFTER applying 046.
--
-- It is wrapped in BEGIN ... ROLLBACK. Nothing it does is committed:
-- the jobs it closes, the jobs it inserts and the entitlement rows it
-- edits are all discarded when it finishes. Read the NOTICE output.
--
-- It proves, against the real database:
--   A. the seed trigger and backfill populated hr_entitlements
--   B. a free employer is blocked server side at their job limit
--   C. a foundation employer is not
--   D. a trial past its end date resolves to free, with no cron
--   E. the grandfather baseline never blocks below the status quo
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- ── A. Population check ────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.hr_profiles)      AS employers,
  (SELECT count(*) FROM public.hr_entitlements)  AS entitlements,
  (SELECT count(*) FROM public.hr_entitlements WHERE status = 'trial') AS on_trial;
-- Expect: entitlements = employers, and every backfilled row on trial.

-- Pick one real employer to exercise. Nothing is committed.
CREATE TEMP TABLE t_sub AS
SELECT user_id FROM public.hr_entitlements LIMIT 1;

DO $$
DECLARE
  uid uuid := (SELECT user_id FROM t_sub);
  ent record;
  ok  boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE NOTICE 'No employers found. Apply 046 and sign up one employer first.';
    RETURN;
  END IF;
  RAISE NOTICE 'Test employer: %', uid;

  -- Neutralise starting state: close their live jobs and clear the
  -- grandfather floor so the caps are deterministic. Rolled back.
  UPDATE public.jobs SET status = 'closed'
    WHERE hr_id = uid AND source = 'hr_portal' AND status IN ('active','published');
  UPDATE public.hr_entitlements
     SET plan='free', status='active', current_period_end=NULL, baseline_active_jobs=0
   WHERE user_id = uid;

  SELECT * INTO ent FROM public.hr_effective_entitlement(uid);
  RAISE NOTICE 'B. free plan resolves to: plan=% status=% limit=%',
    ent.plan, ent.status, ent.limits->>'active_jobs';

  -- ── B. Free employer: first job allowed, second blocked ──────
  INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
  VALUES (uid, 'Proof job 1', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  RAISE NOTICE 'B. free: job 1 of 1 inserted, active count now %',
    public.hr_active_job_count(uid);

  ok := false;
  BEGIN
    INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
    VALUES (uid, 'Proof job 2', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  EXCEPTION WHEN SQLSTATE 'HR001' THEN
    ok := true;
    RAISE NOTICE 'B. PASS free employer BLOCKED at the cap: %', SQLERRM;
  END;
  IF NOT ok THEN
    RAISE WARNING 'B. FAIL a second job was allowed on the free plan';
  END IF;

  -- ── C. Foundation employer: 3 allowed ────────────────────────
  UPDATE public.hr_entitlements
     SET plan='foundation', status='active',
         current_period_end = pg_catalog.now() + interval '30 days'
   WHERE user_id = uid;

  SELECT * INTO ent FROM public.hr_effective_entitlement(uid);
  RAISE NOTICE 'C. foundation resolves to: plan=% status=% limit=%',
    ent.plan, ent.status, ent.limits->>'active_jobs';

  INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
  VALUES (uid, 'Proof job 2', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
  VALUES (uid, 'Proof job 3', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  RAISE NOTICE 'C. PASS foundation employer posted up to %', public.hr_active_job_count(uid);

  ok := false;
  BEGIN
    INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
    VALUES (uid, 'Proof job 4', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  EXCEPTION WHEN SQLSTATE 'HR001' THEN
    ok := true;
    RAISE NOTICE 'C. PASS foundation blocked at 4: %', SQLERRM;
  END;
  IF NOT ok THEN
    RAISE WARNING 'C. FAIL a 4th job was allowed on foundation';
  END IF;

  -- A pool row must never count or be blocked, even while at the cap.
  INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
  VALUES (uid, 'Proof pool', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'pool');
  RAISE NOTICE 'C. PASS pool row inserted at the cap, active count still %',
    public.hr_active_job_count(uid);

  -- ── D. Lazy expiry ───────────────────────────────────────────
  UPDATE public.hr_entitlements
     SET plan='foundation', status='trial',
         current_period_end = pg_catalog.now() - interval '1 day'
   WHERE user_id = uid;

  SELECT * INTO ent FROM public.hr_effective_entitlement(uid);
  IF ent.plan = 'free' AND ent.status = 'expired' THEN
    RAISE NOTICE 'D. PASS expired trial resolves to plan=% status=% limit=%',
      ent.plan, ent.status, ent.limits->>'active_jobs';
  ELSE
    RAISE WARNING 'D. FAIL expired trial resolved to plan=% status=%', ent.plan, ent.status;
  END IF;

  -- Stored row is untouched by the read: status is still trial.
  RAISE NOTICE 'D. stored status remains % (derived, never written back)',
    (SELECT status FROM public.hr_entitlements WHERE user_id = uid);

  -- ── E. Grandfather baseline ──────────────────────────────────
  -- Free plan (limit 1) but a baseline of 5: an employer who already had
  -- 5 live jobs is not blocked below that.
  UPDATE public.hr_entitlements
     SET plan='free', status='active', current_period_end=NULL, baseline_active_jobs=5
   WHERE user_id = uid;

  INSERT INTO public.jobs (hr_id, title, company, location, source, status, kind)
  VALUES (uid, 'Proof job 4', 'Proof Co', 'Dubai', 'hr_portal', 'active', 'active');
  RAISE NOTICE 'E. PASS baseline 5 allowed a 4th job on the free plan, count now %',
    public.hr_active_job_count(uid);
END $$;

-- ── Nothing above is kept ──────────────────────────────────────
ROLLBACK;

-- Confirm the rollback really discarded the proof jobs.
SELECT count(*) AS leftover_proof_jobs
FROM public.jobs WHERE title LIKE 'Proof job%' OR title = 'Proof pool';
-- Expect 0.
