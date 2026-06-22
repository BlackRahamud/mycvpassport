-- ─────────────────────────────────────────────────────────────
-- 015 — Honest billing model: time-bounded access + download credits
-- ─────────────────────────────────────────────────────────────
-- Replaces the boolean is_pro source-of-truth with an expiry timestamp
-- (for the two time-bounded passes: Active Hunter 30-day, Career Pro
-- 365-day) plus a download_credits counter (for Express Pass, the
-- permanent single-CV unlock).
--
-- is_pro is RETAINED as a cached/legacy flag — multiple server endpoints
-- (api/ai.js, api/transform.js, api/scout-*.js) still gate on it. The
-- canonical access check is pro_access_expires_at > now(); is_pro is
-- written by the webhook (via extend_pro_access) alongside the expiry
-- for those gates' benefit. A subsequent migration will retire is_pro
-- once the gates are moved to read the expiry directly.
--
-- Both RPCs are SECURITY DEFINER with an empty search_path. Every object
-- they reference is schema-qualified so a malicious search_path cannot
-- redirect resolution to a planted object. Execute is granted only to
-- service_role; revoked from public/anon/authenticated.
--
-- Wrap this whole file in BEGIN; ... COMMIT; when running so a failure
-- on any step rolls everything back.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Columns + comments ──────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_access_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS download_credits integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.pro_access_expires_at IS
  'When the user''s time-bounded Pro access lapses. NULL = no access. Active Pro = pro_access_expires_at > now(). Set by the payment webhook via extend_pro_access().';
COMMENT ON COLUMN public.profiles.download_credits IS
  'Permanent single-CV unlocks (Express Pass) remaining. Incremented by the payment webhook on every Express Pass purchase; decremented on use.';

-- ── 2. Backfill: grandfather existing paid users ───────────────
-- Anyone currently is_pro=true keeps access permanently under the new
-- model. Simple rule per refactor brief — slightly over-generous to
-- legacy Express Pass holders, but the explicit instruction is to
-- ensure no existing paid user loses access.
UPDATE public.profiles
SET pro_access_expires_at = '2099-01-01'::timestamptz
WHERE is_pro = TRUE AND pro_access_expires_at IS NULL;

-- Partial index for the future-canonical access query.
CREATE INDEX IF NOT EXISTS profiles_pro_expiry_idx
  ON public.profiles (pro_access_expires_at)
  WHERE pro_access_expires_at IS NOT NULL;

-- ── 3. RPCs ────────────────────────────────────────────────────

-- Atomic stacking — webhook calls this to extend access by N days.
-- GREATEST(now, current_expiry) guarantees the stack starts at the
-- later of "now" or "remaining time", so unused days on a pass don't
-- get lost when the user tops up. Also keeps is_pro=true in sync so
-- legacy server gates still work.
CREATE OR REPLACE FUNCTION public.extend_pro_access(p_user_id uuid, p_days integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_expiry timestamptz;
BEGIN
  UPDATE public.profiles
  SET
    pro_access_expires_at = GREATEST(pg_catalog.now(), COALESCE(pro_access_expires_at, pg_catalog.now())) + (p_days || ' days')::interval,
    is_pro = TRUE
  WHERE id = p_user_id
  RETURNING pro_access_expires_at INTO new_expiry;
  RETURN new_expiry;
END;
$$;

-- Atomic credits increment for Express Pass. Separate function so the
-- webhook's intent is explicit at the call site and so future credit
-- types (e.g. ai_tailor_credits) follow the same shape.
CREATE OR REPLACE FUNCTION public.grant_download_credits(p_user_id uuid, p_credits integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_total integer;
BEGIN
  UPDATE public.profiles
  SET download_credits = download_credits + p_credits
  WHERE id = p_user_id
  RETURNING download_credits INTO new_total;
  RETURN new_total;
END;
$$;

-- ── 4. Lockdown — only the service_role can call these ─────────
-- The webhook handlers run with the service-role key. PostgREST/anon
-- and authenticated users have no business invoking these RPCs from
-- the browser (they would let any logged-in user grant themselves Pro
-- access if exposed).
REVOKE EXECUTE ON FUNCTION public.extend_pro_access(uuid, int)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_download_credits(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.extend_pro_access(uuid, int)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.grant_download_credits(uuid, int) TO service_role;
