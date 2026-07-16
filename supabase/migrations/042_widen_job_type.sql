-- ════════════════════════════════════════════════════════════════
-- 042 — Widen jobs.job_type to include 'freelance' and 'intern'.
--
-- The Post-a-Job wizard and the /jobs Employee-type filter now offer
-- Freelance and Intern. Until this runs, the jobs_job_type_check CHECK
-- (defined inline in 001) only permits full-time | part-time | contract,
-- so a freelance/intern post would be rejected at INSERT.
--
-- Widening a CHECK is safe: every existing row already holds one of the
-- three original values, all of which stay valid — no table rewrite, no
-- row can be invalidated. Idempotent (drop-if-exists then re-add).
-- Apply off-peak with the other pending migrations (see 041).
-- ════════════════════════════════════════════════════════════════

alter table public.jobs drop constraint if exists jobs_job_type_check;

alter table public.jobs
  add constraint jobs_job_type_check
  check (job_type in ('full-time', 'part-time', 'contract', 'freelance', 'intern'));
