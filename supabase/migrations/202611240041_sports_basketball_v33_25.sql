-- v33.25 basketball: 52 original fixtures + two missing group fixtures (draft only).
-- Requires 026, 036, 038, 040. Review PDF conflicts before publication.
begin;
create temporary table basketball_school_map(alias text primary key,label text not null,canonical text) on commit drop;
insert into basketball_school_map(alias,label) values
('CK','เชียงคำวิทยาคม'),
('PY','พะเยาพิทยาคม'),
('PL','พญาลอวิทยาคม'),
('CM','เชียงม่วนวิทยาคม'),
('FG','ฝายกวางวิทยาคม'),
('FK','ฟากกว๊านวิทยาคม'),
('CH','เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'),
('JU','จุนวิทยาคม'),
('PP','ปงพัฒนาวิทยาคม'),
('PR','ปงรัชดาภิเษก'),
('UP','สาธิตมหาวิทยาลัยพะเยา'),
('RP','ราชประชานุเคราะห์ 24'),
('DK','ดอกคำใต้วิทยาคม'),
('PB','ประชาบำรุง');
update basketball_school_map a set canonical=(select case when count(*)=1 then min(s.name) end from public.sports_schools s
 where regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(a.label,'[[:space:]]+','','g')
 or (a.alias='CH' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'เฉลิมพระเกียรติ%')
 or (a.alias='PB' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'ประชาบำรุง%')
 or (a.alias='PR' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'ปงรัชดาภิเษก%')
 or (a.alias='UP' and regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*','') like 'สาธิต%พะเยา%'));
do $$ begin
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF'))<>4 then raise exception 'ไม่พบรายการบาสเกตบอลครบ 4 รุ่น'; end if;
 if exists(select 1 from public.sports_matches m join public.sports_events e on e.id=m.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF')) then raise exception 'พบคู่บาสเกตบอลในระบบทั่วไปเดิม กรุณาสำรองและตรวจสอบการย้ายข้อมูลก่อนติดตั้ง 041'; end if;
 if exists(select 1 from basketball_school_map where canonical is null) then raise exception 'จับคู่ชื่อโรงเรียนไม่ได้หรือซ้ำ: %',(select string_agg(label,', ') from basketball_school_map where canonical is null); end if;
end $$;
update public.sports_events e set max_athletes_per_entry=12,points_win=2,points_draw=0,points_loss=0,updated_at=now()
where e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569') and e.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF');
alter table public.sports_football_matches add column if not exists basketball_end_time time;
alter table public.sports_football_matches add column if not exists basketball_periods jsonb;
alter table public.sports_football_matches add column if not exists basketball_review_note text not null default '';
alter table public.sports_football_matches add column if not exists basketball_reviewed boolean not null default true;
-- Keep football/futsal bounds while allowing basketball totals above 99.
alter table public.sports_football_matches drop constraint if exists sports_football_matches_score1_check;
alter table public.sports_football_matches drop constraint if exists sports_football_matches_score2_check;
alter table public.sports_football_matches add constraint sports_football_matches_score1_check check(score1 is null or score1 between 0 and 999);
alter table public.sports_football_matches add constraint sports_football_matches_score2_check check(score2 is null or score2 between 0 and 999);
with seed(event_code,group_code,seed_order,alias) as (values
('GS3-BB-15M','A',1,'PY'),
('GS3-BB-15M','A',2,'CK'),
('GS3-BB-15M','A',3,'PL'),
('GS3-BB-15M','A',4,'CM'),
('GS3-BB-15F','A',1,'PY'),
('GS3-BB-15F','A',2,'CK'),
('GS3-BB-15F','A',3,'FG'),
('GS3-BB-15F','A',4,'FK'),
('GS3-BB-15F','A',5,'CH'),
('GS3-BB-UM','A',1,'CK'),
('GS3-BB-UM','A',2,'FK'),
('GS3-BB-UM','A',3,'UP'),
('GS3-BB-UM','A',4,'CM'),
('GS3-BB-UM','B',1,'JU'),
('GS3-BB-UM','B',2,'RP'),
('GS3-BB-UM','B',3,'DK'),
('GS3-BB-UM','C',1,'PY'),
('GS3-BB-UM','C',2,'PR'),
('GS3-BB-UM','C',3,'FG'),
('GS3-BB-UM','C',4,'CH'),
('GS3-BB-UM','D',1,'PP'),
('GS3-BB-UM','D',2,'PL'),
('GS3-BB-UM','D',3,'PB'),
('GS3-BB-UF','A',1,'JU'),
('GS3-BB-UF','A',2,'PY'),
('GS3-BB-UF','A',3,'CK'),
('GS3-BB-UF','A',4,'FG'),
('GS3-BB-UF','A',5,'PP')) insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,s.group_code,s.seed_order,n.canonical from seed s join basketball_school_map n on n.alias=s.alias join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict do nothing;
with seed(event_code,match_no,scheduled_date,start_time,end_time,stage,group_code,a,b,review_note) as (values
('GS3-BB-15M',1,'2026-11-29','08:30','09:30','group','A','CK','PL',''),
('GS3-BB-UM',2,'2026-11-29','09:30','10:30','group','A','CK','CM',''),
('GS3-BB-UM',3,'2026-11-29','10:30','11:30','group','C','FG','CH',''),
('GS3-BB-UF',4,'2026-11-29','11:30','12:30','group','A','JU','PY',''),
('GS3-BB-UM',5,'2026-11-29','12:30','13:30','group','A','FK','UP',''),
('GS3-BB-UM',6,'2026-11-29','13:30','14:30','group','C','PY','PR',''),
('GS3-BB-UM',7,'2026-11-29','14:30','15:30','group','B','JU','RP',''),
('GS3-BB-UF',8,'2026-11-30','08:30','09:30','group','A','JU','FG',''),
('GS3-BB-UM',9,'2026-11-30','09:30','10:30','group','A','CK','UP',''),
('GS3-BB-UM',10,'2026-11-30','10:30','11:30','group','A','FK','CM',''),
('GS3-BB-15F',11,'2026-11-30','11:30','12:30','group','A','PY','CH',''),
('GS3-BB-UM',12,'2026-11-30','12:30','13:30','group','C','PY','FG',''),
('GS3-BB-UM',13,'2026-11-30','13:30','14:30','group','B','RP','DK',''),
('GS3-BB-UM',14,'2026-11-30','14:30','15:30','group','C','PR','CH',''),
('GS3-BB-UM',15,'2026-12-02','08:30','09:30','group','C','PR','FG',''),
('GS3-BB-UM',16,'2026-12-02','09:30','10:30','group','D','PP','PL',''),
('GS3-BB-UM',17,'2026-12-02','10:30','11:30','group','A','UP','CM',''),
('GS3-BB-15F',18,'2026-12-02','11:30','12:30','group','A','CH','FG',''),
('GS3-BB-UM',19,'2026-12-02','12:30','13:30','group','A','CK','FK',''),
('GS3-BB-UM',20,'2026-12-02','13:30','14:30','group','C','PY','CH',''),
('GS3-BB-UM',21,'2026-12-02','14:30','15:30','group','B','JU','DK',''),
('GS3-BB-UF',22,'2026-12-03','08:30','09:30','group','A','CK','FG',''),
('GS3-BB-15M',23,'2026-12-03','09:30','10:30','group','A','PY','CM',''),
('GS3-BB-15F',24,'2026-12-03','10:30','11:30','group','A','CH','FK',''),
('GS3-BB-UF',25,'2026-12-03','11:30','12:30','group','A','JU','PP',''),
('GS3-BB-15F',26,'2026-12-03','12:30','13:30','group','A','PY','CK',''),
('GS3-BB-UF',27,'2026-12-04','08:30','09:30','group','A','JU','CK',''),
('GS3-BB-15M',28,'2026-12-04','09:30','10:30','group','A','CK','CM',''),
('GS3-BB-15F',29,'2026-12-04','10:30','11:30','group','A','PY','FK',''),
('GS3-BB-15M',30,'2026-12-04','11:30','12:30','group','A','PY','PL',''),
('GS3-BB-UF',31,'2026-12-04','12:30','13:30','group','A','PY','PP',''),
('GS3-BB-15F',32,'2026-12-04','13:30','14:30','group','A','CK','FG',''),
('GS3-BB-15F',33,'2026-12-05','08:30','09:30','group','A','CK','CH',''),
('GS3-BB-UF',34,'2026-12-05','09:30','10:30','group','A','CK','PP',''),
('GS3-BB-UM',35,'2026-12-05',null,null,'quarter',null,'A1','C2','ต้นฉบับชนคู่ 34 เวลา 09:30–10:30 วันที่ 5 ธ.ค. ต้องกำหนดวันเวลาใหม่และยืนยัน'),
('GS3-BB-UM',36,'2026-12-05','10:30','11:30','quarter',null,'C1','A2',''),
('GS3-BB-UF',37,'2026-12-05','11:30','12:30','group','A','PY','FG',''),
('GS3-BB-15F',38,'2026-12-05','12:30','13:30','group','A','FG','FK',''),
('GS3-BB-UM',39,'2026-12-05','13:30','14:45','quarter',null,'B1','D2',''),
('GS3-BB-UM',40,'2026-12-05','14:45','16:00','quarter',null,'D1','B2',''),
('GS3-BB-UF',41,'2026-12-06','08:30','09:30','group','A','FG','PP',''),
('GS3-BB-15M',42,'2026-12-06','09:30','10:30','group','A','PY','CK',''),
('GS3-BB-15F',43,'2026-12-06','10:30','11:30','group','A','PY','FG',''),
('GS3-BB-UF',44,'2026-12-06','11:30','12:30','group','A','PY','CK',''),
('GS3-BB-15F',45,'2026-12-06','12:30','13:30','group','A','CK','FK',''),
('GS3-BB-15M',46,'2026-12-06','13:30','14:30','group','A','PL','CM',''),
('GS3-BB-UM',47,'2026-12-06','14:30','15:30','semifinal',null,'W35','W39',''),
('GS3-BB-UM',48,'2026-12-06','15:30','16:30','semifinal',null,'W36','W40','ต้นฉบับระบุผู้ชนะคู่ 44 ซึ่งเป็นหญิง; เสนอผู้ชนะคู่ 40 ตามผังหน้า 6 ต้องให้ผู้จัดยืนยัน'),
('GS3-BB-15F',49,'2026-12-07','09:00','10:30','final',null,'A1','A2','ตารางระบุรอบชิงอันดับ 1–2 แต่ระเบียบให้จัดอันดับจากคะแนนพบกันหมด ต้องยืนยันว่าจัดชิงและใช้ผลชิงตัดสินอันดับ 1–2; อันดับ 3 ให้กรรมการยืนยัน'),
('GS3-BB-15M',50,'2026-12-07','10:30','12:00','final',null,'A1','A2','ตารางระบุรอบชิงอันดับ 1–2 แต่ระเบียบให้จัดอันดับจากคะแนนพบกันหมด ต้องยืนยันว่าจัดชิงและใช้ผลชิงตัดสินอันดับ 1–2; อันดับ 3 ให้กรรมการยืนยัน'),
('GS3-BB-UF',51,'2026-12-07','12:00','13:30','final',null,'A1','A2','ตารางระบุรอบชิงอันดับ 1–2 แต่ระเบียบให้จัดอันดับจากคะแนนพบกันหมด ต้องยืนยันว่าจัดชิงและใช้ผลชิงตัดสินอันดับ 1–2; อันดับ 3 ให้กรรมการยืนยัน'),
('GS3-BB-UM',52,'2026-12-07','13:30','15:00','final',null,'W47','W48',''),
('GS3-BB-UM',53,null,null,null,'group','D','PP','PB','คู่ที่ขาดจากการพบกันหมดสาย D ไม่อยู่ใน PDF; ต้องยืนยันวันเวลาโดยผู้จัดก่อนเผยแพร่'),
('GS3-BB-UM',54,null,null,null,'group','D','PL','PB','คู่ที่ขาดจากการพบกันหมดสาย D ไม่อยู่ใน PDF; ต้องยืนยันวันเวลาโดยผู้จัดก่อนเผยแพร่')), resolved as (select s.*,coalesce(a.canonical,case when s.a like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.a from 2) else 'ที่ '||right(s.a,1)||' สาย '||left(s.a,1) end) as team_a,
 coalesce(b.canonical,case when s.b like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.b from 2) else 'ที่ '||right(s.b,1)||' สาย '||left(s.b,1) end) as team_b
 from seed s left join basketball_school_map a on a.alias=s.a left join basketball_school_map b on b.alias=s.b)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,start_time,basketball_end_time,stage,group_code,team1_name,team2_name,venue_name,source_participants,basketball_review_note,basketball_reviewed)
