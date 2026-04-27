-- 004_anthropic_calls.sql
-- Sprint #4 (2026-04-28). Single source of truth for cost guards:
-- rate-limit counters, daily spend cap, blocked Turnstile attempts,
-- and the /admin/cost dashboard all read from this one table.
--
-- Edge Functions write via service role (bypass RLS).
-- The /admin/cost page reads via the admin-email RLS policy.
-- End users do NOT read this table directly — UI receives their
-- "remaining" count inline in the scan response.

create extension if not exists pgcrypto;

create table if not exists public.anthropic_calls (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),

  -- Identity. user_id is null for anonymous; ip_hash is non-null for
  -- anonymous and best-effort for signed-in users (forensic only).
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,

  -- Tier at the moment of the call (anonymous / free / paid / paid_pro).
  tier text not null check (tier in ('anonymous', 'free', 'paid', 'paid_pro')),

  -- Which Anthropic-touching endpoint (analyze-cv / cover-letter / ...).
  endpoint text not null,
  model text,

  -- Token usage as reported by Anthropic. cache_* fields are 0 if
  -- prompt caching wasn't used or didn't fire.
  input_tokens integer,
  cache_creation_input_tokens integer default 0,
  cache_read_input_tokens integer default 0,
  output_tokens integer,

  -- Estimated cost in USD using rates from
  -- supabase/functions/analyze-cv/_pricing.mjs. Re-validate quarterly.
  estimated_cost_usd numeric(10, 6) not null default 0,

  -- Outcome. Failed gates still log a row so the dashboard can show
  -- blocked-Turnstile / rate-limit / spend-cap volume per day.
  status text not null check (status in (
    'ok', 'rate_limited', 'turnstile_blocked', 'spend_capped', 'error'
  )),
  error_code text,

  -- Free-form metadata: { soft_alert: true } when 80% spend threshold
  -- crossed; { fixture: "verify" } for verify script smoke calls; etc.
  meta jsonb
);

create index if not exists anthropic_calls_user_idx
  on public.anthropic_calls (user_id, occurred_at desc);
create index if not exists anthropic_calls_ip_idx
  on public.anthropic_calls (ip_hash, occurred_at desc);
create index if not exists anthropic_calls_time_idx
  on public.anthropic_calls (occurred_at desc);
create index if not exists anthropic_calls_status_idx
  on public.anthropic_calls (status, occurred_at desc)
  where status <> 'ok';

alter table public.anthropic_calls enable row level security;

-- The single founder admin email reads everything. Service role writes
-- bypass RLS automatically. Authenticated users get NO direct access —
-- their remaining-count comes back in the scan response.
drop policy if exists "admin_reads_all_calls" on public.anthropic_calls;
create policy "admin_reads_all_calls"
  on public.anthropic_calls
  for select
  using (
    exists (
      select 1
      from auth.users
      where id = auth.uid()
        and email = 'connectingjunaidkhan@gmail.com'
    )
  );
