-- v33.24 | Official futsal program, 51 fixtures; no destructive data changes.
-- Requires migrations 026, 036, 038. Keeps existing football tables as shared goal-sport storage.
begin;
create temporary table futsal_school_map(alias text primary key, label text not null, canonical text) on commit drop;
insert into futsal_school_map(alias,label) values
('FK','ฟากกว๊านวิทยาคม'),
('PI','พินิตประสาธน์'),
('UP','สาธิตมหาวิทยาลัยพะเยา'),
('RP','ราชประชานุเคราะห์ 24'),
('JU','จุนวิทยาคม'),
('PY','พะเยาพิทยาคม'),
('CK','เชียงคำวิทยาคม'),
('CH','เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'),
('PS','ภูซางวิทยาคม'),
('FG','ฝายกวางวิทยาคม'),
('KK','ขุนควรวิทยาคม'),
('DJ','ดงเจนวิทยาคม'),
('TP','ถ้ำปินวิทยาคม'),
('DK','ดอกคำใต้วิทยาคม'),
('PL','พญาลอวิทยาคม'),
('MJ','แม่ใจวิทยาคม');
-- Match the school's canonical name to ensure v33.21 award suggestions resolve registrations.
update futsal_school_map a set canonical=(select case when count(*)=1 then min(s.name) end from public.sports_schools s
 where regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(a.label,'[[:space:]]+','','g')
 or (a.alias='CH' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'เฉลิมพระเกียรติ%')
 or (a.alias='UP' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'สาธิต%พะเยา%'));
do $$ begin
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF'))<>3 then raise exception 'ไม่พบรายการฟุตซอลครบ 3 รุ่น'; end if;
 if exists(select 1 from futsal_school_map where canonical is null) then raise exception 'จับคู่ชื่อโรงเรียนไม่ได้หรือซ้ำ: %',(select string_agg(label,', ') from futsal_school_map where canonical is null); end if;