select e.competition_id,e.id,s.match_no,s.scheduled_date::date,s.start_time::time,s.end_time::time,s.stage,s.group_code,s.team_a,s.team_b,'โดมแดง–ขาว โรงเรียนเชียงคำวิทยาคม',s.team_a||' | '||s.team_b,s.review_note,s.review_note=''
from resolved s join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,match_no) do nothing;
create or replace function public.sports_is_basketball(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and e.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF') and c.slug='phayao-secondary-group-sports-2569');
$$;
revoke all on function public.sports_is_basketball(uuid) from public,anon;
grant execute on function public.sports_is_basketball(uuid) to authenticated;
drop policy if exists "basketball matches RPC only" on public.sports_football_matches;
create policy "basketball matches RPC only" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_basketball(event_id)) with check(not public.sports_is_basketball(event_id));
drop policy if exists "basketball group guard" on public.sports_football_group_teams;
create policy "basketball group guard" on public.sports_football_group_teams as restrictive for update to authenticated using(not public.sports_is_basketball(event_id)) with check(not public.sports_is_basketball(event_id));
create or replace function public.sports_basketball_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_basketball(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_basketball_can_score(uuid) from public,anon;
grant execute on function public.sports_basketball_can_score(uuid) to authenticated;
create or replace function public.sports_basketball_bounds() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.sports_is_basketball(new.event_id) then
  if coalesce(new.score1,0)>99 or coalesce(new.score2,0)>99 then raise exception 'คะแนนเกินขอบเขตฟุตบอล/ฟุตซอล'; end if;
 elsif new.status<>'completed' then new.basketball_periods:=null;
 end if;
 return new;
end $$;
revoke all on function public.sports_basketball_bounds() from public,anon,authenticated;
drop trigger if exists basketball_bounds on public.sports_football_matches;
create trigger basketball_bounds before insert or update on public.sports_football_matches for each row execute function public.sports_basketball_bounds();
create or replace function public.sports_basketball_order_ok(p_event uuid,p_match uuid,p_stage text,p_date date,p_start time,p_end time) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.sports_football_matches n
 where n.event_id=p_event and n.id<>p_match and n.status<>'cancelled' and n.scheduled_date is not null and n.start_time is not null and n.basketball_end_time is not null and (
  ((case n.stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end)<(case p_stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end) and n.scheduled_date+n.basketball_end_time>p_date+p_start)
  or ((case n.stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end)>(case p_stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end) and n.scheduled_date+n.start_time<p_date+p_end)
 ));
