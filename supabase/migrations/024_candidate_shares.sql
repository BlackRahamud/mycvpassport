-- =============================================================
-- 024_candidate_shares.sql
--
-- Phase A of the secure candidate share feature (read path only).
-- A recruiter mints a secure, expiring, read-only link; an external
-- reviewer opens it with no account and sees a whitelisted view of the
-- candidate, served only through the get-shared-candidate Edge Function.
--
-- Schema note (verified Step 0): there is NO public.candidates table in
-- this project. The shareable unit is a row in public.applications (one
-- candidate per job pipeline). So the share anchors on application_id,
-- not candidate_id. Everything the public page shows (name, email, phone,
-- visa_status, cv_file_path, status) lives on applications; the sharing
-- company resolves via applications.job_id -> jobs.company.
-- =============================================================

create table if not exists public.candidate_shares (
  id                uuid primary key default gen_random_uuid(),
  -- the value used in the public URL (NOT the primary key)
  public_token      uuid not null unique default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  created_by        uuid not null references auth.users(id),
  expires_at        timestamptz not null default (now() + interval '7 days'),
  is_revoked        boolean not null default false,
  hide_contact_info boolean not null default true,
  view_count        integer not null default 0,
  last_viewed_at    timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists candidate_shares_public_token_idx
  on public.candidate_shares (public_token);
create index if not exists candidate_shares_application_id_idx
  on public.candidate_shares (application_id);

comment on table public.candidate_shares is
  'Secure, expiring, read-only candidate share links. Read path served only via the get-shared-candidate Edge Function (service role). Phase A: no feedback write path.';
comment on column public.candidate_shares.public_token is
  'Opaque token used in the public URL /shared/candidate/<public_token>. Not the primary key.';
comment on column public.candidate_shares.application_id is
  'The shared candidate, i.e. a public.applications row (no candidates table exists).';

-- RLS: only the authenticated recruiter who created a row may touch it.
-- The Edge Function uses the service role and bypasses RLS for the read path.
alter table public.candidate_shares enable row level security;

create policy "candidate_shares owner all"
  on public.candidate_shares
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
