-- 005_scout_schema.sql — Scout backend schema (Phase 6)
--
-- Tables created (in order):
--   1. scout_preferences  — one row per user; rate-limit + filter state
--   2. scout_jobs         — raw JSearch fetches per user
--   3. scout_matches      — Claude-scored CV-to-JD matches
--   4. scout_cvs          — generated tailored or universal CVs
--
-- All four tables: RLS enabled, "users own their rows" policy.
-- Apply this in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

-- ---------------------------------------------------------------------
-- Table 1: scout_preferences
-- ---------------------------------------------------------------------
create table scout_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  target_role text,
  location text,
  experience_years int,
  salary_min int,
  sources jsonb default '["all"]',
  last_run_at timestamp with time zone,
  run_count_today int default 0,
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- Table 2: scout_jobs
-- ---------------------------------------------------------------------
create table scout_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  company text,
  location text,
  salary text,
  jd_text text,
  jd_snippet text,
  apply_url text,
  source_platform text,
  fetched_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- Table 3: scout_matches
-- ---------------------------------------------------------------------
create table scout_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid references scout_jobs(id) on delete cascade,
  match_score int,
  match_type text check (match_type in ('direct', 'stretch', 'discarded')),
  key_strengths jsonb,
  missing_requirements jsonb,
  tailoring_advice text,
  ats_keywords jsonb,
  status text default 'new' check (status in ('new', 'saved', 'applied', 'ignored')),
  created_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- Table 4: scout_cvs
-- ---------------------------------------------------------------------
create table scout_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  match_id uuid references scout_matches(id) on delete cascade,
  cv_type text check (cv_type in ('universal', 'specific')),
  tailored_cv_url text,
  cover_letter text,
  generated_at timestamp with time zone default now()
);

-- ---------------------------------------------------------------------
-- Enable Row Level Security on all four
-- ---------------------------------------------------------------------
alter table scout_preferences enable row level security;
alter table scout_jobs enable row level security;
alter table scout_matches enable row level security;
alter table scout_cvs enable row level security;

-- ---------------------------------------------------------------------
-- RLS policies — every user only sees and writes their own rows.
-- "for all" covers select + insert + update + delete with the same
-- predicate (auth.uid() = user_id).
-- ---------------------------------------------------------------------
create policy "Users own their scout_preferences"
  on scout_preferences for all
  using (auth.uid() = user_id);

create policy "Users own their scout_jobs"
  on scout_jobs for all
  using (auth.uid() = user_id);

create policy "Users own their scout_matches"
  on scout_matches for all
  using (auth.uid() = user_id);

create policy "Users own their scout_cvs"
  on scout_cvs for all
  using (auth.uid() = user_id);
