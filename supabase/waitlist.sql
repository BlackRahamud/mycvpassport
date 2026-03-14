-- Run this in the Supabase Dashboard → SQL Editor if the `waitlist` table does not exist.
-- Creates the table and enables RLS with insert-only for anon/authenticated.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (join waitlist); no read/update/delete for anon.
CREATE POLICY "Allow insert for waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optional: allow authenticated users (e.g. admins) to select for export.
-- CREATE POLICY "Allow select for authenticated"
--   ON public.waitlist FOR SELECT TO authenticated USING (true);
