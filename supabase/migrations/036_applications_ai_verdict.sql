-- =============================================================
-- 036_applications_ai_verdict.sql
--
-- One verdict, one number, everywhere (walkthrough blocker 1: the match
-- score changed between surfaces because the Sonnet verdict was re-run
-- per surface and never persisted — import kept only the integer score,
-- VerdictCard/Compare rerolled a fresh verdict per session).
--
-- applications.ai_verdict becomes the single source of truth: the full
-- verdict JSON ({verdict, score, two_second_why, strengths, gaps,
-- whatsapp_cta_template}) is computed ONCE per candidate+job, stored on
-- the row, and every surface (board card, CRM list badge, drawer,
-- Compare) reads the stored object. ats_score stays the fast sortable
-- integer, synced to ai_verdict.score by the writers.
--
-- Write paths:
--   1. Import: BulkCvImport already generates the full verdict at upload
--      time — import_candidates_batch (recreated below) now persists it
--      instead of discarding everything but the score.
--   2. First drawer open (normal applicants): the client generates once
--      and writes back via its own RLS-checked UPDATE (001's "HR updates
--      application status" policy, hr_id = auth.uid()) with a
--      first-write-wins guard (WHERE ai_verdict IS NULL).
--
-- Backward compatible: same function signature (uuid, text, text, jsonb),
-- the new per-record 'ai_verdict' key is OPTIONAL (absent -> NULL, exactly
-- the pre-036 behavior), same return shape, still SECURITY INVOKER.
-- Old clients calling the recreated function work unchanged.
-- =============================================================

-- 1) The persisted verdict + when it was generated.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS ai_verdict jsonb;
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS verdict_generated_at timestamptz;

COMMENT ON COLUMN public.applications.ai_verdict IS
  'Full Sonnet candidate_verdict JSON, computed once per candidate+job and read by every surface (board, CRM list, drawer, Compare). NULL = not yet generated; first reader generates and persists. ats_score mirrors ai_verdict.score once set.';
COMMENT ON COLUMN public.applications.verdict_generated_at IS
  'When ai_verdict was generated (import time or first drawer open, or the explicit Regenerate action).';

-- 2) Recreate import_candidates_batch: identical behavior plus persisting
--    the optional per-record ai_verdict JSON. Signature unchanged.
create or replace function public.import_candidates_batch(
  p_job_id uuid,
  p_pool_name text,
  p_market text,
  p_records jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hr uuid := auth.uid();
  v_job uuid;
  v_rec jsonb;
  v_idx int := 0;
  v_email text;
  v_phone text;
  v_norm text;
  v_name text;
  v_verdict jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_skipped_idx int[] := '{}';
  v_count int;
begin
  if v_hr is null then
    raise exception 'not authenticated';
  end if;

  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'records must be a json array';
  end if;
  v_count := jsonb_array_length(p_records);
  if v_count = 0 then
    raise exception 'no records to import';
  end if;
  if v_count > 100 then
    raise exception 'batch too large (max 100)';
  end if;

  -- Exactly one target: a new pool, or an existing job.
  if (p_pool_name is not null) = (p_job_id is not null) then
    raise exception 'provide either a pool name or a job id, not both';
  end if;

  if p_pool_name is not null then
    if char_length(btrim(p_pool_name)) < 1 or char_length(p_pool_name) > 80 then
      raise exception 'pool name must be 1 to 80 characters';
    end if;
    -- company and location are NOT NULL on jobs; a pool has neither, so empty
    -- strings. kind = 'pool' keeps it out of every active-job metric.
    insert into public.jobs (hr_id, title, company, location, source, status, kind, market)
    values (
      v_hr, btrim(p_pool_name), '', '', 'hr_portal', 'active', 'pool',
      case when p_market = 'india' then 'india' else 'gulf' end
    )
    returning id into v_job;
  else
    select id into v_job from public.jobs where id = p_job_id and hr_id = v_hr;
    if v_job is null then
      raise exception 'job not found or not owned';
    end if;
  end if;

  for v_rec in select value from jsonb_array_elements(p_records)
  loop
    v_name := left(coalesce(nullif(btrim(coalesce(v_rec->>'candidate_name', '')), ''), 'Imported candidate'), 200);
    v_email := nullif(lower(btrim(coalesce(v_rec->>'candidate_email', ''))), '');
    v_phone := left(nullif(btrim(coalesce(v_rec->>'candidate_phone', '')), ''), 40);
    v_norm := nullif(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), '');
    -- Optional full verdict JSON (036). Absent or non-object -> NULL,
    -- which is exactly the pre-036 behavior.
    v_verdict := case when jsonb_typeof(v_rec->'ai_verdict') = 'object'
                      then v_rec->'ai_verdict' else null end;

    -- Dedup within this job by email (ci) or phone (digits only).
    if exists (
      select 1 from public.applications a
      where a.job_id = v_job
        and (
          (v_email is not null and lower(coalesce(a.candidate_email, '')) = v_email)
          or (v_norm is not null and regexp_replace(coalesce(a.candidate_phone, ''), '\D', '', 'g') = v_norm)
        )
    ) then
      v_skipped := v_skipped + 1;
      v_skipped_idx := array_append(v_skipped_idx, v_idx);
      v_idx := v_idx + 1;
      continue;
    end if;

    insert into public.applications (
      job_id, hr_id, candidate_id, source, status, is_visible_to_hr,
      cv_snapshot, cv_file_path, candidate_name, candidate_email, candidate_phone,
      visa_status, ats_score, score_source, applied_at,
      ai_verdict, verdict_generated_at
    ) values (
      v_job, v_hr, null, 'imported', 'new', true,
      coalesce(v_rec->'cv_snapshot', '{}'::jsonb),
      nullif(btrim(coalesce(v_rec->>'cv_file_path', '')), ''),
      v_name, v_email, v_phone,
      left(nullif(btrim(coalesce(v_rec->>'visa_status', '')), ''), 80),
      greatest(0, least(100, coalesce((v_rec->>'ats_score')::int, 0))),
      coalesce(nullif(btrim(coalesce(v_rec->>'score_source', '')), ''), 'import_pending'),
      now(),
      v_verdict,
      case when v_verdict is not null then now() else null end
    );
    v_inserted := v_inserted + 1;
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object(
    'job_id', v_job,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'skipped_indices', to_jsonb(v_skipped_idx)
  );
end;
$$;

revoke all on function public.import_candidates_batch(uuid, text, text, jsonb) from public, anon;
grant execute on function public.import_candidates_batch(uuid, text, text, jsonb) to authenticated;

comment on function public.import_candidates_batch(uuid, text, text, jsonb) is
  'Transactional HR candidate batch import. Creates a pool or uses an owned job, dedups by email/phone, inserts imported applications atomically. Since 036 also persists the optional per-record ai_verdict JSON. SECURITY INVOKER so RLS is enforced; never trusts a passed hr_id (uses auth.uid()).';