end $$;
update public.sports_events e set max_athletes_per_entry=14,points_win=3,points_draw=0,points_loss=0,updated_at=now()
where e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569') and e.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF');
with seed(event_code,group_code,seed_order,alias) as (values
('GS3-FS-15M','A',1,'FK'),
('GS3-FS-15M','A',2,'PI'),
('GS3-FS-15M','A',3,'UP'),
('GS3-FS-15M','B',1,'RP'),
('GS3-FS-15M','B',2,'JU'),
('GS3-FS-15M','B',3,'PY'),
('GS3-FS-15M','C',1,'CK'),
('GS3-FS-15M','C',2,'CH'),
('GS3-FS-15M','D',1,'PS'),
('GS3-FS-15M','D',2,'FG'),
('GS3-FS-15M','D',3,'KK'),
('GS3-FS-UM','A',1,'FG'),
('GS3-FS-UM','A',2,'RP'),
('GS3-FS-UM','A',3,'CK'),
('GS3-FS-UM','A',4,'UP'),
('GS3-FS-UM','B',1,'PY'),
('GS3-FS-UM','B',2,'DJ'),
('GS3-FS-UM','B',3,'CH'),
('GS3-FS-UM','C',1,'PI'),
('GS3-FS-UM','C',2,'TP'),
('GS3-FS-UM','C',3,'JU'),
('GS3-FS-UM','D',1,'DK'),
('GS3-FS-UM','D',2,'PS'),
('GS3-FS-UM','D',3,'PL'),
('GS3-FS-UF','A',1,'PY'),
('GS3-FS-UF','A',2,'MJ'),
('GS3-FS-UF','A',3,'KK'),
('GS3-FS-UF','B',1,'UP'),
('GS3-FS-UF','B',2,'CH'),
('GS3-FS-UF','B',3,'PS'),
('GS3-FS-UF','B',4,'TP')
) insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,s.group_code,s.seed_order,n.canonical from seed s join futsal_school_map n on n.alias=s.alias join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict do nothing;
with seed(event_code,match_no,scheduled_date,start_time,stage,group_code,a,b) as (values
('GS3-FS-UM',1,'2026-11-30','08:30','group','A','FG','CK'),
('GS3-FS-UM',2,'2026-11-30','09:30','group','D','PS','PL'),
('GS3-FS-UM',3,'2026-11-30','10:30','group','B','DJ','CH'),
('GS3-FS-UM',4,'2026-11-30','11:30','group','C','TP','JU'),
('GS3-FS-15M',5,'2026-11-30','13:00','group','A','FK','PI'),
('GS3-FS-15M',6,'2026-11-30','14:00','group','B','JU','PY'),
('GS3-FS-15M',7,'2026-11-30','15:00','group','D','PS','FG'),
('GS3-FS-UM',8,'2026-12-02','08:30','group','A','CK','RP'),
('GS3-FS-UM',9,'2026-12-02','09:30','group','D','PL','DK'),
('GS3-FS-UM',10,'2026-12-02','10:30','group','A','UP','FG'),
('GS3-FS-15M',11,'2026-12-02','11:30','group','A','UP','PI'),
('GS3-FS-15M',12,'2026-12-02','13:00','group','C','CH','CK'),
('GS3-FS-UF',13,'2026-12-02','14:00','group','A','MJ','KK'),
('GS3-FS-UF',14,'2026-12-02','15:00','group','B','CH','PS'),
('GS3-FS-UM',15,'2026-12-03','08:30','group','A','RP','FG'),
('GS3-FS-UM',16,'2026-12-03','09:30','group','B','PY','CH'),
('GS3-FS-UM',17,'2026-12-03','10:30','group','C','TP','PI'),
('GS3-FS-UM',18,'2026-12-03','11:30','group','A','CK','UP'),
('GS3-FS-UM',19,'2026-12-03','13:00','group','D','DK','PS'),
('GS3-FS-UF',20,'2026-12-03','14:00','group','B','CH','UP'),
('GS3-FS-UF',21,'2026-12-03','15:00','group','B','PS','TP'),
('GS3-FS-15M',22,'2026-12-04','08:30','group','D','FG','KK'),
('GS3-FS-15M',23,'2026-12-04','09:30','group','B','PY','RP'),
('GS3-FS-15M',24,'2026-12-04','10:30','group','A','UP','FK'),
('GS3-FS-UF',25,'2026-12-04','11:30','group','A','PY','MJ'),
('GS3-FS-UF',26,'2026-12-04','13:00','group','B','PS','UP'),
('GS3-FS-UF',27,'2026-12-04','14:00','group','B','TP','CH'),
('GS3-FS-UM',28,'2026-12-05','08:30','group','B','DJ','PY'),
('GS3-FS-UM',29,'2026-12-05','09:30','group','C','JU','PI'),
('GS3-FS-UM',30,'2026-12-05','10:30','group','A','RP','UP'),
('GS3-FS-15M',31,'2026-12-05','11:30','group','B','RP','JU'),
('GS3-FS-15M',32,'2026-12-05','13:00','group','D','KK','PS'),
('GS3-FS-UF',33,'2026-12-05','14:00','group','A','PY','KK'),
('GS3-FS-UF',34,'2026-12-05','15:00','group','B','UP','TP'),
('GS3-FS-UM',35,'2026-12-06','08:30','quarter',null,'A1','B2'),
('GS3-FS-UM',36,'2026-12-06','09:30','quarter',null,'B1','A2'),
('GS3-FS-UM',37,'2026-12-06','10:30','quarter',null,'C1','D2'),
('GS3-FS-UM',38,'2026-12-06','11:30','quarter',null,'D1','C2'),
('GS3-FS-15M',39,'2026-12-06','12:30','quarter',null,'A1','B2'),
('GS3-FS-15M',40,'2026-12-06','13:30','quarter',null,'B1','A2'),
('GS3-FS-15M',41,'2026-12-06','14:30','quarter',null,'C1','D2'),
('GS3-FS-15M',42,'2026-12-06','15:30','quarter',null,'D1','C2'),
('GS3-FS-UM',43,'2026-12-07','08:30','semifinal',null,'W35','W37'),
('GS3-FS-UM',44,'2026-12-07','09:30','semifinal',null,'W36','W38'),
('GS3-FS-15M',45,'2026-12-07','10:30','semifinal',null,'W39','W41'),
('GS3-FS-15M',46,'2026-12-07','11:30','semifinal',null,'W40','W42'),
('GS3-FS-UF',47,'2026-12-07','13:00','semifinal',null,'A1','B2'),
('GS3-FS-UF',48,'2026-12-07','14:00','semifinal',null,'B1','A2'),
('GS3-FS-UM',49,'2026-12-07','15:00','final',null,'W43','W44'),
('GS3-FS-UF',50,'2026-12-08','09:00','final',null,'W47','W48'),
('GS3-FS-15M',51,'2026-12-08','10:00','final',null,'W45','W46')
), resolved as (select s.*,coalesce(a.canonical,case when s.a like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.a from 2) else 'ที่ '||right(s.a,1)||' สาย '||left(s.a,1) end) as team_a,
 coalesce(b.canonical,case when s.b like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.b from 2) else 'ที่ '||right(s.b,1)||' สาย '||left(s.b,1) end) as team_b
 from seed s left join futsal_school_map a on a.alias=s.a left join futsal_school_map b on b.alias=s.b)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants)
