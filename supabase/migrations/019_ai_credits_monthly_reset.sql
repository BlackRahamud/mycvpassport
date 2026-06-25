-- ─────────────────────────────────────────────────────────────
-- 019 — Monthly reset for the free-tier AI rewrite credit
-- ─────────────────────────────────────────────────────────────
-- The pricing page + UpgradeModal advertise the free tier as "3 AI
-- rewrites / month". The original counter (profiles.ai_credits_used,
-- added in supabase/add_ai_credits_used_to_profiles.sql) was a LIFETIME
-- counter with no reset — so "/month" was not actually enforced.
--
-- This migration:
--   1. Adds profiles.ai_credits_period_start (the month the current
--      counter belongs to), defaulted to the current UTC month so every
--      existing user starts the month with a full allowance.
--   2. CREATE OR REPLACEs try_deduct_ai_credit WITHOUT changing its name
--      or signature (uuid, int) — so api/ai.js keeps working unchanged,
--      whether or not this migration has been applied yet. The new body
--      zeroes the counter and re-stamps the period when the stored period
--      is an earlier month, THEN applies the `< p_limit` gate.
--
-- Backward-compat note: before this runs, the cap behaves as a lifetime 3
-- (honest — it never blocks a free user before their 3rd rewrite). After
-- it runs, the 3 resets on the 1st of each month (UTC).
--
-- SECURITY DEFINER + search_path = public + service_role-only execute,
-- matching the original function's posture. Wrap in BEGIN; ... COMMIT;.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_credits_period_start date
  DEFAULT (date_trunc('month', (now() AT TIME ZONE 'UTC'))::date);

COMMENT ON COLUMN public.profiles.ai_credits_period_start IS
  'The UTC month (first day) that ai_credits_used currently belongs to. try_deduct_ai_credit zeroes ai_credits_used when this rolls into a new month.';

CREATE OR REPLACE FUNCTION public.try_deduct_ai_credit(p_user_id uuid, p_limit int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_used int;
  v_period   date := date_trunc('month', (now() AT TIME ZONE 'UTC'))::date;
BEGIN
  -- Monthly reset: if the stored period is an earlier month (or null),
  -- zero the counter and stamp the new period. Idempotent under
  -- concurrency — only rows whose period is behind get touched.
  UPDATE public.profiles
  SET ai_credits_used = 0,
      ai_credits_period_start = v_period
  WHERE id = p_user_id
    AND (ai_credits_period_start IS NULL OR ai_credits_period_start < v_period);

  -- Atomic gated increment. Returns the new used count, or NULL when the
  -- user is already at the cap for the current month.
  UPDATE public.profiles
  SET ai_credits_used = ai_credits_used + 1
  WHERE id = p_user_id
    AND ai_credits_used < p_limit
  RETURNING ai_credits_used INTO v_new_used;
  RETURN v_new_used;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_deduct_ai_credit(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.try_deduct_ai_credit(uuid, int) TO service_role;
