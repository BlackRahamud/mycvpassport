-- =============================================================
-- 026_candidate_feedback.sql
--
-- In-product feedback from signed-in candidates (the dashboard Feedback
-- panel). A user submits a sentiment + message + optional context; the row is
-- written directly by the user under RLS (insert-own only). The founder is
-- notified by a Supabase insert webhook -> notify-feedback Edge Function ->
-- Resend email. The webhook is configured in the Supabase dashboard
-- (Database -> Webhooks) and not in SQL, so the function URL and secret stay
-- out of the schema; see supabase/functions/notify-feedback/index.ts.
--
-- Security:
--   - RLS on. The ONLY policy is insert-own: an authenticated user may insert
--     a row for themselves and nothing else. There is deliberately NO select /
--     update / delete policy, so neither the anon nor the authenticated key
--     can read, edit, or remove feedback (their own or anyone else's). The
--     founder reads via the service role / Supabase dashboard.
--   - user_id defaults to auth.uid() and the insert policy pins it
--     (with check auth.uid() = user_id), so a client cannot forge another
--     user's id even if it sends one.
--   - Lengths are capped by check constraints (message 1..4000, context <=500,
--     page <=200), so a client cannot write unbounded text if the UI is
--     bypassed.
-- =============================================================

create table if not exists public.candidate_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 4000),
  sentiment  text check (sentiment in ('positive', 'neutral', 'negative')),
  context    text check (context is null or char_length(context) <= 500),
  page       text check (page is null or char_length(page) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists candidate_feedback_created_at_idx
  on public.candidate_feedback (created_at desc);

comment on table public.candidate_feedback is
  'In-product feedback from signed-in candidates (dashboard Feedback panel). Insert-own only under RLS; founder reads via the service role. A Supabase insert webhook calls the notify-feedback Edge Function, which emails the founder.';

alter table public.candidate_feedback enable row level security;

-- Insert-own only: the new row's user_id must be the caller. Because the
-- column defaults to auth.uid(), the client never needs to send user_id, and
-- pinning it here means a client cannot submit feedback as someone else.
create policy "candidate_feedback insert own"
  on public.candidate_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Deliberately NO select / update / delete policy: users cannot read, edit, or
-- delete feedback. The founder reads via the service role or the dashboard.