$$;
revoke all on function public.sports_basketball_order_ok(uuid,uuid,text,date,time,time) from public,anon,authenticated;
create or replace function public.sports_basketball_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; expected int;
begin
 select * into strict e from public.sports_events where id=p_event;
 if not public.sports_is_basketball(p_event) or auth.uid() is null or not public.sports_stage3_admin(e.competition_id) then raise exception 'ไม่มีสิทธิ์เผยแพร่' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or e.status='draft' then raise exception 'ยังไม่เปิดแสดงรายการ หรือประกาศอันดับแล้ว'; end if;
 expected:=case e.event_code when 'GS3-BB-15M' then 7 when 'GS3-BB-UM' then 25 else 11 end;
 if (select count(*) from public.sports_football_matches where event_id=p_event and scheduled_date is not null and start_time is not null and basketball_end_time>start_time and basketball_reviewed and status<>'cancelled')<>expected then raise exception 'โปรแกรมไม่ครบ หรือยังมีคู่รอตรวจสอบ'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on m.id<>n.id and n.competition_id=m.competition_id and n.scheduled_date=m.scheduled_date and n.venue_name=m.venue_name and n.status<>'cancelled' where m.event_id=p_event and m.status<>'cancelled' and public.sports_is_basketball(n.event_id) and m.start_time<n.basketball_end_time and n.start_time<m.basketball_end_time) then raise exception 'พบเวลาแข่งขันซ้อนกัน'; end if;
 if exists(select 1 from public.sports_football_matches m where m.event_id=p_event and not public.sports_basketball_order_ok(p_event,m.id,m.stage,m.scheduled_date,m.start_time,m.basketball_end_time)) then raise exception 'วันเวลารอบแบ่งกลุ่มต้องมาก่อนรอบน็อกเอาต์ตามลำดับ'; end if;
 update public.sports_football_matches set status='published' where event_id=p_event and status='draft';
end $$;
revoke all on function public.sports_basketball_publish(uuid) from public,anon;
grant execute on function public.sports_basketball_publish(uuid) to authenticated;
create or replace function public.sports_basketball_slot_ok(p_event uuid,p_source text,p_team text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare src public.sports_football_matches%rowtype; grp text; ranking int; team_points int; ahead int; tied int;
begin
 if p_source ~ '^ผู้ชนะคู่ที่ [0-9]+$' then
  select * into src from public.sports_football_matches where event_id=p_event and match_no=substring(p_source from '[0-9]+$')::int;
  return coalesce(src.status='completed' and p_team=(case when src.score1>src.score2 then src.team1_name else src.team2_name end),false);
 elsif p_source ~ '^ที่ [12] สาย [A-D]$' then
  grp:=right(p_source,1);ranking:=substring(p_source from '[12]')::int;
  if exists(select 1 from public.sports_football_matches where event_id=p_event and stage='group' and status<>'completed') then return false; end if;
  if not exists(select 1 from public.sports_football_group_teams where event_id=p_event and group_code=grp and school_name=p_team) then return false; end if;
  with pts as (select t.school_name,2*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.group_code=grp and m.status='completed' and t.school_name=(case when m.score1>m.score2 then m.team1_name else m.team2_name end)) as points from public.sports_football_group_teams t where t.event_id=p_event and t.group_code=grp)
  select (select points from pts where school_name=p_team),count(*) filter(where points>(select points from pts where school_name=p_team)),count(*) filter(where points=(select points from pts where school_name=p_team)) into team_points,ahead,tied from pts;
  return coalesce(ranking>ahead and ranking<=ahead+tied,false);
 else return p_team=p_source; end if;
