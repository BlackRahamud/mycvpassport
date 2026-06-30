-- =============================================================
-- 029_move_application_to_job.sql
--
-- Reassign a pooled (or any) application to an active job, preserving the
-- candidate's history (it is the same application row, only job_id changes,
-- so the Candidates page still rolls the person into one profile).
--
-- Why an RPC and not a plain client update: the applications UPDATE policy is
-- `using (auth.uid() = hr_id)` with no WITH CHECK, so a raw update could point
-- job_id at a job the recruiter does not own. This function validates that
--   - the application is owned by the caller,
--   - the target job is owned by the caller AND kind = 'active' (you move INTO
--     a real role, not another pool),
--   - the candidate is not already in the target job (same email or phone), so
--     a move never creates a duplicate.
--
-- Security: SECURITY INVOKER, so the update is still checked by RLS; the
-- function only ever uses auth.uid(); search_path is pinned.
-- =============================================================

create or replace function public.move_application_to_job(
  p_app_id uuid,
  p_job_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hr uuid := auth.uid();
  v_email text;
  v_phone text;
  v_norm text;
begin
  if v_hr is null then
    raise exception 'not authenticated';
  end if;

  -- The application must belong to the caller.
  select nullif(lower(btrim(coalesce(candidate_email, ''))), ''),
         btrim(coalesce(candidate_phone, ''))
    into v_email, v_phone
  from public.applications
  where id = p_app_id and hr_id = v_hr;
  if not found then
    raise exception 'application not found or not owned';
  end if;
  v_norm := nullif(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), '');

  -- The target must be an active job owned by the caller (never another pool).
  if not exists (
    select 1 from public.jobs
    where id = p_job_id and hr_id = v_hr and kind = 'active'
  ) then
    raise exception 'target job not found, not owned, or not an active job';
  end if;

  -- Never duplicate the person inside the target job.
  if exists (
    select 1 from public.applications a
    where a.job_id = p_job_id and a.id <> p_app_id
      and (
        (v_email is not null and lower(coalesce(a.candidate_email, '')) = v_email)
        or (v_norm is not null and regexp_replace(coalesce(a.candidate_phone, ''), '\D', '', 'g') = v_norm)
      )
  ) then
    raise exception 'this candidate is already in that job';
  end if;

  update public.applications
    set job_id = p_job_id, updated_at = now()
  where id = p_app_id and hr_id = v_hr;

  return jsonb_build_object('moved', true, 'job_id', p_job_id);
end;
$$;

revoke all on function public.move_application_to_job(uuid, uuid) from public, anon;
grant execute on function public.move_application_to_job(uuid, uuid) to authenticated;

comment on function public.move_application_to_job(uuid, uuid) is
  'Reassign an owned application to an owned active job (validates ownership, active target, and no duplicate). SECURITY INVOKER; uses auth.uid() only.';
