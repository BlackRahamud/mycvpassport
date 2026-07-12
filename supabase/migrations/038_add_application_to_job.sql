-- ============================================================================
-- 038_add_application_to_job.sql
--
-- Candidates tab redesign (Option A), data model half.
--
-- 1. "Add to job" is a COPY, never a move: a pooled or already-placed person
--    gets a NEW application row on the target job while every existing row
--    (including pool membership) stays untouched. The new row starts at the
--    chosen stage (default 'new') with NO score and NO verdict; the client
--    immediately queues a verdict scoring pass against the target job so the
--    row is never left "Not scored".
--
-- 2. added_from uuid: provenance marker on the copy, pointing at the source
--    application. It exists for two reasons:
--      a) honesty in the data (this row was created by the recruiter routing
--         a person, not by the person applying), and
--      b) the narrow DELETE policy below: toast Undo removes ONLY rows that
--         carry the marker. Organic applications can never be deleted, which
--         keeps the "rejected people are never deleted" product rule intact
--         at the RLS level.
--
-- 3. Targets: an owned ACTIVE job, or an owned POOL (the bulk bar's "Add to
--    pool" uses the same copy semantics; pool copies are forced to 'new' and
--    never carry a stage in the UI).
--
-- Companion of 029_move_application_to_job (which MOVES a row and stays in
-- place for other flows). SECURITY INVOKER, auth.uid() only, like 028/029.
--
-- Paste into the Supabase SQL Editor (project evihcqpvoorsdmzjnvjz).
-- Safe to run more than once.
-- ============================================================================

-- ── 1. Provenance column ──
alter table applications add column if not exists added_from uuid references public.applications(id) on delete set null;

comment on column applications.added_from is
  'Source application id when this row was created by the recruiter''s Add to job / Add to pool copy (RPC add_application_to_job). NULL for organic applies and direct imports. Rows with a marker can be deleted by their owner (toast Undo); unmarked rows cannot.';

create index if not exists idx_applications_added_from on applications (added_from) where added_from is not null;

-- ── 2. The copy RPC ──
create or replace function public.add_application_to_job(
  p_app_id uuid,
  p_job_id uuid,
  p_status text default 'new'
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hr uuid := auth.uid();
  v_src public.applications%rowtype;
  v_kind text;
  v_status text := coalesce(nullif(btrim(p_status), ''), 'new');
  v_email text;
  v_norm text;
  v_new_id uuid;
begin
  if v_hr is null then
    raise exception 'not authenticated';
  end if;

  -- The source application must belong to the caller.
  select * into v_src from public.applications where id = p_app_id and hr_id = v_hr;
  if not found then
    raise exception 'application not found or not owned';
  end if;

  -- The target must be an owned active job or an owned pool.
  select kind into v_kind from public.jobs where id = p_job_id and hr_id = v_hr;
  if v_kind is null then
    raise exception 'target job not found or not owned';
  end if;
  if v_kind not in ('active', 'pool') then
    raise exception 'target must be an active job or a pool';
  end if;

  -- Starting stage: never 'rejected'; pools always hold people at 'new'.
  if v_kind = 'pool' then
    v_status := 'new';
  elsif v_status not in ('new', 'shortlisted', 'ready', 'interviewed', 'offered', 'hired') then
    raise exception 'invalid starting stage';
  end if;

  -- Never duplicate the person inside the target (same email or phone),
  -- mirroring 028/029. Returned as a flag, not an exception, so bulk adds
  -- can skip gracefully.
  v_email := nullif(lower(btrim(coalesce(v_src.candidate_email, ''))), '');
  v_norm := nullif(regexp_replace(coalesce(v_src.candidate_phone, ''), '\D', '', 'g'), '');
  if exists (
    select 1 from public.applications a
    where a.job_id = p_job_id
      and (
        (v_email is not null and lower(coalesce(a.candidate_email, '')) = v_email)
        or (v_norm is not null and regexp_replace(coalesce(a.candidate_phone, ''), '\D', '', 'g') = v_norm)
        or (v_src.candidate_id is not null and a.candidate_id = v_src.candidate_id)
      )
  ) then
    return jsonb_build_object('added', false, 'reason', 'already_on_job');
  end if;

  -- The copy. Scores, keywords and verdicts are job-specific and deliberately
  -- NOT copied: score_source stays NULL ("Not scored") until the client's
  -- verdict pass writes the real number for THIS job.
  insert into public.applications (
    job_id, hr_id, candidate_id, source, status, is_visible_to_hr,
    cv_snapshot, cv_file_path, candidate_name, candidate_email, candidate_phone,
    visa_status, ats_score, score_source, applied_at, added_from
  ) values (
    p_job_id, v_hr, v_src.candidate_id, v_src.source, v_status, true,
    coalesce(v_src.cv_snapshot, '{}'::jsonb), v_src.cv_file_path,
    v_src.candidate_name, v_src.candidate_email, v_src.candidate_phone,
    v_src.visa_status, 0, null, now(), p_app_id
  )
  returning id into v_new_id;

  return jsonb_build_object('added', true, 'id', v_new_id, 'job_id', p_job_id, 'status', v_status);
end;
$$;

revoke all on function public.add_application_to_job(uuid, uuid, text) from public, anon;
grant execute on function public.add_application_to_job(uuid, uuid, text) to authenticated;

comment on function public.add_application_to_job(uuid, uuid, text) is
  'Copy an owned application onto an owned active job or pool (Add to job / Add to pool, Candidates tab). Keeps the source row (pool membership survives), dedupes by email/phone/candidate_id in the target, never copies scores or verdicts. SECURITY INVOKER; uses auth.uid() only.';

-- ── 3. Narrow undo: DELETE only rows created by the copy ──
drop policy if exists "HR undoes an added copy" on applications;
create policy "HR undoes an added copy" on applications
  for delete using (auth.uid() = hr_id and added_from is not null);
