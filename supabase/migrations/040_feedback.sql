-- =============================================================
-- 040_feedback.sql
--
-- The portal feedback affordance (one tap, from anywhere in the
-- employer portal). She writes one sentence, the product silently
-- carries the context. The ROW is the record; the founder email is
-- only the notification. So the row is written first and always,
-- even if the email never sends.
--
-- Security:
--   - INSERT: an authenticated user may write only their own row
--     (user_id = auth.uid()). That is the whole write surface.
--   - No SELECT / UPDATE / DELETE policy exists, so no user can read
--     anyone's feedback (not even their own) through the anon/auth
--     key. The founder reads via the Supabase dashboard / service
--     role, which bypasses RLS.
--   - No candidate PII is stored here by contract: `body` is her own
--     words, the rest is her identity and where she was. The client
--     never writes candidate names, emails, or CV text into this row.
-- =============================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null,
  body        text not null,
  route       text,
  session_id  text,
  user_agent  text
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

comment on table public.feedback is
  'Portal feedback from HRs. One row per submission. The row is the record; the founder email is only the notification. No candidate PII by contract — body is the sender''s own words, plus her identity and route.';
comment on column public.feedback.session_id is
  'PostHog session replay id at submit time (nullable). Lets the founder watch the 30 seconds before she gave up.';

alter table public.feedback enable row level security;

-- Insert own row only. This is the entire write surface.
create policy "feedback insert own"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Deliberately NO select / update / delete policy: feedback is
-- write-only for users. The founder reads it out-of-band (dashboard /
-- service role), so one HR can never read another's words.