select e.competition_id,e.id,s.match_no,s.scheduled_date::date,s.start_time::time,s.stage,s.group_code,s.team_a,s.team_b,'สนามฟุตซอล โรงเรียนฝายกวางวิทยาคม',s.team_a||' | '||s.team_b
from resolved s join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,match_no) do nothing;
-- Futsal-only gate: general football update policies must not bypass the score RPC.
create or replace function public.sports_is_futsal(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and e.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF') and c.slug='phayao-secondary-group-sports-2569');
$$;
revoke all on function public.sports_is_futsal(uuid) from public,anon;
grant execute on function public.sports_is_futsal(uuid) to authenticated;
drop policy if exists "futsal matches RPC only" on public.sports_football_matches;
create policy "futsal matches RPC only" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_futsal(event_id)) with check(not public.sports_is_futsal(event_id));
create or replace function public.sports_futsal_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_futsal(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_futsal_can_score(uuid) from public,anon;
grant execute on function public.sports_futsal_can_score(uuid) to authenticated;
create or replace function public.sports_futsal_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; expected int;
begin
 select * into strict e from public.sports_events where id=p_event;
 if not public.sports_is_futsal(p_event) or auth.uid() is null or not public.sports_stage3_admin(e.competition_id) then raise exception 'ไม่มีสิทธิ์เผยแพร่' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or e.status='draft' then raise exception 'ยังไม่เปิดแสดงรายการ หรือประกาศอันดับแล้ว'; end if;
 expected:=case e.event_code when 'GS3-FS-15M' then 17 when 'GS3-FS-UM' then 22 else 12 end;
 if (select count(*) from public.sports_football_matches where event_id=p_event and scheduled_date is not null and start_time is not null and venue_name<>'' and team1_name<>'' and team2_name<>'')<>expected then raise exception 'โปรแกรมไม่ครบ'; end if;
 update public.sports_football_matches set status='published' where event_id=p_event and status='draft';
end $$;
revoke all on function public.sports_futsal_publish(uuid) from public,anon;
grant execute on function public.sports_futsal_publish(uuid) to authenticated;
-- Check knockout slots against actual teams and completed source matches. Ties are left to officials.
create or replace function public.sports_futsal_slot_ok(p_event uuid,p_source text,p_team text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare src public.sports_football_matches%rowtype; grp text; ranking int; team_points int; ahead int; tied int;
begin
 if p_source ~ '^ผู้ชนะคู่ที่ [0-9]+$' then
  select * into src from public.sports_football_matches where event_id=p_event and match_no=substring(p_source from '[0-9]+$')::int;
  return coalesce(src.status='completed' and p_team=(case when src.score1>src.score2 or (src.score1=src.score2 and src.penalty1>src.penalty2) then src.team1_name else src.team2_name end),false);
 elsif p_source ~ '^ที่ [12] สาย [A-D]$' then
  grp:=right(p_source,1);ranking:=substring(p_source from '[12]')::int;
  if exists(select 1 from public.sports_football_matches where event_id=p_event and stage='group' and status<>'completed') then return false; end if;
  if not exists(select 1 from public.sports_football_group_teams where event_id=p_event and group_code=grp and school_name=p_team) then return false; end if;
  with pts as (select t.school_name,3*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.group_code=grp and m.status='completed' and t.school_name=(case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team1_name else m.team2_name end)) as points from public.sports_football_group_teams t where t.event_id=p_event and t.group_code=grp)
  select (select points from pts where school_name=p_team),count(*) filter(where points>(select points from pts where school_name=p_team)),count(*) filter(where points=(select points from pts where school_name=p_team)) into team_points,ahead,tied from pts;
  return coalesce(ranking>ahead and ranking<=ahead+tied,false);
 else return p_team=p_source; end if;
end $$;
revoke all on function public.sports_futsal_slot_ok(uuid,text,text) from public,anon,authenticated;
create or replace function public.sports_futsal_save_match(p_match uuid,p_expected timestamptz,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; v_event uuid; a text; b text; st text; admin boolean; s1 int; s2 int; p1 int; p2 int; changed boolean;
begin
 select event_id into strict v_event from public.sports_football_matches where id=p_match;
 if not public.sports_futsal_can_score(v_event) then raise exception 'ไม่มีสิทธิ์บันทึกผลฟุตซอลรายการนี้' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event::text),94723);
 select * into strict m from public.sports_football_matches where id=p_match for update;
 if m.event_id<>v_event or m.updated_at is distinct from p_expected then raise exception 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่'; end if;
 if public.sports_award_is_published(v_event) then raise exception 'ประกาศอันดับแล้ว ต้องให้ผู้ดูแลตรวจสอบแก้ไขผลรางวัลก่อน'; end if;
 admin:=public.sports_stage3_admin(m.competition_id);
 a:=btrim(coalesce(p_data->>'team1_name',''));b:=btrim(coalesce(p_data->>'team2_name',''));st:=p_data->>'status';
 if st is null or st not in ('draft','published','completed','cancelled') then raise exception 'สถานะไม่ถูกต้อง'; end if;
 if not admin and (m.status not in ('published','completed') or st not in ('published','completed')) then raise exception 'กรรมการบันทึกได้เฉพาะคู่ที่เผยแพร่แล้ว'; end if;
 if not admin and ((p_data->>'scheduled_date')::date is distinct from m.scheduled_date or (p_data->>'start_time')::time is distinct from m.start_time or p_data->>'venue_name' is distinct from m.venue_name) then raise exception 'กรรมการไม่มีสิทธิ์เปลี่ยนโปรแกรม'; end if;
 if m.stage='group' and (a<>m.team1_name or b<>m.team2_name) then raise exception 'ไม่อนุญาตเปลี่ยนทีมในรอบแบ่งสาย'; end if;
 if a='' or b='' or a=b then raise exception 'คู่แข่งขันไม่ถูกต้อง'; end if;
 if st='completed' or a<>m.team1_name or b<>m.team2_name then
  if not (public.sports_futsal_slot_ok(v_event,split_part(m.source_participants,' | ',1),a) and public.sports_futsal_slot_ok(v_event,split_part(m.source_participants,' | ',2),b)) then raise exception 'ชื่อทีมไม่ตรงตามสายหรือผลรอบก่อนหน้า'; end if;
  if m.stage<>'group' and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage=m.stage and o.id<>m.id and (a in(o.team1_name,o.team2_name) or b in(o.team1_name,o.team2_name))) then raise exception 'มีทีมซ้ำในรอบเดียวกัน'; end if;
 end if;
 if st='completed' then
  s1:=(p_data->>'score1')::int;s2:=(p_data->>'score2')::int;p1:=(p_data->>'penalty1')::int;p2:=(p_data->>'penalty2')::int;
  if s1 is null or s2 is null or s1 not between 0 and 99 or s2 not between 0 and 99 then raise exception 'กรอกประตูทั้งสองทีม'; end if;
  if s1=s2 and (p1 is null or p2 is null or p1=p2 or p1 not between 0 and 99 or p2 not between 0 and 99) then raise exception 'ผลเสมอต้องมีผู้ชนะจากจุดโทษ'; end if;
  if s1<>s2 then p1:=null;p2:=null; end if;
 end if;
 changed:=a is distinct from m.team1_name or b is distinct from m.team2_name or st is distinct from m.status or s1 is distinct from m.score1 or s2 is distinct from m.score2 or p1 is distinct from m.penalty1 or p2 is distinct from m.penalty2;
 if changed and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage<>'group' and o.id<>m.id and (case o.stage when 'quarter' then 1 when 'semifinal' then 2 else 3 end)>(case m.stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end) and (o.status='completed' or o.team1_name is distinct from split_part(o.source_participants,' | ',1) or o.team2_name is distinct from split_part(o.source_participants,' | ',2))) then raise exception 'รอบถัดไปยืนยันทีมแล้ว ไม่สามารถแก้ผลย้อนหลังโดยตรง'; end if;
 if not admin and m.status='completed' and changed then raise exception 'ผลบันทึกแล้ว ติดต่อผู้ดูแลหากต้องแก้ไข'; end if;
 update public.sports_football_matches set team1_name=a,team2_name=b,status=st,score1=s1,score2=s2,penalty1=p1,penalty2=p2,
 scheduled_date=case when admin then (p_data->>'scheduled_date')::date else m.scheduled_date end,start_time=case when admin then (p_data->>'start_time')::time else m.start_time end,venue_name=case when admin then coalesce(p_data->>'venue_name',m.venue_name) else m.venue_name end,notes=left(coalesce(p_data->>'notes',''),500)
 where id=p_match;
