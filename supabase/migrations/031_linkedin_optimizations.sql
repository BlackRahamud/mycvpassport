-- 031_linkedin_optimizations.sql — LinkedIn Optimizer deep-scan storage
--
-- One row per profile scan. Written by the `linkedin-optimize` edge
-- function (service role) after Step 2 confirm. The four-step wizard on
-- /linkedin-optimizer reads its scored result from the STRIPPED copy the
-- edge function returns over HTTP — the browser never selects the row's
-- `result` directly for locked content.
--
-- SECURITY POSTURE (non-negotiable): locked copy (the full About rewrite
-- and every locked experience block's bullets) must never reach the
-- client until the profile is unlocked. Postgres RLS is row-level, not
-- column-level, so a SELECT-own policy on this table would let a crafted
-- client query read a `result` column that contained the full copy.
-- To make "no code path where full copy reaches the client" literally
-- true, the free-safe result lives in `linkedin_optimizations.result`
-- (about_full absent, locked blocks carry no bullets) while the locked
-- copy lives in a SEPARATE table `linkedin_optimizations_private` that
-- has RLS enabled with NO user policy at all — only the service role
-- (edge function / webhook) can read or write it. Unlock re-serve merges
-- the two server-side.
--
-- Unlock itself is NOT a column users can flip. `is_unlocked` defaults
-- false and is a snapshot only; effective unlock is decided server-side
-- from the `permissions` row (service='linkedin_optimizer', set by the
-- Ziina/Razorpay webhooks) OR profiles pro access. There is no UPDATE
-- policy for users on either table.
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

-- ---------------------------------------------------------------------
-- Table: linkedin_optimizations (client-readable, free-safe result)
-- ---------------------------------------------------------------------
create table if not exists public.linkedin_optimizations (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid() references auth.users(id) on delete cascade,

  -- How the profile was supplied. 'pdf' also covers screenshot intake
  -- (both resolve to plain text before scoring); 'paste' is the manual
  -- structured entry path.
  input_method  text        not null check (input_method in ('pdf', 'paste')),

  -- Optional context the user can supply. market drives which gateway /
  -- currency the paywall shows (gulf → Ziina/AED, india → Razorpay/INR).
  target_role   text,
  market        text        check (market in ('gulf', 'india')),

  overall_score int         not null check (overall_score between 0 and 100),

  -- Snapshot flag only. Effective unlock is computed server-side from the
  -- permissions row; this column is never trusted for access decisions and
  -- users have no policy to UPDATE it.
  is_unlocked   boolean     not null default false,

  -- Free-safe scored result. Shape (see docs / edge function):
  --   raw_profile { headline, about, experience_blocks[] }
  --   score { overall, categories{...}, top_three_fixes[3] }
  --   optimized { headline, about_preview,
  --               experience_blocks[{ ..., optimized_bullets[], is_locked }] }
  -- about_full is intentionally ABSENT here; locked experience blocks
  -- carry is_locked:true and NO optimized_bullets. The full copy lives in
  -- linkedin_optimizations_private below.
  result        jsonb       not null default '{}'::jsonb,

  created_at    timestamptz not null default now()
);

create index if not exists linkedin_optimizations_user_created_idx
  on public.linkedin_optimizations (user_id, created_at desc);

-- RLS: users may INSERT their own rows and SELECT their own rows. No
-- UPDATE / DELETE policy — the edge function (service role) owns writes,
-- and unlock is server-authoritative via the permissions table.
alter table public.linkedin_optimizations enable row level security;

drop policy if exists "linkedin_optimizations insert own" on public.linkedin_optimizations;
create policy "linkedin_optimizations insert own"
  on public.linkedin_optimizations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "linkedin_optimizations read own" on public.linkedin_optimizations;
create policy "linkedin_optimizations read own"
  on public.linkedin_optimizations
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Table: linkedin_optimizations_private (SERVER-ONLY locked copy)
--
-- Holds the content that must stay behind the paywall. RLS is enabled
-- with NO policy for authenticated users, so the anon/auth roles can
-- neither read nor write it — only the service role (which bypasses RLS)
-- touches it. This is the hard guarantee that about_full and locked
-- bullets can never be pulled by the browser, unlocked or not; the
-- unlocked full result is only ever assembled inside the edge function
-- and returned over HTTP.
-- ---------------------------------------------------------------------
create table if not exists public.linkedin_optimizations_private (
  optimization_id uuid primary key
    references public.linkedin_optimizations(id) on delete cascade,

  -- Full four-paragraph About rewrite (<= 2600 chars). Withheld until unlock.
  about_full      text,

  -- Locked experience bullets, keyed by experience block id:
  --   { "<block_id>": ["bullet", "bullet", ...], ... }
  -- Only blocks that were locked at scan time appear here; the first
  -- (free) experience block's bullets live in the public result instead.
  locked_bullets  jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now()
);

-- Enable RLS but deliberately create NO policy. With RLS on and no
-- policy, the table is inaccessible to the anon and authenticated roles;
-- the service role bypasses RLS and remains the sole reader/writer.
alter table public.linkedin_optimizations_private enable row level security;
