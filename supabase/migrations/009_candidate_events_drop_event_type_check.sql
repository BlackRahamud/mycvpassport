-- 009_candidate_events_drop_event_type_check.sql
--
-- candidate_events was created for HR-journey tracking (applied/viewed/
-- shortlisted/etc.) and the original CHECK constraint enumerated those
-- 11 values. The table has since been repurposed as the Supabase sink
-- for the unified logEvent() analytics helper, which writes any string
-- event type (template_card_clicked, homepage_cta_clicked,
-- cv_only_result_shown, jd_cta_clicked, etc.). Every analytics write
-- has been silently failing the constraint.
--
-- Drop the constraint. event_type stays NOT NULL but is now unconstrained,
-- so we don't need a migration every time we add a new analytics event.
-- HR-journey state transitions are validated in app code, not the DB.
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

alter table candidate_events
  drop constraint if exists candidate_events_event_type_check;
