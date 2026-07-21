-- 043 — payments.currency loses its default.
--
-- WHY
-- 003_admin_schema.sql declared:
--     currency text not null default 'AED'
-- A defaulted currency on a money table means any insert that forgets the
-- column silently records AED. With one gateway per currency that was
-- unexploded; the moment a second currency reaches either rail it becomes
-- a mislabelled financial record with no way to tell after the fact.
--
-- Currency is now passed explicitly by every writer (api/ziina-webhook.js
-- and api/razorpay.js both take it as a required field on recordPayment
-- and refuse to insert without it). Dropping the default makes the
-- database agree: an omitted currency is now a NOT NULL violation that
-- fails loudly instead of a wrong row that looks fine.
--
-- SAFETY
-- Idempotent and non-destructive. Dropping a default does not touch
-- existing rows and does not rewrite the table. The NOT NULL constraint
-- is unchanged, so historical rows keep whatever currency they hold.
-- Nothing here can fail on a table that already has data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'currency'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN currency DROP DEFAULT;
    RAISE NOTICE '043: dropped default on payments.currency';
  ELSE
    RAISE NOTICE '043: payments.currency already has no default, nothing to do';
  END IF;
END $$;

-- Guard against a currency that is neither rail. Kept deliberately wide
-- (a plain allow-list, not a per-gateway rule) because the gateway to
-- currency policy lives in application code where it can be reasoned
-- about; this is only the last line of defence against a junk value.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_currency_known'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_currency_known
      CHECK (currency IN ('AED', 'INR'))
      NOT VALID;
    RAISE NOTICE '043: added payments_currency_known check (NOT VALID)';
  END IF;
END $$;

-- NOT VALID above means the constraint applies to new rows only and does
-- NOT scan the existing table. If historical rows are known clean, the
-- founder can validate it later with:
--     ALTER TABLE public.payments VALIDATE CONSTRAINT payments_currency_known;
-- Run that only after checking:
--     SELECT DISTINCT currency FROM public.payments;