end $$;
revoke all on function public.sports_basketball_slot_ok(uuid,text,text) from public,anon,authenticated;
create or replace function public.sports_basketball_save_match(p_match uuid,p_expected timestamptz,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; v_event uuid; a text; b text; st text; admin boolean; s1 int; s2 int; p1 int; p2 int; changed boolean; periods jsonb; item jsonb; idx int:=0; da date; stime time; etime time; reviewed boolean;
begin
 select event_id into strict v_event from public.sports_football_matches where id=p_match;
 if not public.sports_basketball_can_score(v_event) then raise exception 'ไม่มีสิทธิ์บันทึกผลบาสเกตบอลรายการนี้' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext((select competition_id::text from public.sports_events where id=v_event)),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event::text),94723);
 select * into strict m from public.sports_football_matches where id=p_match for update;
 if m.event_id<>v_event or m.updated_at is distinct from p_expected then raise exception 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่'; end if;
 if public.sports_award_is_published(v_event) then raise exception 'ประกาศอันดับแล้ว ต้องให้ผู้ดูแลตรวจสอบแก้ไขผลรางวัลก่อน'; end if;
 admin:=public.sports_stage3_admin(m.competition_id);
 a:=btrim(coalesce(p_data->>'team1_name',''));b:=btrim(coalesce(p_data->>'team2_name',''));st:=p_data->>'status';
 if st is null or st not in ('draft','published','completed') or (m.status='draft' and st<>'draft') or (m.status<>'draft' and st='draft') or m.status='cancelled' then raise exception 'สถานะไม่ถูกต้อง'; end if;
 if not admin and (m.status not in ('published','completed') or st not in ('published','completed')) then raise exception 'กรรมการบันทึกได้เฉพาะคู่ที่เผยแพร่แล้ว'; end if;
 if not admin and ((p_data->>'scheduled_date')::date is distinct from m.scheduled_date or (p_data->>'start_time')::time is distinct from m.start_time or p_data->>'venue_name' is distinct from m.venue_name) then raise exception 'กรรมการไม่มีสิทธิ์เปลี่ยนโปรแกรม'; end if;
 if m.stage='group' and (a<>m.team1_name or b<>m.team2_name) then raise exception 'ไม่อนุญาตเปลี่ยนทีมในรอบแบ่งสาย'; end if;
 if a='' or b='' or a=b then raise exception 'คู่แข่งขันไม่ถูกต้อง'; end if;
 if st='completed' or a<>m.team1_name or b<>m.team2_name then
  if not (public.sports_basketball_slot_ok(v_event,split_part(m.source_participants,' | ',1),a) and public.sports_basketball_slot_ok(v_event,split_part(m.source_participants,' | ',2),b)) then raise exception 'ชื่อทีมไม่ตรงตามสายหรือผลรอบก่อนหน้า'; end if;
  if m.stage<>'group' and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage=m.stage and o.id<>m.id and (a in(o.team1_name,o.team2_name) or b in(o.team1_name,o.team2_name))) then raise exception 'มีทีมซ้ำในรอบเดียวกัน'; end if;
 end if;
 da:=case when admin then (p_data->>'scheduled_date')::date else m.scheduled_date end;
 stime:=case when admin then (p_data->>'start_time')::time else m.start_time end;
 etime:=case when admin then (p_data->>'end_time')::time else m.basketball_end_time end;
 reviewed:=case when admin then coalesce((p_data->>'reviewed')::boolean,false) else m.basketball_reviewed end;
 if da is null or stime is null or etime is null or etime<=stime then raise exception 'กรอกวัน เวลาเริ่ม–สิ้นสุดให้ถูกต้อง'; end if;
 if exists(select 1 from public.sports_football_matches n where n.id<>m.id and n.competition_id=m.competition_id and public.sports_is_basketball(n.event_id) and n.status<>'cancelled' and n.scheduled_date=da and n.venue_name=case when admin then coalesce(p_data->>'venue_name',m.venue_name) else m.venue_name end and stime<n.basketball_end_time and n.start_time<etime) then raise exception 'เวลาแข่งขันซ้อนกับคู่อื่น'; end if;
 if not public.sports_basketball_order_ok(v_event,m.id,m.stage,da,stime,etime) then raise exception 'วันเวลารอบแข่งขันไม่เรียงตามลำดับ'; end if;
 if st<>'draft' and not reviewed then raise exception 'ต้องยืนยันข้อสังเกตก่อน'; end if;
 if st='completed' then
  periods:=p_data->'periods';
  if periods is null or jsonb_typeof(periods)<>'array' then raise exception 'กรอกคะแนนรายควอเตอร์'; end if;
  if jsonb_array_length(periods) not between 4 and 24 then raise exception 'ต้องมี 4 ควอเตอร์ และช่วงต่อเวลาเมื่อจำเป็น'; end if;
  s1:=0; s2:=0;
  for item in select value from jsonb_array_elements(periods) loop
   idx:=idx+1;
   if jsonb_typeof(item)<>'array' then raise exception 'รูปแบบคะแนนผิด'; end if;
   if jsonb_array_length(item)<>2 or coalesce(item->>0,'') !~ '^[0-9]{1,3}$' or coalesce(item->>1,'') !~ '^[0-9]{1,3}$' then raise exception 'คะแนนต้องเป็นจำนวนเต็มไม่ติดลบทั้งสองทีม'; end if;
   if idx>4 and s1<>s2 then raise exception 'ต่อเวลาได้เฉพาะเมื่อคะแนนรวมยังเสมอ'; end if;
   s1:=s1+(item->>0)::int; s2:=s2+(item->>1)::int;
  end loop;
  if s1=s2 or s1>999 or s2>999 then raise exception 'คะแนนรวมต้องไม่เสมอและไม่เกิน 999'; end if;
 end if;
 changed:=a is distinct from m.team1_name or b is distinct from m.team2_name or st is distinct from m.status or s1 is distinct from m.score1 or s2 is distinct from m.score2 or p1 is distinct from m.penalty1 or p2 is distinct from m.penalty2 or periods is distinct from m.basketball_periods;
 if changed and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage<>'group' and o.id<>m.id and (case o.stage when 'quarter' then 1 when 'semifinal' then 2 else 3 end)>(case m.stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end) and (o.status='completed' or o.team1_name is distinct from split_part(o.source_participants,' | ',1) or o.team2_name is distinct from split_part(o.source_participants,' | ',2))) then raise exception 'รอบถัดไปยืนยันทีมแล้ว ไม่สามารถแก้ผลย้อนหลังโดยตรง'; end if;
 if not admin and m.status='completed' and changed then raise exception 'ผลบันทึกแล้ว ติดต่อผู้ดูแลหากต้องแก้ไข'; end if;
 update public.sports_football_matches set team1_name=a,team2_name=b,status=st,score1=s1,score2=s2,penalty1=p1,penalty2=p2,
 basketball_periods=periods,basketball_end_time=etime,basketball_reviewed=reviewed,
 scheduled_date=case when admin then (p_data->>'scheduled_date')::date else m.scheduled_date end,start_time=case when admin then (p_data->>'start_time')::time else m.start_time end,venue_name=case when admin then coalesce(p_data->>'venue_name',m.venue_name) else m.venue_name end,notes=left(coalesce(p_data->>'notes',''),500)
 where id=p_match;
