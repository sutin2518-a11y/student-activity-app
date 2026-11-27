-- New guarded endpoint only. Installation does not modify existing rows.
begin;
do $$
declare sig text;
begin
  foreach sig in array array[
    'public.sports_stage3_admin(uuid)', 'public.sports_award_is_published(uuid)',
    'public.sports_stage3_publish(uuid,uuid[])', 'public.sports_futsal_publish(uuid)',
    'public.sports_basketball_publish(uuid)', 'public.sports_volleyball_publish(uuid)',
    'public.sports_takraw_publish(uuid)', 'public.sports_petanque_publish(uuid)', 'public.sports_tt_publish(uuid)'
  ] loop
    if to_regprocedure(sig) is null then raise exception 'Missing dependency: %',sig; end if;
  end loop;
end $$;
create or replace function public.sports_central_publish_event(p_event uuid, p_draft_ids uuid[])
returns integer language plpgsql security definer set search_path = '' set lock_timeout = '3s' as $$
declare
  ev public.sports_events%rowtype;
  comp uuid;
  code text;
  original_status text;
  actual_ids uuid[];
  remaining integer;
  n integer;
  expected integer;
begin
  select id into comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
  if comp is null or auth.uid() is null or not public.sports_stage3_admin(comp) then
    raise exception 'ไม่มีสิทธิ์เผยแพร่โปรแกรม' using errcode='42501';
  end if;
  if p_draft_ids is null or cardinality(p_draft_ids) not between 1 and 500 then raise exception 'ต้องเลือกโปรแกรมฉบับร่าง 1–500 รายการ'; end if;
  -- Same advisory lock order as the existing specialized publishers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(comp::text),252541);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  select * into strict ev from public.sports_events where id=p_event and competition_id=comp for share;
  original_status:=ev.status::text;
  code:=ev.event_code;
  if code like 'GS3-BX-%' then raise exception 'มวยสากลต้องจัดการจากหน้ามวยโดยเฉพาะ'; end if;
  if original_status not in ('registration','scheduled','closed') then raise exception 'สถานะรายการไม่รองรับการเผยแพร่รวม กรุณาตรวจจากหน้ากีฬา (ระบบไม่เปลี่ยนสถานะรับสมัคร)'; end if;
  if public.sports_award_is_published(p_event) then raise exception 'รายการนี้ประกาศรางวัลแล้ว'; end if;
  if code like 'GS3-AT-%' then
    perform 1 from public.sports_schedule_sessions where competition_id=comp and event_id=p_event and status='draft' for update;
    select array_agg(id order by id) into actual_ids from public.sports_schedule_sessions where competition_id=comp and event_id=p_event and status='draft';
  elsif code in ('GS3-ES-SM','GS3-ES-SF') then
    perform 1 from public.sports_esports_matches where competition_id=comp and event_id=p_event for update;
    select array_agg(id order by id) into actual_ids from public.sports_esports_matches where competition_id=comp and event_id=p_event and stage='group' and match_status='draft';
  elsif code ~ '^GS3-(FB|FS|BB|VB|ST|PT|TT)-' then
    perform 1 from public.sports_football_matches where competition_id=comp and event_id=p_event for update;
    select array_agg(id order by id) into actual_ids from public.sports_football_matches where competition_id=comp and event_id=p_event and status='draft';
  else raise exception 'ไม่รองรับรหัสรายการนี้';
  end if;
  if actual_ids is null or actual_ids is distinct from (select array_agg(u.id order by u.id) from unnest(p_draft_ids) as u(id)) then
    raise exception 'รายการฉบับร่างเปลี่ยนไป กรุณารีเฟรชและตรวจสอบใหม่';
  end if;
  n:=cardinality(actual_ids);
  if code like 'GS3-AT-%' then
    -- Existing stage3 publisher changes draft event statuses only; this endpoint rejects draft events above.
    perform public.sports_stage3_publish(comp,actual_ids);
    select n-count(*) into remaining from public.sports_schedule_sessions where id=any(actual_ids) and competition_id=comp and event_id=p_event and status='published';
  elsif code in ('GS3-ES-SM','GS3-ES-SF') then
    -- Same round-robin validation as the existing RoV page, excluding knockout drafts.
    select coalesce(sum(t.cnt*(t.cnt-1)/2),0)::integer into expected from (
      select count(gt.id) as cnt from public.sports_esports_groups g
      left join public.sports_esports_group_teams gt on gt.group_id=g.id and gt.event_id=g.event_id and gt.competition_id=g.competition_id
      where g.event_id=p_event and g.competition_id=comp group by g.id
    ) t;
    if expected=0 or (select count(*) from public.sports_esports_matches where competition_id=comp and event_id=p_event and stage='group')<>expected then raise exception 'จำนวนคู่รอบแบ่งกลุ่ม RoV ไม่ครบ'; end if;
    if exists(select 1 from public.sports_esports_matches m where m.competition_id=comp and m.event_id=p_event and m.stage='group' and (m.group_id is null or m.team1_id is null or m.team2_id is null or m.team1_id=m.team2_id)) then raise exception 'ข้อมูลกลุ่มหรือทีม RoV ไม่ครบ'; end if;
    if exists(select 1 from public.sports_esports_matches m where m.competition_id=comp and m.event_id=p_event and m.stage='group' group by m.group_id,least(m.team1_id,m.team2_id),greatest(m.team1_id,m.team2_id) having count(*)>1) then raise exception 'พบคู่ RoV ซ้ำ'; end if;
    if exists(select 1 from public.sports_esports_matches m where m.id=any(actual_ids) and (m.scheduled_date is null or m.start_time is null or coalesce(btrim(m.venue_name),'')='')) then raise exception 'กรุณาบันทึกวัน เวลา และสนาม RoV ให้ครบจากหน้าเฉพาะกีฬา'; end if;
    update public.sports_esports_matches set match_status='scheduled' where competition_id=comp and event_id=p_event and stage='group' and match_status='draft' and id=any(actual_ids);
    select n-count(*) into remaining from public.sports_esports_matches where id=any(actual_ids) and competition_id=comp and event_id=p_event and match_status='scheduled';
  else
    -- Football and futsal use the same completeness/court check as their dashboards.
    if code like 'GS3-FB-%' or code like 'GS3-FS-%' then
      expected:=case code when 'GS3-FB-13M' then 9 when 'GS3-FB-15M' then 17 when 'GS3-FB-UM' then 16 when 'GS3-FB-UF' then 9 when 'GS3-FS-15M' then 17 when 'GS3-FS-UM' then 22 when 'GS3-FS-UF' then 12 else 0 end;
      if expected=0 or (select count(*) from public.sports_football_matches where event_id=p_event and competition_id=comp)<>expected then raise exception 'จำนวนคู่ไม่ตรงโปรแกรมเดิม'; end if;
      if exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.competition_id=comp and (m.scheduled_date is null or m.start_time is null or coalesce(btrim(m.venue_name),'')='' or coalesce(btrim(m.team1_name),'')='' or coalesce(btrim(m.team2_name),'')='')) then raise exception 'วัน เวลา สนาม หรือคู่แข่งขันไม่ครบ'; end if;
      if exists(select 1 from public.sports_football_matches m join public.sports_football_matches other on other.id<>m.id and other.competition_id=m.competition_id and other.scheduled_date=m.scheduled_date and other.start_time=m.start_time and other.venue_name=m.venue_name and other.status<>'cancelled' join public.sports_events oe on oe.id=other.event_id where m.event_id=p_event and m.competition_id=comp and m.status<>'cancelled' and left(oe.event_code,7)=left(code,7)) then raise exception 'พบวัน เวลา และสนามซ้อนกัน'; end if;
    end if;
    if code like 'GS3-FB-%' then
      update public.sports_football_matches set status='published' where competition_id=comp and event_id=p_event and status='draft' and id=any(actual_ids);
    elsif code like 'GS3-FS-%' then perform public.sports_futsal_publish(p_event);
    elsif code like 'GS3-BB-%' then
      if exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.competition_id=comp and m.status<>'cancelled' and (coalesce(btrim(m.venue_name),'')='' or coalesce(btrim(m.team1_name),'')='' or coalesce(btrim(m.team2_name),'')='')) then raise exception 'สนามหรือคู่แข่งขันบาสเกตบอลไม่ครบ'; end if;
      perform public.sports_basketball_publish(p_event);
    elsif code like 'GS3-VB-%' then perform public.sports_volleyball_publish(p_event);
    elsif code like 'GS3-ST-%' then perform public.sports_takraw_publish(p_event);
    elsif code like 'GS3-PT-%' then perform public.sports_petanque_publish(p_event);
    elsif code like 'GS3-TT-%' then perform public.sports_tt_publish(p_event);
    else raise exception 'ไม่รองรับรหัสรายการนี้'; end if;
    select n-count(*) into remaining from public.sports_football_matches m where m.id=any(actual_ids) and m.competition_id=comp and m.event_id=p_event and (m.status='published' or (code like 'GS3-PT-%' and m.petanque_bye and m.status='cancelled'));
  end if;
  if remaining<>0 then raise exception 'เผยแพร่ไม่ครบ ระบบยกเลิกการเปลี่ยนแปลงรุ่นนี้'; end if;
  if (select status::text from public.sports_events where id=p_event and competition_id=comp) is distinct from original_status then
    raise exception 'ตรวจพบการเปลี่ยนสถานะรายการ ระบบยกเลิกการเผยแพร่รุ่นนี้';
  end if;
  return n;
end;
$$;
revoke all on function public.sports_central_publish_event(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.sports_central_publish_event(uuid,uuid[]) to authenticated;
notify pgrst, 'reload schema';
commit;
select 'READY' as central_publish_ready;
