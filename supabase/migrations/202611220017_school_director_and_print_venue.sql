-- v21: school directors are maintained in the school register, not repeated in
-- each application. Existing registrations are preserved, and a snapshot is
-- stored on new entries / the FIRST authorized print of an older entry.
-- Run after v20 migration 0016. This migration never deletes/rewrites rosters.
begin;

alter table public.sports_schools
  add column if not exists director_name text;

alter table public.sports_entries
  add column if not exists director_name_snapshot text;

-- New registrations inherit the school director as at registration time.
create or replace function public.sports_entry_capture_director()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Always derive the value server-side; browser input must not forge it.
  select nullif(btrim(s.director_name), '') into new.director_name_snapshot
  from public.sports_schools s where s.id = new.school_id;
  return new;
end;
$$;
drop trigger if exists sports_entry_capture_director_on_insert on public.sports_entries;
create trigger sports_entry_capture_director_on_insert
  before insert on public.sports_entries
  for each row execute function public.sports_entry_capture_director();

-- School managers can maintain only their own school's director. Competition
-- admins can manage directors of participating schools. Do not grant any
-- broad sports_schools UPDATE privileges to browser users.
create or replace function public.sports_set_school_director(
  p_comp uuid, p_school uuid, p_director_name text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(p_director_name,'')), '');
  v_allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูลโรงเรียน' using errcode='42501';
  end if;
  if v_name is null or char_length(v_name) > 200 or v_name ~ '[\r\n\t]' then
    raise exception 'กรุณาระบุคำนำหน้า ชื่อ และนามสกุลผู้อำนวยการ (ไม่เกิน 200 ตัวอักษร)';
  end if;
  if not exists(select 1 from public.sports_competitions c where c.id=p_comp) then
    raise exception 'ไม่พบการแข่งขัน';
  end if;
  if not exists(select 1 from public.sports_competition_schools j where j.competition_id=p_comp and j.school_id=p_school) then
    raise exception 'โรงเรียนไม่ได้อยู่ในทะเบียนการแข่งขันนี้';
  end if;
  v_allowed := public.sports_stage3_admin(p_comp) or exists (
    select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
      and r.school_id=p_school and (r.competition_id=p_comp or r.competition_id is null)
  );
  if not v_allowed then
    raise exception 'ไม่มีสิทธิ์แก้ชื่อผู้อำนวยการของโรงเรียนนี้' using errcode='42501';
  end if;
  update public.sports_schools set director_name=v_name where id=p_school;
  if not found then raise exception 'ไม่พบโรงเรียน'; end if;
  insert into public.sports_audit_logs(actor_user_id,action,entity_table,details)
  values(auth.uid(),'UPDATE_SCHOOL_DIRECTOR','sports_schools',
    jsonb_build_object('competition_id',p_comp,'school_id',p_school));
  return v_name;
end;
$$;
revoke all on function public.sports_set_school_director(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sports_set_school_director(uuid,uuid,text) to authenticated;

-- Fetch a historical/printable school director securely. The first authorized
-- print of a legacy entry stores the current name once, so later changes to
-- the school register do not silently rewrite the previously printed form.
-- If a director has not been entered, returns NULL without freezing a blank.
create or replace function public.sports_entry_director_for_print(p_entry uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_entry public.sports_entries%rowtype;
  v_director text;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501';
  end if;
  select * into v_entry from public.sports_entries where id=p_entry for update;
  if not found then raise exception 'ไม่พบใบสมัคร'; end if;
  if not (public.sports_stage3_admin(v_entry.competition_id) or exists (
    select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
      and r.school_id=v_entry.school_id
      and (r.competition_id=v_entry.competition_id or r.competition_id is null)
  )) then raise exception 'ไม่มีสิทธิ์ดูใบสมัครของโรงเรียนนี้' using errcode='42501'; end if;
  if v_entry.director_name_snapshot is not null and btrim(v_entry.director_name_snapshot) <> '' then
    return v_entry.director_name_snapshot;
  end if;
  select nullif(btrim(s.director_name),'') into v_director
  from public.sports_schools s where s.id=v_entry.school_id;
  if v_director is not null then
    update public.sports_entries set director_name_snapshot=v_director where id=p_entry;
  end if;
  return v_director;
end;
$$;
revoke all on function public.sports_entry_director_for_print(uuid) from public,anon,authenticated;
grant execute on function public.sports_entry_director_for_print(uuid) to authenticated;

-- Seed the two RoV event venues only if currently empty. Admin-entered venues
-- are preserved, and the print component still uses sports_events.venue_name.
update public.sports_events e
set venue_name = 'หอประชุม โรงเรียนเชียงคำวิทยาคม'
where e.event_code in ('GS3-ES-SM','GS3-ES-SF')
  and e.competition_id in (
    select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569'
  ) and nullif(btrim(e.venue_name),'') is null;

commit;