end $$;
revoke all on function public.sports_basketball_save_match(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.sports_basketball_save_match(uuid,timestamptz,jsonb) to authenticated;
create or replace function public.sports_basketball_register(
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
 if v_event.event_code not in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF') then raise exception 'ไม่ใช่รายการบาสเกตบอล'; end if;
 if not public.sports_is_basketball(p_event) then raise exception 'ไม่ใช่รายการบาสเกตบอล 2569'; end if;
 v_admin := public.sports_stage3_admin(v_event.competition_id);
 if not v_admin and not exists(select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.role='school_manager' and r.is_active and r.school_id=p_school
    and (r.competition_id is null or r.competition_id=v_event.competition_id))
  then raise exception 'ไม่มีสิทธิ์จัดการทีมโรงเรียนนี้' using errcode='42501'; end if;
 if v_event.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 if p_players is null or jsonb_typeof(p_players)<>'array' then raise exception 'รูปแบบข้อมูลนักกีฬาไม่ถูกต้อง'; end if;
 v_count := jsonb_array_length(p_players);
 if v_count<7 or v_count>12 then raise exception 'ลงทะเบียนนักกีฬาได้ 7–12 คนต่อทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'full_name'),'') is null
    or coalesce(a->>'grade_level','') !~ '^ม\.[1-6]$' or nullif(a->>'birth_date','') is null or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')
  then raise exception 'กรุณากรอกชื่อ วันเกิด และเบอร์เสื้อทุกคน'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number') having count(*)>1)
  then raise exception 'มีหมายเลขเสื้อซ้ำในทีม'; end if;
 if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<>2 then raise exception 'ต้องมีผู้ฝึกสอนและผู้ช่วยผู้ฝึกสอน 2 คน'; end if;
 if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
    regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมให้ครบ'; end if;
 if nullif(btrim(p_coaches->0->>'manager_name'),'') is null or regexp_replace(coalesce(p_coaches->0->>'manager_phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$' then raise exception 'กรอกผู้จัดการทีมและเบอร์โทรให้ครบ'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where (a->>'birth_date')::date>current_date or (a->>'birth_date')::date<'1900-01-01' or (v_event.event_code in ('GS3-BB-15M','GS3-BB-15F') and (a->>'birth_date')::date<'2011-01-01')) then raise exception 'วันเกิดไม่ถูกต้อง หรือไม่ผ่านเกณฑ์รุ่น 15 ปี'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'รายชื่อนักกีฬาซ้ำในทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'student_code'),'') is not null group by btrim(a->>'student_code') having count(*)>1) then raise exception 'รหัสนักเรียนซ้ำในทีม'; end if;
 -- Serialize same school registrations across male age categories.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event.competition_id::text),pg_catalog.hashtext(p_school::text));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศอันดับแล้ว ไม่อนุญาตแก้ทะเบียน'; end if;
 if exists(select 1 from public.sports_entries en join public.sports_events ev on ev.id=en.event_id join public.sports_athletes a on a.entry_id=en.id cross join jsonb_array_elements(p_players) p where en.competition_id=v_event.competition_id and en.school_id=p_school and en.event_id<>p_event and en.status<>'withdrawn' and ((nullif(btrim(p->>'student_code'),'') is not null and btrim(p->>'student_code')=a.student_code) or regexp_replace(btrim(p->>'full_name'),'[[:space:]]+','','g')=regexp_replace(btrim(a.full_name),'[[:space:]]+','','g'))) then raise exception 'นักกีฬาลงทะเบียนซ้ำในกีฬา/รุ่นอื่นของโรงเรียนนี้'; end if;
 -- Avoid duplicate registrations from concurrent browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),pg_catalog.hashtext(p_school::text));
 if (select count(*) from public.sports_entries e where e.event_id=p_event and e.school_id=p_school and e.status<>'withdrawn')>1 then raise exception 'มีใบสมัครเดิมซ้ำ กรุณาให้ผู้ดูแลตรวจสอบก่อนแก้ไข'; end if;
 select e.id into v_id from public.sports_entries e where e.event_id=p_event and e.school_id=p_school
  and e.status<>'withdrawn' order by e.created_at limit 1 for update;
 select name into v_name from public.sports_schools where id=p_school;
 if v_name is null or not exists(select 1 from public.sports_football_group_teams t where t.event_id=p_event and t.school_name=v_name) then raise exception 'ไม่พบโรงเรียนในสายการแข่งขัน'; end if;
 if v_id is null then
  insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status)
    values(v_event.competition_id,p_event,p_school,'team',v_name,p_coaches->0->>'name',p_coaches->1->>'name','submitted') returning id into v_id;
  insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position)
    select v_id,nullif(btrim(a->>'student_code'),''),btrim(a->>'full_name'),a->>'grade_level',null,pos
    from jsonb_array_elements(p_players) with ordinality x(a,pos);
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
revoke all on function public.sports_basketball_register(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.sports_basketball_register(uuid,uuid,jsonb,jsonb) to authenticated;

-- Private roster retrieval for owner school or competition admin; no public athlete list.
create or replace function public.sports_basketball_roster_details(p_entry uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_entry record; v_players jsonb; v_coaches jsonb;
begin
 select e.id,e.event_id,e.school_id,e.competition_id,e.entry_name,e.status,s.name as school_name,s.director_name,ev.sport_name
 into v_entry from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 join public.sports_events ev on ev.id=e.event_id
 where e.id=p_entry and ev.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF');
 if not found then raise exception 'ไม่พบใบสมัครบาสเกตบอล'; end if;
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
revoke all on function public.sports_basketball_roster_details(uuid) from public,anon;
grant execute on function public.sports_basketball_roster_details(uuid) to authenticated;

-- Explicit private roster listing; uses same ownership rules as details.
create or replace function public.sports_basketball_my_entries(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_admin boolean;
begin
 select competition_id into v_comp from public.sports_events where id=p_event and event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF');
 if v_comp is null or auth.uid() is null then return '[]'::jsonb; end if;
 v_admin:=public.sports_stage3_admin(v_comp);
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'school_id',e.school_id,'school_name',s.name,'status',e.status,
   'athlete_count',(select count(*) from public.sports_athletes a where a.entry_id=e.id)) order by s.name)
 from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 where e.event_id=p_event and e.status<>'withdrawn' and (v_admin or exists(
   select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.role='school_manager' and r.is_active
   and r.school_id=e.school_id and (r.competition_id is null or r.competition_id=v_comp))) ),'[]'::jsonb);
end $$;
revoke all on function public.sports_basketball_my_entries(uuid) from public,anon;
grant execute on function public.sports_basketball_my_entries(uuid) to authenticated;


-- Prevent creating a second, competing fixture stream in generic match tables.
drop policy if exists "basketball specialist insert guard" on public.sports_matches;
create policy "basketball specialist insert guard" on public.sports_matches as restrictive for insert to authenticated with check (not public.sports_is_basketball(event_id));
drop policy if exists "basketball specialist update guard" on public.sports_matches;
create policy "basketball specialist update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_basketball(event_id)) with check(not public.sports_is_basketball(event_id));


