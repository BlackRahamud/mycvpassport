-- ─────────────────────────────────────────────────────────────
-- 044 — Cover letter credits (consumable a-la-carte unlock)
-- ─────────────────────────────────────────────────────────────
-- One AED 10 cover letter purchase buys ONE generation. This is the
-- founder's explicit decision: the `permissions` table (002) can only
-- express a permanent unlock — it has no expiry and no counter — so a
-- permissions row would have made a single AED 10 payment grant
-- unlimited cover letters forever, including unlimited regenerations
-- from the regenerate button on CoverLetterPage.
--
-- Deliberately mirrors the existing consumable pattern rather than
-- inventing one: profiles.download_credits + grant_download_credits
-- (015) + consume_download_credit (016). Same column shape, same RPC
-- shape, same SECURITY DEFINER + empty search_path + service-role-only
-- hardening.
--
-- Pro users are NOT metered by this. The server gate checks pro access
-- first (is_pro or pro_access_expires_at > now) and only falls through
-- to a credit when the user has no active pass, so a Career Pro holder
-- never burns a credit.
--
-- NO BACKFILL, deliberately. Historic AED 10 cover letter purchases hit
-- the applyZiinaPaidTier('cover_letter') bug and returned 500 without
-- granting anything, so there is no population of "already paid, should
-- be grandfathered" users this migration can identify with confidence.
-- Those buyers are reconcilable by hand from public.payments where
-- service = 'cover_letter'. Granting retroactively here would be a
-- guess, so it is left to a deliberate one-off statement.
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Column ──────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_letter_credits integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.cover_letter_credits IS
  'Cover letter generations remaining. One per AED 10 a-la-carte purchase. Incremented by the payment webhook via grant_cover_letter_credits(); decremented by api/ai.js cover_letter via consume_cover_letter_credit(). Pro users bypass this counter entirely.';

-- ── 2. Grant (webhook) ─────────────────────────────────────────
-- Also used as the refund path: a failed Anthropic call calls this with
-- p_credits = 1 to hand the credit back, so there is one increment
-- function rather than two that could drift.
CREATE OR REPLACE FUNCTION public.grant_cover_letter_credits(p_user_id uuid, p_credits integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_total integer;
BEGIN
  UPDATE public.profiles
  SET cover_letter_credits = cover_letter_credits + p_credits
  WHERE id = p_user_id
  RETURNING cover_letter_credits INTO new_total;
  RETURN new_total;
END;
$$;

-- ── 3. Consume (generation gate) ───────────────────────────────
-- The `> 0` guard is what makes this race-safe: two concurrent
-- generations cannot drive the counter negative, and a row already at
-- zero matches zero rows, so RETURNING yields NULL and the caller
-- treats that as "no credit consumed, refuse the generation".
CREATE OR REPLACE FUNCTION public.consume_cover_letter_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.profiles
  SET cover_letter_credits = cover_letter_credits - 1
  WHERE id = p_user_id AND cover_letter_credits > 0
  RETURNING cover_letter_credits INTO remaining;
  RETURN remaining;
END;
$$;

-- ── 4. Lockdown ────────────────────────────────────────────────
-- Both run from the service-role key only. Exposed to `authenticated`
-- they would let any signed-in user mint themselves free generations.
REVOKE EXECUTE ON FUNCTION public.grant_cover_letter_credits(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_cover_letter_credit(uuid)     FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_cover_letter_credits(uuid, int) TO service_role;
GRANT  EXECUTE ON FUNCTION public.consume_cover_letter_credit(uuid)     TO service_role;
