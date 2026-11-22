-- v24 - Public-to-participating-schools status overview (NO document contents).
-- Reuse the existing private sports-school-submissions Storage bucket and the
-- existing school-info submit/review RPCs. Never grant file access by this RPC.
begin;

create or replace function public.sports_school_submission_progress(p_comp uuid)
returns table(
  school_id uuid,
  school_name text,
  submission_status text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบก่อนตรวจสถานะ' using errcode='42501';
  end if;
  if not exists (select 1 from public.sports_competitions c where c.id = p_comp) then
    raise exception 'ไม่พบการแข่งขัน';
  end if;
  -- A school account must be an active manager of a participating school.
  -- Competition reviewers may see the full status roster too.
  if not (
    coalesce(public.sports_submission_reviewer(p_comp), false)
    or exists (
      select 1
      from public.sports_user_roles r
      join public.sports_competition_schools c
        on c.competition_id = p_comp and c.school_id = r.school_id
      where r.user_id = auth.uid() and r.is_active
        and r.role = 'school_manager'
        and (r.competition_id = p_comp or r.competition_id is null)
    )
  ) then
    raise exception 'ไม่มีสิทธิ์ตรวจสถานะโรงเรียนในการแข่งขันนี้' using errcode='42501';
  end if;

  return query
  select s.id, s.name::text,
    coalesce(sub.status::text, 'not_submitted') as submission_status,
    sub.submitted_at
  from public.sports_competition_schools c
  join public.sports_schools s on s.id = c.school_id
  left join lateral (
    select ss.status, ss.submitted_at
    from public.sports_school_submissions ss
    where ss.competition_id = p_comp and ss.school_id = s.id
    order by ss.submitted_at desc nulls last
    limit 1
  ) sub on true
  where c.competition_id = p_comp
  order by s.name;
end;
$$;

revoke all on function public.sports_school_submission_progress(uuid) from public, anon;
grant execute on function public.sports_school_submission_progress(uuid) to authenticated;
commit;
