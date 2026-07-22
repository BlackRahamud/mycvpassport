-- ============================================================================
-- 051_feature_flags.sql — Admin Command Center, Phase 4: live kill switches.
--
-- STATUS: PENDING. Apply by hand in the Supabase SQL Editor. Idempotent.
--
-- The app reads these flags LIVE to gate features — no deploy needed to flip
-- one. SELECT is public (anon + authenticated) because the client and the
-- serverless endpoints both read them to decide whether a feature is on;
-- writes come only from the service role (api/admin.js), which is audited.
--
-- Semantics:
--   kill switches (candidate_checkout, hr_checkout, ai_evaluation, ats_checker,
--     pdf_export, hr_portal): enabled=true means the feature is ON. Flipping
--     the switch sets enabled=false to turn the feature OFF.
--   maintenance_candidate / maintenance_hr: enabled=true means that portal is
--     in read-only maintenance.
--   incident_banner: enabled=true shows the banner; value = {message, portal}.
--
-- Readers DEFAULT TO ON: a missing row or a read error leaves the feature
-- working, so a flag outage never takes checkout/AI/PDF down by accident.
-- ============================================================================

begin;

create table if not exists public.feature_flags (
  key         text primary key,
  enabled     boolean not null default true,
  value       jsonb,
  description text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'feature_flags read all'
  ) then
    create policy "feature_flags read all" on public.feature_flags for select using (true);
  end if;
end $$;
-- No write policy: only the service role (api/admin.js) writes.

insert into public.feature_flags (key, enabled, description) values
  ('candidate_checkout', true,  'Candidate payment checkout'),
  ('hr_checkout',        true,  'HR / employer payment checkout'),
  ('ai_evaluation',      true,  'AI evaluation (analyze-cv, verdicts, job match)'),
  ('ats_checker',        true,  'ATS checker'),
  ('pdf_export',         true,  'CV PDF export'),
  ('hr_portal',          true,  'The whole HR employer portal'),
  ('maintenance_candidate', false, 'Candidate portal read-only maintenance'),
  ('maintenance_hr',        false, 'HR portal read-only maintenance')
on conflict (key) do nothing;

insert into public.feature_flags (key, enabled, value, description) values
  ('incident_banner', false, '{"message":"","portal":"both"}'::jsonb, 'Status/incident banner')
on conflict (key) do nothing;

commit;
