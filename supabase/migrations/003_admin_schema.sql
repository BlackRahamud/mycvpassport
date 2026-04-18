-- Admin panel backing schema: payments audit log + two profile columns
-- the admin UI assumed exist.

-- ═══════════════════════════════════════════════════════════════
-- 1. profiles.linkedin_unlocked  (display-only mirror of permissions)
--    profiles.last_active_at     (populated later from session events)
-- ═══════════════════════════════════════════════════════════════
alter table if exists public.profiles
  add column if not exists linkedin_unlocked boolean not null default false;

alter table if exists public.profiles
  add column if not exists last_active_at timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- 2. payments — Ziina audit trail
--    One row per successful payment_intent the webhook processes.
--    Feeds AdminPanelV2 > Payments tab.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id                bigserial primary key,
  user_id           uuid references auth.users(id) on delete set null,
  email             text,
  amount            numeric(10,2) not null,     -- in currency's major unit (AED 49, not 4900 fils)
  currency          text          not null default 'AED',
  status            text          not null default 'succeeded',
  provider          text          not null default 'ziina',
  service           text,                        -- e.g. 'linkedin_optimizer' | 'express_pass' | plan key
  external_ref      text,                        -- raw external_reference passed to Ziina
  payment_intent_id text,
  created_at        timestamptz   not null default now()
);

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx
  on public.payments (status);

alter table public.payments enable row level security;

drop policy if exists "payments read admin" on public.payments;
create policy "payments read admin"
  on public.payments
  for select
  using (
    auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com'
  );
-- Writes happen via the service role key from the Ziina webhook —
-- service role bypasses RLS. No insert/update/delete policies for
-- anon/authenticated on purpose.
