-- =============================================================
-- Per-user free-tier counter for the in-builder AI assist
-- (Session A of the AI Tailor sprint).
--
-- Mirrors the existing add_ats_scans_used_to_profiles.sql pattern,
-- with two SECURITY DEFINER functions for atomic credit deduct +
-- refund. Atomicity matters: two parallel browser tabs must not
-- both pass the gate (would burn 2 credits on a single user click).
-- supabase-js cannot express "set X = X + 1 where X < limit" via
-- the .update() builder, so the deduct happens through an RPC.
--
-- Reads/writes go via the service-role key from api/ai.js. End
-- users never write profiles directly. Existing profiles RLS is
-- unchanged.
-- =============================================================

alter table if exists public.profiles
add column if not exists ai_credits_used integer not null default 0;

-- Atomic deduct. Returns the new used count, or NULL when the user
-- has already hit the limit. Caller treats NULL as "exhausted".
create or replace function public.try_deduct_ai_credit(p_user_id uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_used int;
begin
  update public.profiles
  set ai_credits_used = ai_credits_used + 1
  where id = p_user_id
    and ai_credits_used < p_limit
  returning ai_credits_used into v_new_used;
  return v_new_used;
end;
$$;

-- Refund a credit on Anthropic upstream failure. Floors at 0 so a
-- double-refund (defensive) cannot put the counter negative.
create or replace function public.refund_ai_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_used int;
begin
  update public.profiles
  set ai_credits_used = ai_credits_used - 1
  where id = p_user_id
    and ai_credits_used > 0
  returning ai_credits_used into v_new_used;
  return v_new_used;
end;
$$;

-- Service role is the only caller from api/ai.js; revoke broad
-- access and grant explicitly so a misconfigured client cannot
-- mint or refund credits via the JS SDK.
revoke execute on function public.try_deduct_ai_credit(uuid, int) from public, anon, authenticated;
revoke execute on function public.refund_ai_credit(uuid) from public, anon, authenticated;
grant execute on function public.try_deduct_ai_credit(uuid, int) to service_role;
grant execute on function public.refund_ai_credit(uuid) to service_role;