end $$;
revoke all on function public.sports_futsal_save_match(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.sports_futsal_save_match(uuid,timestamptz,jsonb) to authenticated;
create or replace function public.sports_futsal_register(
 p_event uuid,p_school uuid,p_players jsonb,p_coaches jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_id uuid;
 v_admin boolean;
 v_count int;
 v_name text;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 if v_event.event_code not in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF') then raise exception 'ไม่ใช่รายการฟุตซอล'; end if;
 if not public.sports_is_futsal(p_event) then raise exception 'ไม่ใช่รายการฟุตซอล 2569'; end if;
 v_admin := public.sports_stage3_admin(v_event.competition_id);
 if not v_admin and not exists(select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.role='school_manager' and r.is_active and r.school_id=p_school
    and (r.competition_id is null or r.competition_id=v_event.competition_id))
  then raise exception 'ไม่มีสิทธิ์จัดการทีมโรงเรียนนี้' using errcode='42501'; end if;
 if v_event.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 if p_players is null or jsonb_typeof(p_players)<>'array' then raise exception 'รูปแบบข้อมูลนักกีฬาไม่ถูกต้อง'; end if;
 v_count := jsonb_array_length(p_players);
 if v_count<10 or v_count>14 then raise exception 'ลงทะเบียนนักกีฬาได้ 10–14 คนต่อทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'full_name'),'') is null
    or coalesce(a->>'grade_level','') !~ '^ม\.[1-6]$' or nullif(a->>'birth_date','') is null or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')
  then raise exception 'กรุณากรอกชื่อ วันเกิด และเบอร์เสื้อทุกคน'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number') having count(*)>1)
  then raise exception 'มีหมายเลขเสื้อซ้ำในทีม'; end if;
 if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1 then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
    regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมให้ครบ'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where (a->>'birth_date')::date>current_date or (a->>'birth_date')::date<'1900-01-01' or (v_event.event_code='GS3-FS-15M' and (a->>'birth_date')::date<'2011-01-01')) then raise exception 'วันเกิดไม่ถูกต้อง หรือไม่ผ่านเกณฑ์รุ่น 15 ปี'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'รายชื่อนักกีฬาซ้ำในทีม'; end if;
 -- Serialize same school registrations across male age categories.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event.competition_id::text),pg_catalog.hashtext(p_school::text));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศอันดับแล้ว ไม่อนุญาตแก้ทะเบียน'; end if;
 if v_event.event_code in ('GS3-FS-15M','GS3-FS-UM') and exists(select 1 from public.sports_entries en join public.sports_events ev on ev.id=en.event_id join public.sports_athletes a on a.entry_id=en.id cross join jsonb_array_elements(p_players) p where en.competition_id=v_event.competition_id and en.school_id=p_school and en.event_id<>p_event and en.status<>'withdrawn' and ev.event_code in ('GS3-FS-15M','GS3-FS-UM') and ((nullif(btrim(p->>'student_code'),'') is not null and btrim(p->>'student_code')=a.student_code) or regexp_replace(btrim(p->>'full_name'),'[[:space:]]+','','g')=regexp_replace(btrim(a.full_name),'[[:space:]]+','','g'))) then raise exception 'นักกีฬาชายลงทะเบียนซ้ำอีกหนึ่งรุ่น'; end if;
 -- Avoid duplicate registrations from concurrent browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),pg_catalog.hashtext(p_school::text));
 if (select count(*) from public.sports_entries e where e.event_id=p_event and e.school_id=p_school and e.status<>'withdrawn')>1 then raise exception 'มีใบสมัครเดิมซ้ำ กรุณาให้ผู้ดูแลตรวจสอบก่อนแก้ไข'; end if;
 select e.id into v_id from public.sports_entries e where e.event_id=p_event and e.school_id=p_school
  and e.status<>'withdrawn' order by e.created_at limit 1 for update;
 select name into v_name from public.sports_schools where id=p_school;
 if v_name is null or not exists(select 1 from public.sports_football_group_teams t where t.event_id=p_event and t.school_name=v_name) then raise exception 'ไม่พบโรงเรียนในสายการแข่งขัน'; end if;
 if v_id is null then
  v_id := public.sports_register_roster(null::uuid,p_event,p_school,v_name,p_coaches->0->>'name',
    p_coaches->1->>'name',p_players,p_coaches);
 else
  update public.sports_entries set entry_name=v_name,coach_name=p_coaches->0->>'name',
    assistant_coach=nullif(p_coaches->1->>'name',''),status='approved',updated_at=now()
    where id=v_id;
  delete from public.sports_athletes where entry_id=v_id;
  insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position)
    select v_id,nullif(btrim(a->>'student_code'),''),btrim(a->>'full_name'),null,null,pos
      from jsonb_array_elements(p_players) with ordinality x(a,pos);
  insert into public.sports_roster_staff(entry_id,coaches) values(v_id,p_coaches)
    on conflict(entry_id) do update set coaches=excluded.coaches;
 end if;
 update public.sports_athletes a set grade_level=p.value->>'grade_level' from jsonb_array_elements(p_players) with ordinality p(value,pos) where a.entry_id=v_id and a.roster_position=p.pos;
 insert into public.sports_roster_staff(entry_id,coaches) values(v_id,p_coaches) on conflict(entry_id) do update set coaches=excluded.coaches;
 delete from public.sports_football_player_details where entry_id=v_id;
 insert into public.sports_football_player_details(entry_id,roster_position,birth_date,jersey_number,player_role,player_note)
 select v_id,pos,nullif(a->>'birth_date','')::date,(a->>'jersey_number')::int,
   left(coalesce(a->>'player_role',''),59),left(coalesce(a->>'player_note',''),299)
 from jsonb_array_elements(p_players) with ordinality x(a,pos);
 return v_id;