create or replace function public.sports_cert_submit(p_event uuid,p_awards jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_expected int;
 v_num int;
 v_status text;
begin
 if not public.sports_cert_can_record(p_event) then
   raise exception 'ไม่มีสิทธิ์ประกาศผลรายการนี้' using errcode='42501';
 end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 v_expected:=case when (v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'จำนวนอันดับไม่ครบตามประเภทการแข่งขัน';
 end if;
 if exists(
   select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
      or x.rank not between 1 and 3 or x.slot not between 1 and 2
      or (x.rank<>3 and x.slot<>1)
      or ((v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) and x.slot<>1)
 ) then raise exception 'ข้อมูลอันดับไม่ถูกต้อง'; end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
   or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=2))
 then raise exception 'อันดับซ้ำหรือผู้ได้รับรางวัลซ้ำ กรุณาตรวจสอบ'; end if;

 -- Registration is considered received when the school submits it. The existing
 -- auto-receive trigger normalizes new sports_entries to status='approved'.
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_event.competition_id
   and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then
   raise exception 'ต้องเลือกใบสมัครที่โรงเรียนส่งข้อมูลแล้วจากรายการนี้เท่านั้น';
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_is_basketball(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>(case v_event.event_code when 'GS3-BB-15M' then 7 when 'GS3-BB-UM' then 25 else 11 end) then raise exception 'บาสเกตบอลยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if not exists(select 1 from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=1 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or not exists(select 1 from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=2 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) then raise exception 'อันดับ 1–2 ไม่ตรงกับผลรอบชิง'; end if;
  if v_event.event_code='GS3-BB-UM' and (select count(*) from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=3 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end)<>2 then raise exception 'อันดับ 3 ร่วมต้องตรงกับผู้แพ้รอบรอง'; end if;
  if v_event.event_code<>'GS3-BB-UM' and exists(
    with points as (select t.school_name,2*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.status='completed' and t.school_name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) points from public.sports_football_group_teams t where t.event_id=p_event),
    picked as (select x.rank,sc.name from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id)
    select 1 from points other where other.school_name not in(select name from picked where rank in (1,2)) and other.points>coalesce((select points.points from points join picked on picked.name=points.school_name and picked.rank=3),-1)
  ) then raise exception 'อันดับ 3 ต้องมาจากทีมที่มีคะแนนสะสมสูงสุดในทีมที่ไม่ได้ชิงอันดับ 1–2'; end if;
 end if;
 select status into v_status from public.sports_certificate_results where event_id=p_event for update;
 if v_status='published' then
   raise exception 'รายการนี้ประกาศผลแล้ว หากต้องแก้ไขให้ใช้กระบวนการยกเลิก/ออกเกียรติบัตรฉบับใหม่';
 end if;
 if v_status is not null and v_status not in ('submitted','rejected','approved') then
   raise exception 'ไม่สามารถประกาศผลจากสถานะปัจจุบันได้';
 end if;

 -- Publish immediately in the same transaction as the placements.
 insert into public.sports_certificate_results(
   event_id,competition_id,status,rejection_reason,submitted_by,submitted_at,
   approved_by,approved_at,published_at,updated_at
 ) values(p_event,v_event.competition_id,'published','',auth.uid(),now(),null,null,now(),now())
 on conflict(event_id) do update set
   status='published',rejection_reason='',submitted_by=auth.uid(),submitted_at=now(),
   approved_by=null,approved_at=null,published_at=now(),updated_at=now();

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_event.competition_id,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 -- Sync the central individual/athletics results shown on the public results page.
 -- Clear only the previous rank, retaining any previously recorded performance data.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,now()
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set
   school_id=excluded.school_id,
   entry_name=excluded.entry_name,
   rank=excluded.rank,
   recorded_at=now();

 -- Replace the medal rows for this event from the committee's submitted placements.
 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_event.competition_id,p_event,en.school_id,
   case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Awards become available to each school's certificate-print page immediately.
 perform public.sports_cert_issue_internal(p_event,'award');
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลอันดับ เหรียญ หรือเกียรติบัตรไม่ครบ ระบบยกเลิกการบันทึกทั้งหมด กรุณาตรวจใบสมัครและติดต่อผู้ดูแล';
 end if;
 return jsonb_build_object('status','published','count',v_expected,'published_at',now());
end; $$;
revoke all on function public.sports_cert_submit(uuid,jsonb) from public,anon;
grant execute on function public.sports_cert_submit(uuid,jsonb) to authenticated;

create or replace function public.sports_admin_correct_published_result(
  p_event uuid, p_awards jsonb, p_reason text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_result public.sports_certificate_results%rowtype;
 v_comp uuid;
 v_expected int;
 v_num int;
 v_old jsonb;
 v_new jsonb;
 v_reason text:=btrim(coalesce(p_reason,''));
 v_change uuid:=gen_random_uuid();
 v_revoked int:=0;
 v_issued int:=0;
 v_athletes int:=0;
 v_coaches int:=0;
 v_timestamp timestamptz:=now();
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select * into v_event from public.sports_events where id=p_event;
 if not found or not public.sports_stage3_admin(v_event.competition_id) then
   raise exception 'เฉพาะ Admin หลักเท่านั้นที่แก้ผลหลังประกาศได้' using errcode='42501';
 end if;
 v_comp:=v_event.competition_id;
 if length(v_reason)<8 or length(v_reason)>1000 then
   raise exception 'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 และไม่เกิน 1,000 ตัวอักษร';
 end if;
 v_expected:=case when (v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'ต้องกรอกอันดับให้ครบตามประเภทกีฬา';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
     or x.rank not between 1 and 3 or x.slot not between 1 and 2
     or (x.rank<>3 and x.slot<>1)
     or ((v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) and x.slot<>1)) then
   raise exception 'ข้อมูลอันดับไม่ถูกต้อง';
 end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
  or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=2)) then
   raise exception 'อันดับซ้ำหรือผู้แข่งขันได้รับหลายอันดับ';
 end if;
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_comp and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then raise exception 'กรุณาเลือกเฉพาะใบสมัครที่โรงเรียนส่งแล้วในรายการนี้'; end if;

 -- Same lock used by the assigned-official publisher; then the certificate lock.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94724);
 select * into v_result from public.sports_certificate_results where event_id=p_event for update;
 if not found or v_result.status<>'published' then
   raise exception 'รายการนี้ยังไม่ประกาศผล หรือสถานะถูกเปลี่ยนไปแล้ว';
 end if;
 if p_expected_updated_at is null or v_result.updated_at is distinct from p_expected_updated_at then
   raise exception 'มีการเปลี่ยนแปลงผลระหว่างที่เปิดหน้า กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
   order by p.rank,p.slot),'[]'::jsonb) into v_old
 from public.sports_certificate_placements p where p.event_id=p_event;
 select coalesce(jsonb_agg(jsonb_build_object('rank',x.rank,'slot',x.slot,'entry_id',x.entry_id)
   order by x.rank,x.slot),'[]'::jsonb) into v_new
 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid);
 if v_old=v_new then raise exception 'อันดับยังเหมือนเดิม ไม่จำเป็นต้องออกเกียรติบัตรใหม่'; end if;

 -- Invalidate ALL unrevoked award documents for this event, including temporarily
 -- inactive ones. Keep old snapshots, QR tokens, reasons and serial numbers forever.
 update public.sports_certificates_issued
   set is_active=false,revoked_at=v_timestamp,revoked_by=auth.uid(),
       revocation_reason='แก้ผลหลังประกาศโดย Admin: '||v_reason
 where event_id=p_event and certificate_kind='award' and revoked_at is null;
 get diagnostics v_revoked=row_count;

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_comp,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 update public.sports_certificate_results
 set status='published',published_at=v_timestamp,updated_at=v_timestamp
 where event_id=p_event;

 -- Preserve match scores and athletics performance values; modify only ranks.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,v_timestamp
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set school_id=excluded.school_id,
    entry_name=excluded.entry_name,rank=excluded.rank,recorded_at=excluded.recorded_at;

 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_comp,p_event,en.school_id,
  case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Generate entirely new immutable award documents. The ordinary issue_internal
 -- cannot be reused: the UNIQUE key of a canceled original remains reserved.
 with eligible as (
   select en.id entry_id,en.school_id,s.name school_name,a.full_name recipient_name,
     'athlete:'||coalesce(a.roster_position::text,
       row_number() over(partition by en.id order by a.roster_position nulls last,a.full_name)::text) base_key,
     p.rank award_rank
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   join public.sports_athletes a on a.entry_id=en.id
   where p.event_id=p_event
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,a.entry_id,a.school_id,'athlete',
   left('correction:'||v_change::text||':'||a.base_key,200),
   a.recipient_name,a.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   a.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from eligible a join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp;
 get diagnostics v_athletes=row_count;

 with ranked as (
   select en.id entry_id,en.school_id,s.name school_name,p.rank award_rank,
     coalesce(nullif(st.coaches,'[]'::jsonb),
       case when nullif(btrim(coalesce(en.coach_name,'')),'') is not null
         then jsonb_build_array(jsonb_build_object('name',en.coach_name)) else '[]'::jsonb end) staff
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   left join public.sports_roster_staff st on st.entry_id=en.id
   where p.event_id=p_event
 ), expanded as (
   select en.*,staff.pos,btrim(coalesce(staff.person->>'name','')) coach_name
   from ranked en cross join lateral jsonb_array_elements(en.staff) with ordinality staff(person,pos)
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,en.entry_id,en.school_id,'coach',
   left('correction:'||v_change::text||':coach:'||en.pos::text,200),
   en.coach_name,en.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   en.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from expanded en join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp
 where en.coach_name<>'';
 get diagnostics v_coaches=row_count;
 v_issued:=v_athletes+v_coaches;
 if v_issued=0 then
   raise exception 'ไม่พบรายชื่อนักกีฬา/ครูผู้ควบคุมสำหรับออกเกียรติบัตรใหม่ ระบบจึงไม่แก้ไขผลและไม่ยกเลิกเอกสารเดิม';
 end if;

 -- Connect 1:1 matching recipients to the new document without mis-linking
 -- different people with the same name. Old QR stays revoked in all cases.
 with candidate as (
   select old.id old_id,new.id new_id,
     count(*) over(partition by old.id) matches_old,
     count(*) over(partition by new.id) matches_new
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new
     on new.event_id=old.event_id and new.entry_id=old.entry_id
      and new.recipient_type=old.recipient_type and new.recipient_name=old.recipient_name
   where old.event_id=p_event and old.certificate_kind='award'
     and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 ), pairs as (
   select old_id,new_id from candidate where matches_old=1 and matches_new=1
 )
 update public.sports_certificates_issued old
    set replaced_by=pairs.new_id,replacement_reason=v_reason
 from pairs where old.id=pairs.old_id;

 -- Historical predecessor QRs should point to the newest replacement as well.
 with recursive linked(ancestor_id,replacement_id) as (
   select i.id,i.replaced_by from public.sports_certificates_issued i
   where i.event_id=p_event and i.revoked_at=v_timestamp and i.replaced_by is not null
   union all
   select prior.id,linked.replacement_id
   from public.sports_certificates_issued prior
   join linked on prior.replaced_by=linked.ancestor_id
   where prior.id<>linked.replacement_id
 )
 update public.sports_certificates_issued old set replaced_by=linked.replacement_id
 from linked where old.id=linked.ancestor_id and old.replaced_by is distinct from linked.replacement_id;

 -- Set replaces_id only when an unambiguous immediate predecessor exists.
 with pairs as (
   select old.id old_id,new.id new_id,
      count(*) over(partition by new.id) n_new,
      count(*) over(partition by old.id) n_old
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new on new.id=old.replaced_by
   where old.event_id=p_event and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 )
 update public.sports_certificates_issued new set replaces_id=pairs.old_id
 from pairs where new.id=pairs.new_id and pairs.n_new=1 and pairs.n_old=1
   and new.replaces_id is null;

 insert into public.sports_result_admin_corrections(
  id,event_id,competition_id,corrected_by,correction_reason,
  previous_placements,corrected_placements,previous_published_at,corrected_at,
  revoked_award_certificates,newly_issued_award_certificates
 ) values (
  v_change,p_event,v_comp,auth.uid(),v_reason,
  v_old,v_new,v_result.published_at,v_timestamp,v_revoked,v_issued
 );
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลที่แก้ไขยังเชื่อมโยงไม่ครบ ระบบคืนข้อมูลเดิมทั้งหมด กรุณาตรวจใบสมัครและเหรียญรางวัล';
 end if;
 return jsonb_build_object('status','published','correction_id',v_change,
   'revoked_award_certificates',v_revoked,
   'new_award_certificates',v_issued,
   'updated_at',v_timestamp);
end; $$;
revoke all on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) from public,anon;
grant execute on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) to authenticated;

