-- 007_scout_preferences_filters.sql
--
-- Adds Job Type + Date Posted filters to scout_preferences. Both default
-- to "Any" / "Any time" so existing rows behave identically until the
-- user sets a filter explicitly.
--
-- Apply in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

alter table scout_preferences
  add column if not exists job_type text default 'Any',
  add column if not exists date_posted_filter text default 'Any time';
