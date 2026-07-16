-- ════════════════════════════════════════════════════════════════
-- 041 — Candidate one-tap apply: persist visa/phone on the candidate
--       profile, and expose ONLY the two public employer facts.
--
-- Two independent changes, both idempotent and both fail-loud rather
-- than silently no-op (the lesson from 040, where a "create table if
-- not exists" hit an existing table of a different shape and every
-- statement after it ran against the wrong schema).
--
-- Apply when the app is not under load: the ALTER TABLE below takes a
-- brief ACCESS EXCLUSIVE lock. Adding a nullable text column with no
-- default is a metadata-only change (fast, no table rewrite), but the
-- lock still queues behind long-running statements.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Candidate profile: visa_status + phone ────────────────────
-- So Easy Apply can be a genuine zero-typing tap on the next role. We
-- add each column only when it is absent, and RAISE if it already
-- exists with a type other than text — never a silent no-op onto an
-- incompatible column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'visa_status'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'visa_status' and data_type = 'text'
    ) then
      raise exception '041: public.profiles.visa_status already exists with a non-text type; refusing to proceed';
    end if;
  else
    alter table public.profiles add column visa_status text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'phone' and data_type = 'text'
    ) then
      raise exception '041: public.profiles.phone already exists with a non-text type; refusing to proceed';
    end if;
  else
    alter table public.profiles add column phone text;
  end if;
end $$;

-- ── 2. Public employer facts, and ONLY those ─────────────────────
-- The candidate board and job detail need to show a truthful Verified
-- badge and the employer's real name. hr_profiles ALSO holds work_email
-- (and company_size, plan, company_id) — a table-wide anon SELECT would
-- publish every recruiter's email. So instead of opening the table, we
-- expose a view of EXACTLY three columns:
--
--     user_id, verified, company_name
--
-- and nothing else. work_email, company_size, plan, company_id, id and
-- created_at are never selectable through this path.
--
-- The view runs with definer rights (the default; NOT security_invoker),
-- so it deliberately bypasses hr_profiles' row RLS to return the public
-- verified/name facts for every employer. That is safe precisely because
-- the column list is the whole contract: there is nothing sensitive in it.
create or replace view public.hr_public_profiles as
  select user_id, verified, company_name
  from public.hr_profiles;

comment on view public.hr_public_profiles is
  'Public, read-only projection of hr_profiles limited to (user_id, verified, company_name) for the candidate job board and detail page. Deliberately excludes work_email and every other column.';

-- Lock the exposure to exactly these consumers and these columns.
revoke all on public.hr_public_profiles from public;
grant select on public.hr_public_profiles to anon, authenticated;