-- Preserve generic 015 RPC for other sports; deny bypass of basketball-specific validation.
create or replace function public.sports_register_roster(
 p_entry uuid,p_event uuid,p_school uuid,p_name text,p_coach text,p_assistant text,p_players jsonb,p_coaches jsonb default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 e public.sports_events%rowtype;
 team uuid;
 saved uuid;
 n integer;
begin
 select * into strict e from public.sports_events where id=p_event for share;
 if auth.uid() is null or not (public.sports_stage3_admin(e.competition_id) or exists(
   select 1 from public.sports_user_roles where user_id=auth.uid() and is_active and role='school_manager'
   and school_id=p_school and (competition_id=e.competition_id or competition_id is null)
 )) then raise exception 'ไม่มีสิทธิ์ลงทะเบียนให้โรงเรียนนี้'; end if;
 if public.sports_is_basketball(e.id) then raise exception 'กรุณาใช้หน้าลงทะเบียนบาสเกตบอล 4 รุ่น'; end if;
 if e.stage3_source is not null and e.status <> 'registration' and p_entry is null then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 n:=jsonb_array_length(p_players);
 if coalesce(n,0)<1 or nullif(btrim(p_name),'') is null or exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'full_name'),'') is null)
 then raise exception 'กรุณากรอกชื่อทีมและรายชื่อนักกีฬาให้ครบ'; end if;
 if n>e.max_athletes_per_entry then raise exception 'จำนวนนักกีฬาเกินที่รายการกำหนด'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'student_code'),'') is not null group by btrim(x->>'student_code') having count(*)>1)
 then raise exception 'รหัสนักเรียนซ้ำภายในทีม'; end if;
 -- Validate repeatable coaches for every sport when supplied; still accept old
 -- non-RoV callers that only send p_coach until the v14 frontend is deployed.
 if p_coaches is not null then
   if jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1
     then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีมอย่างน้อย 1 คน'; end if;
   if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
     regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
     then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูทุกคนให้ครบ'; end if;
   p_coach := btrim(p_coaches->0->>'name');
   p_assistant := nullif(btrim(p_coaches->1->>'name'),'');
 end if;
 if e.event_code in ('GS3-ES-SM','GS3-ES-SF') then
   if n not between 5 and 7 then raise exception 'ต้องมีผู้เล่นหลัก 5 คน และตัวสำรองเพิ่มได้ไม่เกิน 2 คน (ไม่บังคับ)'; end if;
   if p_coaches is null then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'ign'),'') is null or coalesce(a->>'team_role','') not in ('หัวหน้าทีม','ตัวจริง','ตัวสำรอง'))
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='หัวหน้าทีม')<>1
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวจริง')<>4
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวสำรอง')>2
   then raise exception 'กรุณาระบุชื่อในเกมทุกคน พร้อมหัวหน้าทีม 1 คน ตัวจริงอีก 4 คน และตัวสำรองไม่เกิน 2 คน (ไม่บังคับ)'; end if;
   select t.id into team from public.sports_esports_group_teams t join public.sports_schools s
   on regexp_replace(btrim(s.name),'^โรงเรียน','')=regexp_replace(btrim(t.school_name),'^โรงเรียน','')
   where s.id=p_school and t.event_id=e.id and t.competition_id=e.competition_id;
   if team is null then raise exception 'ไม่พบทีมโรงเรียนในสายของประเภทนี้ กรุณาตรวจชื่อโรงเรียนกับผู้จัด'; end if;
   if exists(select 1 from public.sports_entries where event_id=e.id and school_id=p_school and id is distinct from p_entry)
   then raise exception 'โรงเรียนนี้มีใบสมัคร RoV ในประเภทนี้แล้ว'; end if;
 end if;
 if p_entry is null then
   insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status,esports_team_id)
   values(e.competition_id,e.id,p_school,case when e.event_type='team' then 'team' else 'individual' end,btrim(p_name),p_coach,p_assistant,'submitted',team) returning id into saved;
 else
   update public.sports_entries set entry_name=btrim(p_name),coach_name=p_coach,assistant_coach=p_assistant,status='submitted',
     approved_by=null,return_reason=null,esports_team_id=team,updated_at=now()
   where id=p_entry and competition_id=e.competition_id and school_id=p_school and event_id=e.id and status='rejected' returning id into saved;
   if saved is null then raise exception 'แก้ไขได้เฉพาะใบสมัครที่ถูกส่งคืน'; end if;
   delete from public.sports_athletes where entry_id=saved;
 end if;
 insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position,ign,team_role,play_position)
 select saved,nullif(btrim(x->>'student_code'),''),btrim(x->>'full_name'),null,null,pos,case when team is not null then x->>'ign' end,case when team is not null then x->>'team_role' end,case when team is not null then nullif(x->>'play_position','') end
 from jsonb_array_elements(p_players) with ordinality a(x,pos);
 if p_coaches is not null then
   insert into public.sports_roster_staff(entry_id,coaches) values(saved,(
     select jsonb_agg(jsonb_build_object('name',btrim(c->>'name'),'phone',btrim(c->>'phone')) order by pos)
     from jsonb_array_elements(p_coaches) with ordinality x(c,pos)
   )) on conflict(entry_id) do update set coaches=excluded.coaches;
 end if;
 return saved;
