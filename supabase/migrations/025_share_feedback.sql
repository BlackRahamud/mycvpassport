-- =============================================================
-- 025_share_feedback.sql
--
-- Phase B of the secure candidate share feature: the external reviewer's
-- write path. A reviewer on the public /shared/candidate/<token> page votes
-- approve or pass and leaves a note. That submission is written ONLY here,
-- by the service-role submit-share-feedback Edge Function, never into
-- recruiter_notes or any existing internal table.
--
-- Security:
--   - No insert/update/delete policy exists, so the anon key can never write.
--     Inserts happen solely through the service role (which bypasses RLS).
--   - A single owner-only SELECT policy lets a recruiter read feedback only
--     for shares they themselves created.
--   - The reviewer's IP is stored only as a salted hash (reviewer_ip_hash),
--     computed in the function with a secret salt; the raw IP is never stored.
-- =============================================================

create table if not exists public.share_feedback (
  id               uuid primary key default gen_random_uuid(),
  share_id         uuid not null references public.candidate_shares(id) on delete cascade,
  vote             text not null check (vote in ('approve', 'pass')),
  feedback_text    text not null,
  reviewer_ip_hash text,
  created_at       timestamptz not null default now()
);

create index if not exists share_feedback_share_id_idx
  on public.share_feedback (share_id);

comment on table public.share_feedback is
  'External reviewer feedback on a shared candidate. Written only by the service-role submit-share-feedback Edge Function. Never recruiter_notes.';
comment on column public.share_feedback.reviewer_ip_hash is
  'Salted SHA-256 hash of the reviewer IP (salt is a function secret). Used for per-reviewer rate limiting. The raw IP is never stored.';

alter table public.share_feedback enable row level security;

-- Owner-only read: a recruiter can see feedback only for shares they created.
create policy "share_feedback owner select"
  on public.share_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.candidate_shares cs
      where cs.id = share_feedback.share_id
        and cs.created_by = auth.uid()
    )
  );

-- Deliberately NO insert / update / delete policy: the public anon key can
-- never write here. All inserts go through the service-role function.
