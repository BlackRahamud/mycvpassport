-- ─────────────────────────────────────────────────────────────
-- 016 — Atomic download-credit consumption RPC
-- ─────────────────────────────────────────────────────────────
-- Companion to grant_download_credits (migration 015). The download
-- gate in api/generate-pdf.js calls this from the service-role client
-- after a successful PDF render to subtract one credit. The `> 0`
-- guard makes the UPDATE race-safe: concurrent downloads cannot drive
-- the counter negative, and a row already at zero matches zero rows
-- (RETURNING yields NULL — caller treats that as "no credit consumed").
--
-- SECURITY DEFINER + empty search_path + schema-qualified objects, same
-- hardening pattern as the migration 015 RPCs.
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_download_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.profiles
  SET download_credits = download_credits - 1
  WHERE id = p_user_id AND download_credits > 0
  RETURNING download_credits INTO remaining;
  RETURN remaining;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_download_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_download_credit(uuid) TO service_role;