end $$;

revoke all on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) to authenticated;



create or replace function public.sports_award_suggestions(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype; v_source text; v_matches jsonb;
 v_final jsonb; v_semi jsonb; v_names text[]; v_winners text[]; v_name text;
 v_entry uuid; v_count int; v_bronze text; v_ties int; v_rank int; v_slot int; v_i int:=0; v_awards jsonb:='[]'::jsonb;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์อ่านผลรายการนี้' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event;
 if v_event.event_type <> 'team' then return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if public.sports_is_basketball(p_event) and v_event.event_code<>'GS3-BB-UM' then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>(case when v_event.event_code='GS3-BB-15M' then 7 else 11 end) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
  select array[case when m.score1>m.score2 then m.team1_name else m.team2_name end,case when m.score1>m.score2 then m.team2_name else m.team1_name end] into v_names from public.sports_football_matches m where m.event_id=p_event and m.stage='final' and m.status='completed';
  if v_names is null then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
  with pts as (select t.school_name,2*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.status='completed' and t.school_name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) points from public.sports_football_group_teams t where t.event_id=p_event and not (t.school_name=any(v_names)))
  select min(school_name),count(*) into v_bronze,v_ties from pts where points=(select max(points) from pts);
  if v_ties<>1 then return jsonb_build_object('status','ambiguous','source','football','placements','[]'::jsonb); end if;
  v_names:=array_append(v_names,v_bronze);
  foreach v_name in array v_names loop
   select count(*),min(en.id::text)::uuid into v_count,v_entry from public.sports_entries en join public.sports_schools sc on sc.id=en.school_id where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved' and sc.name=v_name;
   if v_count<>1 then return jsonb_build_object('status','ambiguous','source','football','placements','[]'::jsonb); end if;
   v_i:=v_i+1;
   v_awards:=v_awards||jsonb_build_array(jsonb_build_object('rank',v_i,'slot',1,'entry_id',v_entry));
  end loop;
  return jsonb_build_object('status','ready','source','football','placements',v_awards);
 end if;
 if public.sports_is_basketball(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>25 then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if exists(select 1 from public.sports_football_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='football';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.status='completed',
   'winner',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team1_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team2_name end,
   'loser',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team2_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team1_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_football_matches m where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.status<>'cancelled';
 elsif exists(select 1 from public.sports_esports_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='esports';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.match_status='completed',
   'winner',case when m.score1>m.score2 then a.school_name when m.score2>m.score1 then b.school_name end,
   'loser',case when m.score1>m.score2 then b.school_name when m.score2>m.score1 then a.school_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_esports_matches m left join public.sports_esports_group_teams a on a.id=m.team1_id and a.event_id=m.event_id and a.competition_id=m.competition_id
   left join public.sports_esports_group_teams b on b.id=m.team2_id and b.event_id=m.event_id and b.competition_id=m.competition_id
   where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.match_status<>'cancelled';
 else return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='final')<>1
 or (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal')<>2
 or exists(select 1 from jsonb_array_elements(v_matches) x where x->>'done' is distinct from 'true' or nullif(btrim(x->>'winner'),'') is null or nullif(btrim(x->>'loser'),'') is null)
 then return jsonb_build_object('status','incomplete','source',v_source,'placements','[]'::jsonb); end if;
 select x into v_final from jsonb_array_elements(v_matches) x where x->>'stage'='final';
 select jsonb_agg(x) into v_semi from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal';
 v_names:=array[v_final->>'winner',v_final->>'loser',v_semi->0->>'loser',v_semi->1->>'loser'];
 v_winners:=array[v_semi->0->>'winner',v_semi->1->>'winner'];
 if not (v_names[1]=any(v_winners) and v_names[2]=any(v_winners)) or (select count(distinct n) from unnest(v_names) n)<>4 then
 return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
 foreach v_name in array v_names loop
  select count(*),min(en.id::text)::uuid into v_count,v_entry from public.sports_entries en join public.sports_schools s on s.id=en.school_id
   where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved' and regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(regexp_replace(btrim(v_name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g');
  if v_count<>1 then return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
  v_i:=v_i+1; v_rank:=least(v_i,3); v_slot:=case when v_i=4 then 2 else 1 end;
  v_awards:=v_awards||jsonb_build_array(jsonb_build_object('rank',v_rank,'slot',v_slot,'entry_id',v_entry));
 end loop;
 return jsonb_build_object('status','ready','source',v_source,'placements',v_awards);
end $$;
revoke all on function public.sports_award_suggestions(uuid) from public,anon;
grant execute on function public.sports_award_suggestions(uuid) to authenticated;
commit;
notify pgrst, 'reload schema';
