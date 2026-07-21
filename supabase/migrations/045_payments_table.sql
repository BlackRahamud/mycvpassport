-- ─────────────────────────────────────────────────────────────
-- 045 — public.payments, repo catch-up (guarded, expected to be a no-op)
-- ─────────────────────────────────────────────────────────────
-- HOUSEKEEPING, NOT A CHANGE.
--
-- 003_admin_schema.sql was never applied to the live database, so
-- public.payments did not exist in production while every webhook wrote
-- to it. The table was created by hand on 2026-07-21. This file records
-- that reality in the repo so applied state and tracked state agree,
-- which is the drift that hid the problem in the first place.
--
-- Every statement is guarded. Running this against the live database,
-- where the table already exists, does nothing and reports so. Running
-- it against a fresh environment creates the table correctly.
--
-- Differences from the original 003 definition, all deliberate:
--   * currency has NO DEFAULT. A defaulted currency on a money table
--     silently mislabels a row if a writer ever omits it. This is what
--     043 was written to fix; baking it in here means 043 stays a no-op.
--   * provider has NO DEFAULT, same reasoning. Both webhooks always
--     pass it, so a default could only ever mask a bug.
--   * CHECK constraints on currency and provider.
--   * UNIQUE index on payment_intent_id. Both webhooks short-circuit on
--     .eq('payment_intent_id', ...).maybeSingle(), which errors if more
--     than one row matches, so at most one row per intent has to be
--     guaranteed by the database. Without it, idempotency is advisory.
--     NULLs are allowed and do not collide (transform orphan rows).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id                bigserial PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email             text,
  amount            numeric(10,2) NOT NULL,
  currency          text NOT NULL,
  status            text NOT NULL DEFAULT 'succeeded',
  provider          text NOT NULL,
  service           text,
  external_ref      text,
  payment_intent_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Defaults: drop them if an older 003-shaped table is present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments'
      AND column_name='currency' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN currency DROP DEFAULT;
    RAISE NOTICE '045: dropped default on payments.currency';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments'
      AND column_name='provider' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN provider DROP DEFAULT;
    RAISE NOTICE '045: dropped default on payments.provider';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_currency_known') THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_currency_known CHECK (currency IN ('AED','INR')) NOT VALID;
    RAISE NOTICE '045: added payments_currency_known';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='payments_provider_known') THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_provider_known CHECK (provider IN ('ziina','razorpay')) NOT VALID;
    RAISE NOTICE '045: added payments_provider_known';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_intent_id_key
  ON public.payments (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_user_id_created_at_idx
  ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx
  ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin reads only. Writes come from the service-role key in the
-- webhooks, which bypasses RLS, so there are deliberately no
-- insert/update/delete policies for anon or authenticated.
DROP POLICY IF EXISTS "payments read admin" ON public.payments;
CREATE POLICY "payments read admin"
  ON public.payments
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com');
