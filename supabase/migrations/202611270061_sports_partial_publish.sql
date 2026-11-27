-- Additive migration. No registration/entry/athlete changes. Requires 060.
begin;
do $check$
declare sig text;
begin
 foreach sig in array array['public.sports_central_publish_event(uuid,uuid[])','public.sports_stage3_admin(uuid)','public.sports_award_is_published(uuid)','public.sports_basketball_order_ok(uuid,uuid,text,date,time without time zone,time without time zone)','public.sports_volleyball_order_ok(uuid,uuid,text,date,time without time zone)','public.sports_takraw_order_ok(uuid,uuid,text,date,time without time zone)','public.sports_volleyball_expected(uuid)','public.sports_takraw_expected(uuid)','public.sports_tt_expected(uuid)'] loop
  if to_regprocedure(sig) is null then raise exception 'Missing dependency: %',sig; end if;
 end loop;
end $check$;
create table if not exists public.sports_preliminary_match_notices (
 match_id uuid primary key references public.sports_football_matches(id) on delete cascade,
 match_version timestamptz not null,
 event_title text not null,
 approved_at timestamptz not null default now(),
 approved_by uuid not null
);
alter table public.sports_preliminary_match_notices enable row level security;
revoke all on public.sports_preliminary_match_notices from public,anon,authenticated;

-- Public sees only explicitly approved, unchanged, draft fixtures with a date.
create or replace function public.sports_public_preliminary_matches()
returns table(id uuid,sport_name text,match_no integer,stage text,scheduled_date date,start_time time,venue_name text,team1_name text,team2_name text)
language sql stable security definer set search_path='' as $$
 select m.id,e.sport_name::text,m.match_no::integer,m.stage::text,m.scheduled_date,m.start_time,m.venue_name::text,m.team1_name::text,m.team2_name::text
 from public.sports_preliminary_match_notices p
 join public.sports_football_matches m on m.id=p.match_id and m.updated_at=p.match_version
 join public.sports_events e on e.id=m.event_id and e.competition_id=m.competition_id and e.sport_name=p.event_title
 join public.sports_competitions c on c.id=m.competition_id
 where c.slug='phayao-secondary-group-sports-2569' and e.status in ('registration','scheduled','closed')
 and e.event_code ~ '^GS3-(FB|FS|BB|VB|ST|PT|TT)-' and m.status='draft'
 and not m.petanque_bye and m.scheduled_date is not null and m.start_time is null
 order by m.scheduled_date,e.sport_name,m.match_no;
$$;
revoke all on function public.sports_public_preliminary_matches() from public,anon,authenticated;
grant execute on function public.sports_public_preliminary_matches() to anon,authenticated;

create or replace function public.sports_central_partial_action(p_event uuid,p_rows jsonb,p_action text)
returns integer language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare
 ev public.sports_events%rowtype;
 m public.sports_football_matches%rowtype;
 comp uuid; code text; kind text; before_status text;
 ids uuid[]; item jsonb; expected int; actual int; n int;
 checked boolean; needs_review boolean; structural boolean; affected integer;
