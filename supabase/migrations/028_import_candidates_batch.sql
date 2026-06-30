-- =============================================================
-- 028_import_candidates_batch.sql
--
-- Transactional batch import for HR candidate intake. The client parses,
-- uploads, and scores each CV (those steps cannot live in a DB transaction),
-- then calls this function ONCE with the parsed records. The function, in a
-- single transaction:
--   - creates a sourcing pool job (when p_pool_name is given) or validates an
--     existing owned job (p_job_id),
--   - de-duplicates each record against existing applications in that job by
--     email (case-insensitive) or phone (digits only), skipping repeats,
--   - inserts the rest as imported applications.
-- If any insert raises, the whole function rolls back: no orphan pool row and
-- no half-imported applications. Returns the job id, how many were inserted,
-- how many were skipped as duplicates, and the 0-based indices skipped so the
-- UI can mark each file.
--
-- Security: SECURITY INVOKER, so every write is still checked by the existing
-- RLS policies (jobs: auth.uid() = hr_id; applications: auth.uid() = hr_id and
-- the job is owned by the caller). The function never bypasses RLS and never
-- trusts a passed hr_id: it always uses auth.uid(). All text inputs are length
-- capped. search_path is pinned.
-- =============================================================

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
      visa_status, ats_score, score_source, applied_at
    ) values (
      v_job, v_hr, null, 'imported', 'new', true,
      coalesce(v_rec->'cv_snapshot', '{}'::jsonb),
      nullif(btrim(coalesce(v_rec->>'cv_file_path', '')), ''),
      v_name, v_email, v_phone,
      left(nullif(btrim(coalesce(v_rec->>'visa_status', '')), ''), 80),
      greatest(0, least(100, coalesce((v_rec->>'ats_score')::int, 0))),
      coalesce(nullif(btrim(coalesce(v_rec->>'score_source', '')), ''), 'import_pending'),
      now()
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
  'Transactional HR candidate batch import. Creates a pool or uses an owned job, dedups by email/phone, inserts imported applications atomically. SECURITY INVOKER so RLS is enforced; never trusts a passed hr_id (uses auth.uid()).';
