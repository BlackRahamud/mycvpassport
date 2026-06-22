-- ─────────────────────────────────────────────────────────────
-- 017 — Invoices + receipts (post-payment fiscal documents)
-- ─────────────────────────────────────────────────────────────
-- One table covers both rails:
--   * IN entity (Razorpay/INR) → kind='invoice', series CVP-IN-2026-NNNN
--   * AE entity (Ziina/AED)   → kind='receipt', series RCP-AE-2026-NNNN
--
-- Seller identity is SNAPSHOTTED onto the row at insert time so historic
-- documents preserve the issuer even if env vars change later. Per the
-- brief there is no tax line for either entity right now; the schema keeps
-- subtotal/tax/total separate so future GST registration is data-only.
--
-- Idempotency is enforced two ways:
--   * payment_id UNIQUE NOT NULL (DB-level guarantee)
--   * webhook handlers INSERT ... ON CONFLICT (payment_id) DO NOTHING
--
-- Wrap in BEGIN; ... COMMIT; when running.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number        text UNIQUE NOT NULL,
  kind                  text NOT NULL CHECK (kind IN ('invoice', 'receipt')),
  entity                text NOT NULL CHECK (entity IN ('IN', 'AE')),
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name         text,
  customer_email        text,
  customer_country      text,
  plan                  text,
  description           text,
  access_days           integer,
  currency              text NOT NULL,
  subtotal              numeric(12, 2) NOT NULL,
  tax_amount            numeric(12, 2) NOT NULL DEFAULT 0,
  total                 numeric(12, 2) NOT NULL,
  gateway               text NOT NULL CHECK (gateway IN ('razorpay', 'ziina')),
  payment_id            text UNIQUE NOT NULL,
  status                text NOT NULL DEFAULT 'paid',
  -- Seller identity snapshot — values at the time of issue. Email-rail
  -- seller block reads from these, NOT live env vars.
  seller_name           text,
  seller_address        text,
  seller_tax_id         text,
  seller_tax_id_label   text,
  seller_email          text,
  seller_support_email  text,
  email_sent_at         timestamptz,
  issued_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices (user_id, issued_at DESC);

COMMENT ON TABLE public.invoices IS
  'Fiscal documents issued after a successful payment. kind=invoice for IN (Razorpay) tier purchases; kind=receipt for AE (Ziina) tier purchases. One row per payment_id (idempotent on webhook retry).';

-- ─────────────────────────────────────────────────────────────
-- RLS — user can SELECT their own; only service_role writes.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop and recreate so the migration is idempotent.
DROP POLICY IF EXISTS "Users select own invoices" ON public.invoices;
CREATE POLICY "Users select own invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated/anon — denied by default.
-- service_role bypasses RLS, so the webhook handlers can write.

-- ─────────────────────────────────────────────────────────────
-- Per-(entity, kind, year) counters for atomic, gapless numbering.
-- Separate counters: IN-invoice and AE-receipt are independent series.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  entity  text NOT NULL,
  kind    text NOT NULL,
  year    integer NOT NULL,
  next_n  integer NOT NULL,
  PRIMARY KEY (entity, kind, year)
);

COMMENT ON TABLE public.invoice_counters IS
  'Atomic counters for invoice/receipt numbering. One row per (entity, kind, year). Locked to service_role via the next_invoice_number RPC.';

-- ─────────────────────────────────────────────────────────────
-- next_invoice_number RPC — allocates the next number atomically.
-- Returns e.g. CVP-IN-2026-0001 (invoice) or RCP-AE-2026-0001 (receipt).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.next_invoice_number(
  p_entity text,
  p_kind   text,
  p_year   integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  issued_n integer;
  prefix   text;
BEGIN
  IF p_entity NOT IN ('IN', 'AE') THEN
    RAISE EXCEPTION 'Invalid entity: %', p_entity;
  END IF;
  IF p_kind NOT IN ('invoice', 'receipt') THEN
    RAISE EXCEPTION 'Invalid kind: %', p_kind;
  END IF;

  -- INSERT-or-increment in one statement. Returning shows next_n AFTER
  -- the operation, so subtracting 1 gives the number we should issue:
  --   first call:  insert next_n=2, return 2-1=1
  --   second call: update next_n=3, return 3-1=2
  --   third call:  update next_n=4, return 4-1=3
  INSERT INTO public.invoice_counters (entity, kind, year, next_n)
  VALUES (p_entity, p_kind, p_year, 2)
  ON CONFLICT (entity, kind, year) DO UPDATE
  SET next_n = public.invoice_counters.next_n + 1
  RETURNING next_n - 1 INTO issued_n;

  IF p_kind = 'receipt' THEN
    prefix := 'RCP';
  ELSE
    prefix := 'CVP';
  END IF;

  RETURN prefix || '-' || p_entity || '-' || p_year::text || '-' || lpad(issued_n::text, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.next_invoice_number(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.next_invoice_number(text, text, integer) TO service_role;
