-- 034_companies_creator_read.sql
--
-- Onboarding inserts a company and needs its id back. PostgREST's
-- INSERT ... RETURNING (.insert().select() in supabase-js) checks SELECT
-- RLS — and at creation time the creator has no company_members row yet,
-- so the members-only read policy (033) rejects the returning step.
-- Creators read their own companies directly.

CREATE POLICY "Creator reads own company" ON public.companies
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());
