-- 008_scout_jobs_salary_fields.sql
--
-- Splits scout_jobs.salary into structured fields so the frontend can
-- format ranges, single-bound values, and currencies without parsing a
-- denormalised string. Existing rows keep their `salary` text — the new
-- columns coexist and are populated by /api/scout-run going forward.
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

alter table scout_jobs
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text,
  add column if not exists salary_period text;