end $$;
revoke all on function public.sports_futsal_register(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.sports_futsal_register(uuid,uuid,jsonb,jsonb) to authenticated;

-- Private roster retrieval for owner school or competition admin; no public athlete list.
create or replace function public.sports_futsal_roster_details(p_entry uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_entry record; v_players jsonb; v_coaches jsonb;
begin
 select e.id,e.event_id,e.school_id,e.competition_id,e.entry_name,e.status,s.name as school_name,s.director_name,ev.sport_name
 into v_entry from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 join public.sports_events ev on ev.id=e.event_id
 where e.id=p_entry and ev.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF');
 if not found then raise exception 'ไม่พบใบสมัครฟุตซอล'; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(v_entry.competition_id) or exists (
  select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
    and r.school_id=v_entry.school_id and (r.competition_id is null or r.competition_id=v_entry.competition_id)))
  then raise exception 'ไม่มีสิทธิ์ดูข้อมูลนักกีฬา' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('full_name',a.full_name,'student_code',a.student_code,
   'grade_level',a.grade_level,'birth_date',d.birth_date,'jersey_number',d.jersey_number,'player_role',d.player_role,'player_note',d.player_note)
   order by a.roster_position),'[]'::jsonb) into v_players
 from public.sports_athletes a left join public.sports_football_player_details d on d.entry_id=a.entry_id and d.roster_position=a.roster_position
 where a.entry_id=p_entry;
 select coalesce(coaches,'[]'::jsonb) into v_coaches from public.sports_roster_staff where entry_id=p_entry;
 return jsonb_build_object('id',v_entry.id,'event_id',v_entry.event_id,'school_id',v_entry.school_id,
   'school_name',v_entry.school_name,'director_name',v_entry.director_name,'sport_name',v_entry.sport_name,
   'status',v_entry.status,'players',v_players,'coaches',coalesce(v_coaches,'[]'::jsonb));
