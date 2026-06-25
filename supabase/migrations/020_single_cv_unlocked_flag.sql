-- ─────────────────────────────────────────────────────────────
-- 020 — Durable "Single-CV Unlock purchased" flag (for AI metering)
-- ─────────────────────────────────────────────────────────────
-- The ₹149 Single-CV Unlock (tier 'express_pass', model 'permanent') grants
-- download credits but does NOT set profiles.plan or pro_access_expires_at
-- (it is a one-time download pack, not a subscription). AI metering needs a
-- durable signal to grant Single-CV buyers their 30 AI-rewrites/month cap —
-- download_credits is transient (it depletes to 0 after 3 downloads), so it
-- cannot serve as that signal.
--
-- This column is the durable marker. The payment webhooks
-- (api/ziina-webhook.js + api/razorpay.js, applyPaidTier 'permanent' branch)
-- set it true on purchase. api/ai.js reads it in aiTierAndCap().
--
-- It deliberately does NOT touch profiles.plan or pro_access_expires_at, so
-- the download gate (gatekeeper.js / generate-pdf.js) and the subscription
-- logic are completely unaffected.
--
-- Until this migration runs, single_cv_unlocked reads as undefined/false in
-- api/ai.js, so Single-CV buyers fall back to the free AI cap (3/mo) — honest
-- (under-delivers, never wrongly blocks). After it runs they get 30/mo.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS single_cv_unlocked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.single_cv_unlocked IS
  'True once the user has purchased the Single-CV Unlock (one-time download pack). Read by api/ai.js to grant the 30 AI-rewrites/month cap. Does not affect downloads or subscription access.';
