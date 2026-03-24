-- Adds ATS free-scan counter for paywall logic.
alter table if exists public.profiles
add column if not exists ats_scans_used integer not null default 0;