end $$;
revoke all on function public.sports_futsal_roster_details(uuid) from public,anon;
grant execute on function public.sports_futsal_roster_details(uuid) to authenticated;

-- Explicit private roster listing; uses same ownership rules as details.
create or replace function public.sports_futsal_my_entries(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_admin boolean;
begin
 select competition_id into v_comp from public.sports_events where id=p_event and event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF');
 if v_comp is null or auth.uid() is null then return '[]'::jsonb; end if;
 v_admin:=public.sports_stage3_admin(v_comp);
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'school_id',e.school_id,'school_name',s.name,'status',e.status,
   'athlete_count',(select count(*) from public.sports_athletes a where a.entry_id=e.id)) order by s.name)
 from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 where e.event_id=p_event and e.status<>'withdrawn' and (v_admin or exists(
   select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.role='school_manager' and r.is_active
   and r.school_id=e.school_id and (r.competition_id is null or r.competition_id=v_comp))) ),'[]'::jsonb);
end $$;
revoke all on function public.sports_futsal_my_entries(uuid) from public,anon;
grant execute on function public.sports_futsal_my_entries(uuid) to authenticated;


-- Prevent creating a second, competing fixture stream in generic match tables.
drop policy if exists "futsal specialist insert guard" on public.sports_matches;
create policy "futsal specialist insert guard" on public.sports_matches as restrictive for insert to authenticated with check (not public.sports_is_futsal(event_id));
drop policy if exists "futsal specialist update guard" on public.sports_matches;
create policy "futsal specialist update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_futsal(event_id)) with check(not public.sports_is_futsal(event_id));

commit;
notify pgrst, 'reload schema';
