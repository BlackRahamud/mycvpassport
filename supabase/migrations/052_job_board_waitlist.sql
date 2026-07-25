-- =============================================================
-- 052_job_board_waitlist.sql
--
-- "Save my seat" on the post-download boarding pass. This is the
-- demand list for the CVPassport Job Board: it is the evidence we
-- take to employers ("N candidates are already waiting, this many
-- want Gulf roles"), so it has to actually persist — not a toast.
--
-- One row per person per market. Re-submitting the same email +
-- market is idempotent (ON CONFLICT DO NOTHING at the writer), so a
-- double tap never creates a duplicate seat.
--
-- Security:
--   - INSERT is open to anon AND authenticated. The boarding pass is
--     reachable without an account (a visitor can build and download
--     a CV signed out), so gating this on auth would silently drop
--     the majority of the list.
--   - The write surface is deliberately narrow: with check (true) on
--     INSERT only. There is NO select / update / delete policy, so
--     the anon key cannot read the list back, cannot enumerate
--     emails, and cannot edit or delete a row. The founder reads it
--     via the dashboard / service role, which bypasses RLS.
--   - user_id is stamped when we know it, but is never trusted for
--     access control here — nothing in this table is readable by a
--     client key at all.
-- =============================================================

create table if not exists public.job_board_waitlist (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null,
  target_market text not null check (target_market in ('india', 'gulf', 'both')),
  source        text not null default 'boarding_pass',
  user_id       uuid references auth.users(id) on delete set null
);

-- Idempotency key: one seat per email per market, case-insensitive.
create unique index if not exists job_board_waitlist_email_market_idx
  on public.job_board_waitlist (lower(email), target_market);

create index if not exists job_board_waitlist_created_at_idx
  on public.job_board_waitlist (created_at desc);

comment on table public.job_board_waitlist is
  'Demand list for the CVPassport Job Board (Save my seat on the post-download boarding pass). Insert-only for clients; read via service role. Feeds the employer pitch.';
comment on column public.job_board_waitlist.target_market is
  'india | gulf | both — which corridor side the candidate wants roles in. Drives which employers we approach first.';
comment on column public.job_board_waitlist.source is
  'Where the seat was saved from, so a future entry point (landing, dashboard) stays attributable.';

alter table public.job_board_waitlist enable row level security;

-- The entire write surface: anyone may add themselves to the list.
create policy "job_board_waitlist insert any"
  on public.job_board_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Deliberately NO select / update / delete policy: the list is
-- write-only for clients so the anon key can never enumerate emails.
