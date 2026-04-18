-- Per-service unlock ledger. One row per (user, service) pair.
-- Used by LinkedIn Optimizer and any future a-la-carte unlock.
-- Webhook writes via service role (bypasses RLS). Client reads own rows.

create table if not exists public.permissions (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  service     text        not null,
  status      text        not null default 'unlocked',
  unlocked_at timestamptz not null default now(),
  primary key (user_id, service)
);

alter table public.permissions enable row level security;

drop policy if exists "permissions read own" on public.permissions;
create policy "permissions read own"
  on public.permissions
  for select
  using (auth.uid() = user_id);
