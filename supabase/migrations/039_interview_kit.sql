-- ============================================================================
-- 039_interview_kit.sql
--
-- Interview kit, data model half. Extends the existing interviews entity
-- (migration 018) — deliberately NOT a new table — with:
--
-- 1. interviewer_id: who runs the call. Defaults to the owning HR in app
--    code (cheap future proofing for client / hiring-manager interviews,
--    a later build). Backfilled to hr_id exactly once below.
--
-- 2. The scorecard: rating ('strong_yes' | 'yes' | 'mixed' | 'no'),
--    rating_note (one optional line), rated_at. Saving the rating is what
--    flips status to 'completed' and moves the application to Interviewed;
--    the stage write itself stays in src/lib/hr/stageApi.js.
--
-- 3. candidate_tz: IANA timezone inferred from the CV location or the job
--    market at schedule time (src/lib/hr/interviewTz.js), overridable in
--    the schedule modal. Drives the dual timezone readout and the email.
--
-- 4. kit jsonb: the persisted prep kit. Shape (owned by
--    src/lib/hr/interviewKit.js — change both together):
--      { "questions": [{ "id", "category", "question", "listen_for",
--                        "source": "ai" | "yours" }],
--        "asked":   { "<question id>": true },
--        "notes":   { "<question id>": "text" },
--        "generated_at": iso }
--    Nothing dies on refresh: mark-asked and per-question notes write here.
--
-- 5. ics_sequence: iCalendar SEQUENCE counter. The .ics UID is stable per
--    interview (interview-<id>@mycvpassport.com); every reschedule or
--    cancel bumps this so Outlook/Google treat the update as the same
--    meeting, not a duplicate.
--
-- 6. interview_question_sets: her saved question bank, one set per
--    (hr, job). "Save these as my set for <role>" writes here; the next
--    interview for that job preloads exactly this set, free, no AI call.
--
-- 7. applications.reject_reason gains 'did_not_join' (the no-show path
--    preselects it). Mirrored in src/lib/hr/rejectReasons.js — change
--    both together.
--
-- Paste into the Supabase SQL Editor (project evihcqpvoorsdmzjnvjz).
-- Safe to run more than once.
-- ============================================================================

-- ── 1. Interview columns ──
alter table interviews add column if not exists interviewer_id uuid references auth.users(id);
alter table interviews add column if not exists rating         text;
alter table interviews add column if not exists rating_note    text;
alter table interviews add column if not exists rated_at       timestamptz;
alter table interviews add column if not exists candidate_tz   text;
alter table interviews add column if not exists kit            jsonb;
alter table interviews add column if not exists ics_sequence   integer not null default 0;

alter table interviews drop constraint if exists interviews_rating_check;
alter table interviews add constraint interviews_rating_check
  check (rating is null or rating in ('strong_yes', 'yes', 'mixed', 'no'));

comment on column interviews.interviewer_id is
  'Who runs the call. Today always the owning HR (backfilled + set on insert); a later build lets a client or hiring manager interview.';
comment on column interviews.rating is
  'Scorecard thumb: strong_yes | yes | mixed | no. NULL until she saves the rating; saving also flips status to completed.';
comment on column interviews.rating_note is
  'The one optional scorecard line. Carried into the reject record when the rating is no.';
comment on column interviews.candidate_tz is
  'IANA timezone for the candidate, inferred from CV location or job market, overridable at schedule time. Drives the dual timezone readout and invite email.';
comment on column interviews.kit is
  'Persisted prep kit: { questions[], asked{}, notes{}, generated_at }. Shape owned by src/lib/hr/interviewKit.js — change both together.';
comment on column interviews.ics_sequence is
  'iCalendar SEQUENCE. UID stays interview-<id>@mycvpassport.com for the row''s lifetime; reschedule/cancel bump this so calendars update in place.';

-- One-time backfill: existing interviews were all run by the owning HR.
update interviews set interviewer_id = hr_id where interviewer_id is null;

-- ── 2. Saved question sets (her bank, one per HR + job) ──
create table if not exists interview_question_sets (
  id          uuid primary key default gen_random_uuid(),
  hr_id       uuid not null references auth.users(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  questions   jsonb not null,
  updated_at  timestamptz not null default now(),
  unique (hr_id, job_id)
);

comment on table interview_question_sets is
  'Her saved interview question set per job ("Save these as my set for <role>"). Preloaded free for every later interview on that job. questions shape matches interviews.kit.questions.';

alter table interview_question_sets enable row level security;

drop policy if exists "HR selects own question sets" on interview_question_sets;
create policy "HR selects own question sets"
  on interview_question_sets
  for select
  to authenticated
  using (hr_id = (select auth.uid()));

drop policy if exists "HR inserts own question sets" on interview_question_sets;
create policy "HR inserts own question sets"
  on interview_question_sets
  for insert
  to authenticated
  with check (hr_id = (select auth.uid()));

drop policy if exists "HR updates own question sets" on interview_question_sets;
create policy "HR updates own question sets"
  on interview_question_sets
  for update
  to authenticated
  using (hr_id = (select auth.uid()))
  with check (hr_id = (select auth.uid()));

drop policy if exists "HR deletes own question sets" on interview_question_sets;
create policy "HR deletes own question sets"
  on interview_question_sets
  for delete
  to authenticated
  using (hr_id = (select auth.uid()));

-- ── 3. Reject reason gains the no-show code ──
alter table applications drop constraint if exists applications_reject_reason_check;
alter table applications add constraint applications_reject_reason_check
  check (reject_reason is null or reject_reason in (
    'did_not_join',
    'salary_mismatch',
    'notice_period_too_long',
    'visa_not_viable',
    'overqualified',
    'no_gulf_experience',
    'failed_screening_requirement',
    'other'
  ));
