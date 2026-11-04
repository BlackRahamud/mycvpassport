-- Candidate-owned AI interview practice. This data is separate from the
-- recruiter-owned interviews and interview_question_sets tables.

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null check (char_length(role_title) between 2 and 160),
  job_description text not null default '' check (char_length(job_description) <= 12000),
  cv_text text not null check (char_length(cv_text) between 80 and 18000),
  mode text not null check (mode in ('voice', 'text')),
  difficulty text not null default 'intermediate' check (difficulty in ('entry', 'intermediate', 'senior')),
  category text not null default 'general' check (category in ('general', 'technical', 'behavioral', 'role_specific')),
  status text not null default 'setup' check (status in ('setup', 'in_progress', 'completed')),
  report jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists practice_sessions_candidate_created_idx
  on public.practice_sessions (candidate_id, created_at desc);

alter table public.practice_sessions enable row level security;

drop policy if exists "Candidates read own practice sessions" on public.practice_sessions;
create policy "Candidates read own practice sessions"
  on public.practice_sessions for select to authenticated
  using (candidate_id = (select auth.uid()));

drop policy if exists "Candidates create own practice sessions" on public.practice_sessions;
create policy "Candidates create own practice sessions"
  on public.practice_sessions for insert to authenticated
  with check (candidate_id = (select auth.uid()));

drop policy if exists "Candidates delete own practice sessions" on public.practice_sessions;
create policy "Candidates delete own practice sessions"
  on public.practice_sessions for delete to authenticated
  using (candidate_id = (select auth.uid()));

create table if not exists public.practice_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  position numeric not null check (position > 0),
  question_id text not null,
  root_question_id text not null,
  category text not null,
  question text not null check (char_length(question) between 2 and 500),
  choices jsonb not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array'),
  answer text check (answer is null or char_length(answer) <= 12000),
  evaluation jsonb,
  evaluation_started_at timestamptz,
  is_follow_up boolean not null default false,
  follow_up_count integer not null default 0 check (follow_up_count between 0 and 2),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (session_id, position)
);

create index if not exists practice_turns_session_position_idx
  on public.practice_turns (session_id, position);
create index if not exists practice_turns_candidate_session_idx
  on public.practice_turns (candidate_id, session_id);

alter table public.practice_turns enable row level security;

drop policy if exists "Candidates read own practice turns" on public.practice_turns;
create policy "Candidates read own practice turns"
  on public.practice_turns for select to authenticated
  using (
    candidate_id = (select auth.uid())
    and exists (
      select 1 from public.practice_sessions s
      where s.id = session_id and s.candidate_id = (select auth.uid())
    )
  );

comment on table public.practice_sessions is
  'Candidate-owned practice interview sessions. Kept separate from recruiter-scheduled public.interviews.';
comment on table public.practice_turns is
  'Candidate-owned interview questions, original answers, and validated AI feedback. Writes are server-only; candidates can read their own turns.';

