-- ============================================================================
-- 050_plans.sql — Admin Command Center, Phase 3: editable plan catalogue.
--
-- STATUS: PENDING. Apply by hand in the Supabase SQL Editor. Idempotent.
--
-- The Plan builder edits rows here. tierConfig.js stays the code-level source
-- of truth for the live checkout math; this table is the admin-editable
-- mirror seeded from it. Explorer and Foundation are marked immutable so the
-- Plan builder cannot delete or reprice the free base or the fixed employer
-- plan (Foundation pricing anchors the whole HR design).
-- ============================================================================

begin;

create table if not exists public.plans (
  slug          text primary key,
  name          text not null,
  portal        text not null check (portal in ('candidate','hr')),
  aed_minor     integer,   -- fils; null = not sold in AED
  inr_minor     integer,   -- paise; null = not sold in INR
  duration_days integer,   -- null = permanent / not applicable
  model         text not null default 'pass' check (model in ('free','permanent','pass')),
  entitlements  jsonb not null default '{}',
  immutable     boolean not null default false,
  active        boolean not null default true,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.plans enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plans' and policyname = 'plans read owner'
  ) then
    create policy "plans read owner" on public.plans
      for select using (auth.jwt() ->> 'email' = 'connectingjunaidkhan@gmail.com');
  end if;
end $$;
-- Writes come from the service role (api/admin.js), which bypasses RLS.

-- Seed from tierConfig.js (prices in minor units). ON CONFLICT DO NOTHING so a
-- re-run never clobbers edits the founder made in the Plan builder.
insert into public.plans (slug, name, portal, aed_minor, inr_minor, duration_days, model, entitlements, immutable, sort) values
  ('explorer',     'Explorer',      'candidate', 0,     0,     null, 'free',      '{"ai_tailor_quota":0}'::jsonb,                                  true,  0),
  ('express_pass', 'Express Pass',  'candidate', 1900,  14900, null, 'permanent', '{"ai_tailor_quota":3}'::jsonb,                                  false, 1),
  ('active_hunter','Active Hunter', 'candidate', 2900,  34900, 30,   'pass',      '{"ai_tailor_quota":10}'::jsonb,                                 false, 2),
  ('career_pro',   'Career Pro',    'candidate', 16900, 99900, 365,  'pass',      '{"ai_tailor_quota":null}'::jsonb,                               false, 3),
  ('foundation',   'Foundation',    'hr',        9900,  99900, 30,   'pass',      '{"active_jobs":3,"ai_evaluation":true,"analytics":true}'::jsonb, true,  4)
on conflict (slug) do nothing;

commit;
