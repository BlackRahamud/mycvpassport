-- ============================================================================
-- 037_new_entry_stage.sql
--
-- Candidate evaluation redesign, data model half.
--
-- 1. The pipeline gains an entry stage named NEW, placed before Shortlist.
--    No schema change is needed for the stage itself: applications.status
--    already accepts 'new' (widened by migration 013), and both write paths
--    (JobPage public apply, import_candidates_batch RPC) already write
--    status = 'new'. What changes is the UI mapping: statuses
--    'new' / 'submitted' / 'viewed' now render as their own New column
--    instead of being folded into Shortlist (src/lib/hr/stages.js).
--
-- 2. ONE TIME PLACEMENT (idempotent, non destructive): every application
--    that today renders inside Shortlist keeps rendering inside Shortlist.
--    Rows whose status is 'new' / 'submitted' / 'viewed' were displayed in
--    the Shortlist column before this migration, so they are moved to the
--    canonical 'shortlisted' status exactly once. The flag row below makes
--    re-running this file a no-op: applications created AFTER the flag was
--    set keep their 'new' status and land in the New column, as designed.
--
-- 3. Reject flow columns: a required reason code, the rejection timestamp,
--    and the scheduled batched-notification time (about 24 hours later).
--    NOTE: no rejection email is sent today anywhere in the codebase; the
--    reject_notify_at column is the future batch sender's queue cursor and
--    is written from day one so history is complete when the sender ships.
--
-- 4. screening_answers jsonb on applications: jobs.screening_questions
--    (migration 011) has never had an answers column; JobPipelinePage
--    already reads cv_snapshot.screening_answers / row.screening_answers
--    defensively. This makes the row-level column real. Array of
--    { answer text, status 'pass' | 'fail' | 'neutral' } objects, index
--    aligned with jobs.screening_questions.
--
-- Ready ("ready") renamed to "To interview" is a LABEL change only — the
-- DB status string 'ready' is untouched, so nothing here migrates it.
--
-- Paste into the Supabase SQL Editor (project evihcqpvoorsdmzjnvjz).
-- Safe to run more than once.
-- ============================================================================

-- Flag table: one row per one-time data migration, so data moves (unlike
-- schema changes, which are naturally idempotent) can never run twice.
create table if not exists migration_flags (
  key         text primary key,
  applied_at  timestamptz not null default now()
);

alter table migration_flags enable row level security;
-- No policies on purpose: the table is written only from the SQL editor
-- (service role). Client roles can neither read nor write it.

comment on table migration_flags is
  'One row per one-time data migration. Guards data moves against re-runs; schema changes stay naturally idempotent.';

-- ── 1. One-time placement: existing Shortlist-column rows stay in Shortlist ──
do $$
begin
  if not exists (select 1 from migration_flags where key = '037_new_entry_stage') then
    update applications
       set status = 'shortlisted',
           updated_at = now()
     where status in ('new', 'submitted', 'viewed');
    insert into migration_flags (key) values ('037_new_entry_stage');
  end if;
end $$;

-- ── 2. Reject flow columns ──
alter table applications add column if not exists reject_reason    text;
alter table applications add column if not exists rejected_at      timestamptz;
alter table applications add column if not exists reject_notify_at timestamptz;

alter table applications drop constraint if exists applications_reject_reason_check;
alter table applications add constraint applications_reject_reason_check
  check (reject_reason is null or reject_reason in (
    'salary_mismatch',
    'notice_period_too_long',
    'visa_not_viable',
    'overqualified',
    'no_gulf_experience',
    'failed_screening_requirement',
    'other'
  ));

comment on column applications.reject_reason is
  'Required reason code picked in the reject modal. Sharpens matching + talent pool search. NULL for non-rejected rows and legacy rejections.';
comment on column applications.rejected_at is
  'When the recruiter confirmed the rejection. Cleared on undo (status moves back, reason NULLed).';
comment on column applications.reject_notify_at is
  'Scheduled batched candidate notification time (about 24h after rejected_at). No sender exists yet; this is the future batch job''s queue cursor. Undo before this time cancels the notification by clearing the row.';

-- ── 3. Screening answers on the application row ──
alter table applications add column if not exists screening_answers jsonb;

comment on column applications.screening_answers is
  'Array aligned by index with jobs.screening_questions: [{ "answer": text, "status": "pass" | "fail" | "neutral" }]. NULL when the apply flow did not collect answers (all organic applies before mid 2026, and all imports).';

-- Partial index: the future batch notifier scans due, still-rejected rows.
create index if not exists idx_applications_reject_notify_due
  on applications (reject_notify_at)
  where reject_notify_at is not null and status = 'rejected';
