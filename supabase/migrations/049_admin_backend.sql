-- ============================================================================
-- 049_admin_backend.sql — Admin Command Center, Phase 1 backend spine.
--
-- STATUS: PENDING. Apply by hand in the Supabase SQL Editor. Idempotent —
-- safe to run more than once. Nothing here is assumed applied by the code
-- until you confirm it.
--
-- Adds:
--   1. audit_log      — append-only record of every admin write action.
--   2. pending_grants — a grant keyed to an email with no account yet; it
--                       auto-resolves when that email signs up.
--   3. profiles.*     — soft-suspend columns (reversible account status,
--                       enforced by an app guard, NOT a hard auth ban — see
--                       the hand-apply diff for src/useCvpAuth.js).
--   4. ats_results    — finally versioned. The table was created by hand
--                       (written by src/ATSChecker.jsx, read by the admin
--                       panel) with no schema in version control.
--
-- Owner gate mirrors the existing admin RLS (003/004): SELECT limited to the
-- founder email. Every write comes from the service role (api/admin.js),
-- which bypasses RLS.
--
-- APPLY-TIME CHECKS (things I cannot verify against your live DB):
--   * grant_hr_foundation(uuid,int,text) must be callable from a SECURITY
--     DEFINER trigger (owner = postgres). If it hard-rejects non-service
--     callers, the HR branch of the resolver will error — tell me and I'll
--     switch that branch to a direct hr_entitlements write.
--   * If ats_results already exists with a different column set, CREATE TABLE
--     IF NOT EXISTS is a no-op and leaves your columns as-is (the admin only
--     needs id/user_id/score/created_at). Confirm those four exist.
-- ============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. audit_log
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id           bigserial primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,
  actor_email  text        not null,
  action       text        not null,
  target_type  text,
  target_id    text,
  target_email text,
  portal       text,
  before       jsonb,
  after        jsonb,
  metadata     jsonb,
  result       text        not null default 'ok',
  error        text
);

create index if not exists audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index if not exists audit_log_action_idx   on public.audit_log (action, occurred_at desc);
create index if not exists audit_log_target_idx   on public.audit_log (target_email);

alter table public.audit_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_log' and policyname = 'audit_log read owner'
  ) then
    create policy "audit_log read owner" on public.audit_log
      for select using (auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com');
  end if;
end $$;
-- No insert/update/delete policy: append-only, written by the service role only.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. pending_grants
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.pending_grants (
  id            bigserial primary key,
  email         text not null,
  portal        text not null check (portal in ('candidate','hr')),
  plan          text not null,   -- profiles.plan enum (candidate) OR 'foundation'/'free' (hr)
  access_kind   text not null default 'duration' check (access_kind in ('duration','expiry','permanent')),
  duration_days integer,
  expiry        timestamptz,
  note          text,
  status        text not null default 'pending' check (status in ('pending','resolved','cancelled')),
  created_by    text not null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_user uuid
);

-- One open grant per email (upsert target). Resolved/cancelled rows don't collide.
create unique index if not exists pending_grants_one_open_per_email
  on public.pending_grants (email) where status = 'pending';
create index if not exists pending_grants_email_idx on public.pending_grants (email);

alter table public.pending_grants enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pending_grants' and policyname = 'pending_grants read owner'
  ) then
    create policy "pending_grants read owner" on public.pending_grants
      for select using (auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com');
  end if;
end $$;

-- Resolver: when a new profile row appears (signup creates it), apply any
-- pending grant for that email and mark it resolved. SECURITY DEFINER so it
-- can write regardless of the inserting role.
create or replace function public.resolve_pending_grants_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.pending_grants%rowtype;
  v_days integer;
begin
  for g in
    select * from public.pending_grants
    where lower(email) = lower(new.email) and status = 'pending'
  loop
    if g.access_kind = 'permanent' then
      v_days := 36500;
    elsif g.access_kind = 'expiry' and g.expiry is not null then
      v_days := greatest(1, ceil(extract(epoch from (g.expiry - now())) / 86400.0));
    else
      v_days := coalesce(g.duration_days, 30);
    end if;

    if g.portal = 'hr' then
      if g.plan = 'foundation' then
        perform public.grant_hr_foundation(new.id, v_days, 'manual');
      end if;
      -- 'free' hr: nothing to grant (signup trial trigger already seeds).
    else
      if g.plan = 'FREE' then
        update public.profiles
          set plan = 'FREE', pro_access_expires_at = null, is_pro = false
          where id = new.id;
      elsif g.access_kind = 'permanent' then
        update public.profiles
          set plan = g.plan, pro_access_expires_at = timestamptz '2099-01-01', is_pro = true
          where id = new.id;
      elsif g.access_kind = 'expiry' and g.expiry is not null then
        update public.profiles
          set plan = g.plan, pro_access_expires_at = g.expiry, is_pro = true
          where id = new.id;
      else
        update public.profiles
          set plan = g.plan, pro_access_expires_at = now() + make_interval(days => v_days), is_pro = true
          where id = new.id;
      end if;
    end if;

    update public.pending_grants
      set status = 'resolved', resolved_at = now(), resolved_user = new.id
      where id = g.id;

    insert into public.audit_log (actor_email, action, target_type, target_id, target_email, portal, after, metadata)
    values (
      'system:pending_resolver', 'pending_grant_resolved', 'user', new.id::text, new.email, g.portal,
      jsonb_build_object('plan', g.plan, 'access_kind', g.access_kind, 'days', v_days),
      jsonb_build_object('pending_grant_id', g.id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_resolve_pending_grants on public.profiles;
create trigger trg_resolve_pending_grants
  after insert on public.profiles
  for each row execute function public.resolve_pending_grants_for_profile();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Soft-suspend columns on profiles (reversible). One profiles row per
--    auth user, so this covers a user across BOTH portals. Enforcement is an
--    app guard (see the hand-apply diff), not a hard auth-layer ban.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists account_status    text not null default 'active';
alter table public.profiles add column if not exists suspended_reason  text;
alter table public.profiles add column if not exists suspended_message text;
alter table public.profiles add column if not exists suspended_until   timestamptz;
alter table public.profiles add column if not exists suspended_at      timestamptz;
alter table public.profiles add column if not exists suspended_by      text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_status_known') then
    alter table public.profiles
      add constraint profiles_account_status_known
      check (account_status in ('active','suspended')) not valid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. ats_results (versioned). IF NOT EXISTS: safe if the hand-made table
--    already exists — it will not be recreated or altered.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.ats_results (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  score               integer,
  keywords_score      integer,
  structure_score     integer,
  content_score       integer,
  visibility_boosters jsonb,
  rank_triggers       jsonb,
  industry            text,
  created_at          timestamptz not null default now()
);
create index if not exists ats_results_user_created_idx on public.ats_results (user_id, created_at desc);
create index if not exists ats_results_created_idx      on public.ats_results (created_at desc);

alter table public.ats_results enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ats_results' and policyname = 'ats_results insert own'
  ) then
    create policy "ats_results insert own" on public.ats_results
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ats_results' and policyname = 'ats_results read own or owner'
  ) then
    create policy "ats_results read own or owner" on public.ats_results
      for select using (
        auth.uid() = user_id
        or auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com'
      );
  end if;
end $$;

commit;
