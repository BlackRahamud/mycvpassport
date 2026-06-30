-- =============================================================
-- 027_jobs_kind.sql
--
-- Tags every job by kind so sourcing pools can coexist with real active
-- mandates without ever counting as active jobs in any metric.
--
--   kind = 'active'  a real role (the Post a Job flow, the default)
--   kind = 'pool'    a sourcing pool a recruiter drops candidates into
--
-- Pools are fully workable jobs (candidates, pipeline, import) but are
-- excluded from every active-job metric in the app by adding
-- `where kind = 'active'` at each metric query site. This migration is the
-- only schema change needed for that exclusion.
--
-- RLS ownership is unchanged: a pool is just a job, owned by the same hr_id,
-- governed by the existing jobs policies. No policy is added or altered here.
-- =============================================================

alter table public.jobs
  add column if not exists kind text not null default 'active';

-- Constraint added separately so re-running the migration is safe and the
-- backfill below can never collide with it.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_kind_check'
  ) then
    alter table public.jobs
      add constraint jobs_kind_check check (kind in ('active', 'pool'));
  end if;
end $$;

-- Backfill: every existing job is an active mandate. The column default
-- already covers rows created during the add, this makes the intent explicit
-- and covers any null that slipped in.
update public.jobs set kind = 'active' where kind is null;

-- Supports the `where hr_id = ... and kind = 'active'` filter the metric sites
-- now run, and the Jobs list pool filter.
create index if not exists jobs_hr_kind_idx on public.jobs (hr_id, kind);

comment on column public.jobs.kind is
  'active = a real role (default), pool = a sourcing pool. Pools are excluded from every active-job metric but are otherwise full jobs under the same RLS ownership.';