begin
 select id into strict comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
 if auth.uid() is null or not public.sports_stage3_admin(comp) then raise exception 'ไม่มีสิทธิ์จัดการโปรแกรม' using errcode='42501'; end if;
 if p_action is null or p_action not in ('review','publish','preview','unpreview') then raise exception 'คำสั่งไม่ถูกต้อง'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'ข้อมูลคู่ไม่ถูกต้อง'; end if;
 n:=jsonb_array_length(p_rows); if n not between 1 and 100 then raise exception 'เลือก 1–100 คู่ต่อครั้ง'; end if;
 select array_agg((x->>'id')::uuid) into ids from jsonb_array_elements(p_rows) x;
 if (select count(distinct x) from unnest(ids) x)<>n then raise exception 'พบคู่ซ้ำหรือรหัสไม่ครบ'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(comp::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select * into strict ev from public.sports_events where id=p_event and competition_id=comp for share;
 before_status:=ev.status::text; code:=ev.event_code; kind:=split_part(code,'-',2);
 if code is null or code !~ '^GS3-(FB|FS|BB|VB|ST|PT|TT)-' then raise exception 'ใช้หน้ากีฬาเฉพาะสำหรับรายการนี้'; end if;
 if before_status not in ('registration','scheduled','closed') or public.sports_award_is_published(p_event) then raise exception 'สถานะรายการไม่รองรับ หรือประกาศรางวัลแล้ว'; end if;
 if p_action='publish' and kind='PT' then raise exception 'เปตองต้องเผยแพร่ทั้งรุ่นผ่านระบบเดิมเพื่อจัดการสายและ BYE'; end if;
 if p_action='review' and kind not in ('BB','VB','ST','PT','TT') then raise exception 'กีฬานี้ไม่มีช่องยืนยันข้อสังเกต'; end if;
 -- Lock all fixtures of this event; shared competition advisory lock coordinates existing publishers.
 perform 1 from public.sports_football_matches where event_id=p_event and competition_id=comp order by id for update;
 if p_action='publish' then
   expected:=case kind
    when 'FB' then case code when 'GS3-FB-13M' then 9 when 'GS3-FB-15M' then 17 when 'GS3-FB-UM' then 16 when 'GS3-FB-UF' then 9 else 0 end
    when 'FS' then case code when 'GS3-FS-15M' then 17 when 'GS3-FS-UM' then 22 when 'GS3-FS-UF' then 12 else 0 end
    when 'BB' then case code when 'GS3-BB-15M' then 7 when 'GS3-BB-UM' then 25 when 'GS3-BB-15F' then 11 when 'GS3-BB-UF' then 11 else 0 end
    when 'VB' then public.sports_volleyball_expected(p_event)
    when 'ST' then public.sports_takraw_expected(p_event)
    when 'TT' then public.sports_tt_expected(p_event) else 0 end;
   select count(*) into actual from public.sports_football_matches where event_id=p_event and competition_id=comp and (kind not in ('BB','VB','ST') or status<>'cancelled');
   if expected is null or expected<=0 or actual<>expected then raise exception 'จำนวนคู่ไม่ตรงโปรแกรมเดิม (%/%)',actual,expected; end if;
 end if;
 -- Validate every chosen row before any write; version prevents approving stale edits.
 for item in select value from jsonb_array_elements(p_rows) loop
   select * into strict m from public.sports_football_matches where id=(item->>'id')::uuid and event_id=p_event and competition_id=comp;
   if m.status<>'draft' or m.updated_at is distinct from (item->>'version')::timestamptz then raise exception 'คู่ที่ % เปลี่ยนแปลงแล้ว กรุณารีเฟรช',m.match_no; end if;
   needs_review:=kind in ('BB','VB','ST','PT','TT');
   checked:=case kind when 'BB' then m.basketball_reviewed when 'VB' then m.volleyball_reviewed when 'ST' then m.takraw_reviewed when 'PT' then m.petanque_reviewed when 'TT' then m.tt_reviewed else true end;
   structural:=m.scheduled_date is not null and m.start_time is not null and btrim(coalesce(m.venue_name,''))<>'' and btrim(coalesce(m.team1_name,''))<>'' and btrim(coalesce(m.team2_name,''))<>'' and not m.petanque_bye
    and (kind<>'BB' or coalesce(m.basketball_end_time>m.start_time,false))
    and (kind<>'TT' or (coalesce(m.tt_end_time>m.start_time,false) and coalesce(m.tt_best_of in (3,5,7),false)));
   if p_action='preview' and (m.scheduled_date is null or m.start_time is not null or m.petanque_bye or btrim(m.team1_name)='' or btrim(m.team2_name)='') then raise exception 'คู่ที่ % ไม่ใช่คู่ที่ทราบวันแต่รอกำหนดเวลา',m.match_no; end if;
   if p_action in ('review','publish') and not structural then raise exception 'คู่ที่ % ข้อมูลวัน เวลา สนาม ทีม หรือเวลาเลิก/จำนวนเกมไม่ครบ',m.match_no; end if;
   if p_action='publish' then
     if needs_review and checked is distinct from true then raise exception 'คู่ที่ % ยังไม่ได้ยืนยันข้อสังเกต',m.match_no; end if;
     if exists(select 1 from public.sports_football_matches o join public.sports_events oe on oe.id=o.event_id
       where o.competition_id=comp and o.id<>m.id and o.status<>'cancelled' and o.scheduled_date=m.scheduled_date and btrim(o.venue_name)=btrim(m.venue_name) and split_part(oe.event_code,'-',2)=kind
       and (case kind when 'BB' then o.start_time<m.basketball_end_time and m.start_time<o.basketball_end_time when 'TT' then o.start_time<m.tt_end_time and m.start_time<o.tt_end_time else o.start_time=m.start_time end)) then raise exception 'คู่ที่ % วันเวลาและสนามซ้อนกัน',m.match_no; end if;
     if kind='BB' and not public.sports_basketball_order_ok(p_event,m.id,m.stage,m.scheduled_date,m.start_time,m.basketball_end_time) then raise exception 'คู่ที่ % ลำดับรอบไม่ถูกต้อง',m.match_no; end if;
     if kind='VB' and not public.sports_volleyball_order_ok(p_event,m.id,m.stage,m.scheduled_date,m.start_time) then raise exception 'คู่ที่ % ลำดับรอบไม่ถูกต้อง',m.match_no; end if;
     if kind='ST' and not public.sports_takraw_order_ok(p_event,m.id,m.stage,m.scheduled_date,m.start_time) then raise exception 'คู่ที่ % ลำดับรอบไม่ถูกต้อง',m.match_no; end if;
     -- Do not publish downstream rounds while an earlier round has unknown dates/times.
     if m.stage<>'group' and exists(select 1 from public.sports_football_matches o where o.event_id=p_event and o.status<>'cancelled' and array_position(array['group','quarter','semifinal','final'],o.stage)<array_position(array['group','quarter','semifinal','final'],m.stage) and (o.scheduled_date is null or o.start_time is null or (kind='BB' and o.basketball_end_time is null) or (kind='TT' and o.tt_end_time is null))) then raise exception 'คู่ที่ % ยังมีรอบก่อนหน้าที่ไม่กำหนดเวลา',m.match_no; end if;
     if kind='TT' and exists(select 1 from public.sports_football_matches o where o.event_id=p_event and o.status<>'cancelled' and ((split_part(m.source_participants,' | ',1)='ผู้ชนะคู่ที่ '||o.match_no or split_part(m.source_participants,' | ',2)='ผู้ชนะคู่ที่ '||o.match_no) and (o.scheduled_date is null or o.tt_end_time is null or o.scheduled_date+o.tt_end_time>m.scheduled_date+m.start_time) or (split_part(o.source_participants,' | ',1)='ผู้ชนะคู่ที่ '||m.match_no or split_part(o.source_participants,' | ',2)='ผู้ชนะคู่ที่ '||m.match_no) and o.scheduled_date+o.start_time<m.scheduled_date+m.tt_end_time)) then raise exception 'คู่ที่ % เวลาไม่สอดคล้องกับคู่ต้นทาง/ปลายทาง',m.match_no; end if;
   end if;
 end loop;
 if p_action='review' then
   update public.sports_football_matches set basketball_reviewed=case when kind='BB' then true else basketball_reviewed end,volleyball_reviewed=case when kind='VB' then true else volleyball_reviewed end,takraw_reviewed=case when kind='ST' then true else takraw_reviewed end,petanque_reviewed=case when kind='PT' then true else petanque_reviewed end,tt_reviewed=case when kind='TT' then true else tt_reviewed end where id=any(ids) and competition_id=comp and event_id=p_event and status='draft';
   get diagnostics affected = row_count; if affected<>n then raise exception 'ยืนยันไม่ครบ ระบบยกเลิก'; end if;
 elsif p_action='publish' then
   update public.sports_football_matches set status='published' where id=any(ids) and competition_id=comp and event_id=p_event and status='draft';
   get diagnostics affected = row_count; if affected<>n or (select count(*) from public.sports_football_matches where id=any(ids) and event_id=p_event and status='published')<>n then raise exception 'เผยแพร่ไม่ครบ ระบบยกเลิก'; end if;
   delete from public.sports_preliminary_match_notices where match_id=any(ids);
 elsif p_action='preview' then
   insert into public.sports_preliminary_match_notices(match_id,match_version,event_title,approved_by)
   select id,updated_at,ev.sport_name,auth.uid() from public.sports_football_matches where id=any(ids) and competition_id=comp and event_id=p_event
   on conflict(match_id) do update set match_version=excluded.match_version,event_title=excluded.event_title,approved_by=excluded.approved_by,approved_at=now();
 else
   delete from public.sports_preliminary_match_notices where match_id=any(ids);
 end if;
 if (select status::text from public.sports_events where id=p_event and competition_id=comp) is distinct from before_status then raise exception 'สถานะรับสมัครเปลี่ยนแปลง ยกเลิกทั้งหมด'; end if;
 return n;
end $$;
revoke all on function public.sports_central_partial_action(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.sports_central_partial_action(uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
select 'READY' as partial_publish_ready;
