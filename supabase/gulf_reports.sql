-- Gulf Career Intelligence — persistent report storage.
-- Apply via Supabase Studio → SQL Editor.
--
-- Schema:
--   id          7-char short URL slug (e.g. /gulf/abc1234)
--   email       captured at the unlock gate
--   state       full intake answers + refinement state (jsonb)
--   result      computed snapshot (match %, AED bands, friction, tier, etc.)
--   created_at  insert timestamp

create table if not exists public.gulf_reports (
  id          text primary key,
  email       text not null,
  state       jsonb not null,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

-- Index for any future "my reports" lookup by email
create index if not exists gulf_reports_email_idx on public.gulf_reports (email);

-- Row Level Security
alter table public.gulf_reports enable row level security;

-- Anyone (anon or authenticated) can insert a new report.
-- The id is a long unguessable slug; treat it like a share token.
drop policy if exists "anon can insert gulf reports" on public.gulf_reports;
create policy "anon can insert gulf reports"
  on public.gulf_reports
  for insert
  with check (true);

-- Anyone with the link can read by id (shareable reports).
-- This is intentional — the id IS the share token.
drop policy if exists "public can read gulf reports" on public.gulf_reports;
create policy "public can read gulf reports"
  on public.gulf_reports
  for select
  using (true);
