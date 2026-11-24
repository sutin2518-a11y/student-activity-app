-- v33.27 Takraw, requires Migration 042. All fixtures draft; no deletes.
begin;
create temporary table takraw_school_map(alias text primary key,label text not null,canonical text) on commit drop;
insert into takraw_school_map(alias,label) values
('RP','ราชประชานุเคราะห์ 24'),
('PL','พญาลอวิทยาคม'),
('TP','ถ้ำปินวิทยาคม'),
('FK','ฟากกว๊านวิทยาคม'),
('CK','เชียงคำวิทยาคม'),
('KK','ขุนควรวิทยาคม'),
('PY','พะเยาพิทยาคม'),
('DJ','ดงเจนวิทยาคม'),
('JU','จุนวิทยาคม'),
('DK','ดอกคำใต้วิทยาคม'),
('PP','ปงพัฒนาวิทยาคม');
update takraw_school_map a set canonical=(select case when count(*)=1 then min(s.name) end from public.sports_schools s where regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(a.label,'[[:space:]]+','','g'));
do $$ begin
 if to_regprocedure('public.sports_is_volleyball(uuid)') is null then raise exception 'กรุณาติดตั้ง Migration 042 ก่อน'; end if;
 if exists(select 1 from takraw_school_map where canonical is null) then raise exception 'จับคู่ชื่อโรงเรียนไม่ได้หรือซ้ำ: %',(select string_agg(label,', ') from takraw_school_map where canonical is null); end if;
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-ST-15F','GS3-ST-UF','GS3-ST-15M','GS3-ST-UM'))<>4 then raise exception 'ไม่พบเซปักตะกร้อครบ 4 รุ่น'; end if;
 if exists(select 1 from public.sports_matches m join public.sports_events e on e.id=m.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-ST-15F','GS3-ST-UF','GS3-ST-15M','GS3-ST-UM')) then raise exception 'พบคู่แข่งขันเซปักตะกร้อเดิมในระบบทั่วไป ห้ามติดตั้งซ้ำก่อนตรวจข้อมูล'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_events e on e.id=m.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-ST-15M','GS3-ST-UM','GS3-ST-15F','GS3-ST-UF')) or exists(select 1 from public.sports_football_group_teams t join public.sports_events e on e.id=t.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-ST-15M','GS3-ST-UM','GS3-ST-15F','GS3-ST-UF')) then raise exception 'พบข้อมูลตะกร้อเดิม หยุดเพื่อป้องกันการทับข้อมูล'; end if;
end $$;
update public.sports_events e set max_athletes_per_entry=5,points_win=2,points_draw=0,points_loss=1,updated_at=now() where e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569') and e.event_code in ('GS3-ST-15F','GS3-ST-UF','GS3-ST-15M','GS3-ST-UM');
alter table public.sports_football_matches add column if not exists takraw_sets jsonb;
alter table public.sports_football_matches add column if not exists takraw_forfeit int check(takraw_forfeit in (1,2));
alter table public.sports_football_matches add column if not exists takraw_review_note text not null default '';
alter table public.sports_football_matches add column if not exists takraw_reviewed boolean not null default true;
with seed(event_code,group_code,seed_order,alias) as (values
('GS3-ST-15M','A',1,'RP'),
('GS3-ST-15M','A',2,'PL'),
('GS3-ST-15M','A',3,'TP'),
('GS3-ST-15M','A',4,'FK'),
('GS3-ST-15M','A',5,'CK'),
('GS3-ST-15M','B',1,'KK'),
('GS3-ST-15M','B',2,'PY'),
('GS3-ST-15M','B',3,'DJ'),
('GS3-ST-15M','B',4,'JU'),
('GS3-ST-UM','A',1,'DK'),
('GS3-ST-UM','A',2,'PY'),
('GS3-ST-UM','A',3,'TP'),
('GS3-ST-UM','A',4,'CK'),
('GS3-ST-UM','A',5,'JU'),
('GS3-ST-UM','B',1,'DJ'),
('GS3-ST-UM','B',2,'PL'),
('GS3-ST-UM','B',3,'FK'),
('GS3-ST-UM','B',4,'RP'),
('GS3-ST-15F','A',1,'RP'),
('GS3-ST-15F','A',2,'PY'),
('GS3-ST-15F','A',3,'JU'),
('GS3-ST-15F','B',1,'TP'),
('GS3-ST-15F','B',2,'DK'),
('GS3-ST-15F','B',3,'CK'),
('GS3-ST-UF','A',1,'JU'),
('GS3-ST-UF','A',2,'DJ'),
('GS3-ST-UF','A',3,'DK'),
('GS3-ST-UF','A',4,'CK'),
('GS3-ST-UF','B',1,'TP'),
('GS3-ST-UF','B',2,'PP'),
('GS3-ST-UF','B',3,'RP'),
('GS3-ST-UF','B',4,'PY')) insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,s.group_code,s.seed_order,n.canonical from seed s join takraw_school_map n on n.alias=s.alias join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569' on conflict do nothing;
with seed(event_code,match_no,scheduled_date,start_time,stage,group_code,a,b,venue,review_note) as (values
('GS3-ST-15M',1,'2026-12-05','09:00','group','A','RP','PL','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',2,'2026-12-05','09:30','group','B','KK','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',3,'2026-12-05','10:00','group','A','TP','FK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',4,'2026-12-05','10:30','group','B','DJ','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',5,'2026-12-05','11:00','group','A','RP','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',6,'2026-12-05','11:30','group','B','PY','DJ','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',7,'2026-12-05','13:00','group','A','DK','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',8,'2026-12-05','13:30','group','B','DJ','PL','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',9,'2026-12-05','14:00','group','A','TP','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',10,'2026-12-05','14:30','group','B','FK','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',11,'2026-12-05','15:00','group','A','DK','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',12,'2026-12-05','15:30','group','A','PY','TP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',13,'2026-12-05','16:00','group','A','RP','TP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',14,'2026-12-05','16:30','group','B','PY','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',15,'2026-12-06','09:00','group','A','TP','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',16,'2026-12-06','09:30','group','A','PL','FK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',17,'2026-12-06','10:00','group','B','DJ','FK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',18,'2026-12-06','10:30','group','A','DK','TP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',19,'2026-12-06','11:00','group','B','DJ','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',20,'2026-12-06','11:30','group','A','PY','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',21,'2026-12-06','13:00','group','A','DK','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',22,'2026-12-06','13:30','group','B','PL','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',23,'2026-12-06','14:00','group','A','PY','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',24,'2026-12-06','14:30','group','A','TP','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',25,'2026-12-06','15:00','group','B','PL','FK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',26,'2026-12-06','15:30','group','A','CK','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',27,'2026-12-06','13:00','group','B','KK','DJ','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',28,'2026-12-06','13:30','group','A','RP','FK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',29,'2026-12-06','14:00','group','A','PL','TP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',30,'2026-12-06','14:30','group','A','FK','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',31,'2026-12-06','15:00','group','B','KK','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',32,'2026-12-06','15:30','group','A','PL','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15M',33,'2026-12-07','09:00','semifinal',null,'A1','B2','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',34,'2026-12-07','09:30','semifinal',null,'A2','B1','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',35,'2026-12-07','10:00','semifinal',null,'A1','B2','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-UM',36,'2026-12-07','10:30','semifinal',null,'A2','B1','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1',''),
('GS3-ST-15M',37,'2026-12-07','11:00','final',null,'W33','W34','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1','PDF หน้า 4 คู่ 37 อ้าง 34–35 ข้ามรุ่น; เสนอ 33–34; ยืนยันเกณฑ์อันดับ 3 ร่วมสองทีมและแต้มต่อเซตกับผู้จัด (PDF ไม่ระบุ)'),
('GS3-ST-UM',38,'2026-12-07','11:30','final',null,'W35','W36','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1','PDF หน้า 4 คู่ 38 อ้าง 36–37 ข้ามรุ่น; เสนอ 35–36; ยืนยันเกณฑ์อันดับ 3 ร่วมสองทีมและแต้มต่อเซตกับผู้จัด (PDF ไม่ระบุ)'),
('GS3-ST-15F',1,'2026-12-05','09:00','group','A','RP','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',2,'2026-12-05','09:30','group','B','TP','DK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',3,'2026-12-05','10:00','group','A','PY','JU','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',4,'2026-12-05','10:30','group','B','DK','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',5,'2026-12-05','11:00','group','A','JU','DJ','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',6,'2026-12-05','11:30','group','B','TP','PP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',7,'2026-12-05','13:00','group','A','CK','DK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',8,'2026-12-05','13:30','group','B','PP','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',9,'2026-12-05','14:00','group','A','JU','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',12,'2026-12-05','14:30','group','B','CK','TP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',13,'2026-12-05','15:00','group','B','RP','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',14,'2026-12-05','15:30','group','A','JU','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',15,'2026-12-05','16:00','group','B','PP','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',16,'2026-12-06','09:00','group','A','JU','DK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',17,'2026-12-06','09:30','group','B','TP','RP','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',18,'2026-12-06','10:00','group','A','DJ','CK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',19,'2026-12-06','10:30','group','B','TP','PY','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',20,'2026-12-06','11:30','group','A','DJ','DK','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2','PDF หน้า 6 คู่ 20 ระบุสาย B; เสนอแก้สาย A ตามผลจับฉลากหน้า 5'),
('GS3-ST-15F',21,'2026-12-07','09:00','semifinal',null,'A1','B2','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',22,'2026-12-07','09:30','semifinal',null,'A2','B1','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',23,'2026-12-07','10:00','semifinal',null,'A1','B2','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-UF',24,'2026-12-07','10:30','semifinal',null,'A2','B1','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2',''),
('GS3-ST-15F',25,'2026-12-07','11:00','final',null,'W21','W22','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2','ยืนยันเกณฑ์อันดับ 3 ร่วมสองทีมและแต้มต่อเซตกับผู้จัด (PDF ไม่ระบุ)'),
('GS3-ST-UF',26,'2026-12-07','11:30','final',null,'W23','W24','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2','ยืนยันเกณฑ์อันดับ 3 ร่วมสองทีมและแต้มต่อเซตกับผู้จัด (PDF ไม่ระบุ)')), resolved as (select s.*,coalesce(a.canonical,case when s.a like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.a from 2) else 'ที่ '||right(s.a,1)||' สาย '||left(s.a,1) end) team_a,coalesce(b.canonical,case when s.b like 'W%' then 'ผู้ชนะคู่ที่ '||substring(s.b from 2) else 'ที่ '||right(s.b,1)||' สาย '||left(s.b,1) end) team_b from seed s left join takraw_school_map a on a.alias=s.a left join takraw_school_map b on b.alias=s.b)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants,takraw_review_note,takraw_reviewed)
select e.competition_id,e.id,s.match_no,s.scheduled_date::date,s.start_time::time,s.stage,s.group_code,s.team_a,s.team_b,s.venue,s.team_a||' | '||s.team_b,s.review_note,s.review_note='' from resolved s join public.sports_events e on e.event_code=s.event_code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569' on conflict(event_id,match_no) do nothing;
do $$ begin
 if (select count(*) from public.sports_football_matches m join public.sports_events e on e.id=m.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-ST-15M','GS3-ST-15F','GS3-ST-UM','GS3-ST-UF'))<>62 then raise exception 'จำนวนคู่ไม่ตรง 62 คู่ กรุณาตรวจข้อมูลเดิม'; end if;
end $$;
create or replace function public.sports_is_takraw(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and e.event_code in ('GS3-ST-15F','GS3-ST-UF','GS3-ST-15M','GS3-ST-UM') and c.slug='phayao-secondary-group-sports-2569');
$$;
revoke all on function public.sports_is_takraw(uuid) from public,anon;
grant execute on function public.sports_is_takraw(uuid) to authenticated;
drop policy if exists "takraw matches RPC only" on public.sports_football_matches;
create policy "takraw matches RPC only" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_takraw(event_id)) with check(not public.sports_is_takraw(event_id));
drop policy if exists "takraw group guard" on public.sports_football_group_teams;
create policy "takraw group guard" on public.sports_football_group_teams as restrictive for update to authenticated using(not public.sports_is_takraw(event_id)) with check(not public.sports_is_takraw(event_id));
create or replace function public.sports_takraw_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_takraw(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_takraw_can_score(uuid) from public,anon;
grant execute on function public.sports_takraw_can_score(uuid) to authenticated;
drop policy if exists "takraw specialist insert guard" on public.sports_matches;
create policy "takraw specialist insert guard" on public.sports_matches as restrictive for insert to authenticated with check (not public.sports_is_takraw(event_id));
drop policy if exists "takraw specialist update guard" on public.sports_matches;
create policy "takraw specialist update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_takraw(event_id)) with check(not public.sports_is_takraw(event_id));


create or replace function public.sports_takraw_expected(p_event uuid) returns int language sql stable security definer set search_path='' as $$ select case event_code when 'GS3-ST-15M' then 19 when 'GS3-ST-15F' then 9 when 'GS3-ST-UM' then 19 when 'GS3-ST-UF' then 15 else 0 end from public.sports_events where id=p_event $$;
revoke all on function public.sports_takraw_expected(uuid) from public,anon,authenticated;
create or replace function public.sports_takraw_order_ok(p_event uuid,p_match uuid,p_stage text,p_date date,p_start time) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.sports_football_matches n where n.event_id=p_event and n.id<>p_match and n.status<>'cancelled' and n.scheduled_date is not null and n.start_time is not null and ((array_position(array['group','quarter','semifinal','final'],n.stage)<array_position(array['group','quarter','semifinal','final'],p_stage) and n.scheduled_date+n.start_time>=p_date+p_start) or (array_position(array['group','quarter','semifinal','final'],n.stage)>array_position(array['group','quarter','semifinal','final'],p_stage) and n.scheduled_date+n.start_time<=p_date+p_start)));
$$;
revoke all on function public.sports_takraw_order_ok(uuid,uuid,text,date,time) from public,anon,authenticated;
create or replace function public.sports_takraw_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; expected int;
begin
 select * into strict e from public.sports_events where id=p_event;
 if not public.sports_is_takraw(p_event) or auth.uid() is null or not public.sports_stage3_admin(e.competition_id) then raise exception 'ไม่มีสิทธิ์เผยแพร่' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or e.status='draft' then raise exception 'ยังไม่เปิดแสดงรายการ หรือประกาศอันดับแล้ว'; end if;
 expected:=public.sports_takraw_expected(p_event);
 if (select count(*) from public.sports_football_matches where event_id=p_event and scheduled_date is not null and start_time is not null and btrim(venue_name)<>'' and takraw_reviewed and status<>'cancelled')<>expected then raise exception 'โปรแกรมไม่ครบ หรือยังมีคู่รอตรวจสอบ'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on m.id<>n.id and n.competition_id=m.competition_id and n.scheduled_date=m.scheduled_date and n.venue_name=m.venue_name and n.status<>'cancelled' where m.event_id=p_event and m.status<>'cancelled' and public.sports_is_takraw(n.event_id) and m.start_time=n.start_time) then raise exception 'พบเวลาแข่งขันซ้อนกัน'; end if;
 if exists(select 1 from public.sports_football_matches m where m.event_id=p_event and not public.sports_takraw_order_ok(p_event,m.id,m.stage,m.scheduled_date,m.start_time)) then raise exception 'วันเวลารอบแบ่งกลุ่มต้องมาก่อนรอบน็อกเอาต์ตามลำดับ'; end if;
 update public.sports_football_matches set status='published' where event_id=p_event and status='draft';
end $$;
revoke all on function public.sports_takraw_publish(uuid) from public,anon;
grant execute on function public.sports_takraw_publish(uuid) to authenticated;
create or replace function public.sports_takraw_slot_ok(p_event uuid,p_source text,p_team text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare src public.sports_football_matches%rowtype; grp text; ranking int; team_points int; ahead int; tied int;
begin
 if p_source ~ '^ผู้ชนะคู่ที่ [0-9]+$' then
  select * into src from public.sports_football_matches where event_id=p_event and match_no=substring(p_source from '[0-9]+$')::int;
  return coalesce(src.status='completed' and p_team=(case when src.score1>src.score2 then src.team1_name else src.team2_name end),false);
 elsif p_source ~ '^ที่ [12] สาย [A-D]$' then
  grp:=right(p_source,1);ranking:=substring(p_source from '[12]')::int;
  if exists(select 1 from public.sports_football_matches where event_id=p_event and stage='group' and status<>'completed') then return false; end if;
  if not exists(select 1 from public.sports_football_group_teams where event_id=p_event and group_code=grp and school_name=p_team) then return false; end if;
  with pts as (select t.school_name,(select coalesce(sum(case when t.school_name=(case when m.score1>m.score2 then m.team1_name else m.team2_name end) then 2 when m.takraw_forfeit is not null then 0 else 1 end),0) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.group_code=grp and m.status='completed' and t.school_name in (m.team1_name,m.team2_name)) as points from public.sports_football_group_teams t where t.event_id=p_event and t.group_code=grp)
  select (select points from pts where school_name=p_team),count(*) filter(where points>(select points from pts where school_name=p_team)),count(*) filter(where points=(select points from pts where school_name=p_team)) into team_points,ahead,tied from pts;
  return coalesce(ranking>ahead and ranking<=ahead+tied,false);
 else return p_team=p_source; end if;
end $$;
revoke all on function public.sports_takraw_slot_ok(uuid,text,text) from public,anon,authenticated;
create or replace function public.sports_takraw_save_match(p_match uuid,p_expected timestamptz,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; v_event uuid; a text; b text; st text; admin boolean; s1 int; s2 int; p1 int; p2 int; changed boolean; periods jsonb; item jsonb; idx int:=0; da date; stime time; reviewed boolean; need int; target int; x int; y int; ff int;
begin
 select event_id into strict v_event from public.sports_football_matches where id=p_match;
 if not public.sports_takraw_can_score(v_event) then raise exception 'ไม่มีสิทธิ์บันทึกผลเซปักตะกร้อรายการนี้' using errcode='42501'; end if;
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
  if not (public.sports_takraw_slot_ok(v_event,split_part(m.source_participants,' | ',1),a) and public.sports_takraw_slot_ok(v_event,split_part(m.source_participants,' | ',2),b)) then raise exception 'ชื่อทีมไม่ตรงตามสายหรือผลรอบก่อนหน้า'; end if;
  if m.stage<>'group' and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage=m.stage and o.id<>m.id and (a in(o.team1_name,o.team2_name) or b in(o.team1_name,o.team2_name))) then raise exception 'มีทีมซ้ำในรอบเดียวกัน'; end if;
 end if;
 da:=case when admin then (p_data->>'scheduled_date')::date else m.scheduled_date end;
 stime:=case when admin then (p_data->>'start_time')::time else m.start_time end;
 reviewed:=case when admin then coalesce((p_data->>'reviewed')::boolean,false) else m.takraw_reviewed end;
 if da is null or stime is null or coalesce(case when admin then p_data->>'venue_name' else m.venue_name end,'') not in ('โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 1','โรงยิมโรงเรียนเชียงคำวิทยาคม สนาม 2') then raise exception 'กรอกวัน เวลาเริ่ม และสนามให้ถูกต้อง'; end if;
 if exists(select 1 from public.sports_football_matches n where n.id<>m.id and n.competition_id=m.competition_id and public.sports_is_takraw(n.event_id) and n.status<>'cancelled' and n.scheduled_date=da and n.venue_name=case when admin then coalesce(p_data->>'venue_name',m.venue_name) else m.venue_name end and stime=n.start_time) then raise exception 'เวลาแข่งขันซ้อนกับคู่อื่น'; end if;
 if not public.sports_takraw_order_ok(v_event,m.id,m.stage,da,stime) then raise exception 'วันเวลารอบแข่งขันไม่เรียงตามลำดับ'; end if;
 if st<>'draft' and not reviewed then raise exception 'ต้องยืนยันข้อสังเกตก่อน'; end if;
 if st='completed' then
  need:=2;
  ff:=nullif(p_data->>'forfeit','')::int;
  if ff is not null then
   if ff not in (1,2) or nullif(btrim(coalesce(p_data->>'notes','')),'') is null then raise exception 'ระบุทีมที่ไม่แข่งขันและเหตุผล'; end if;
   s1:=case when ff=1 then 0 else need end; s2:=case when ff=2 then 0 else need end;
  else
   if coalesce((p_data->>'score_confirmed')::boolean,false) is not true then raise exception 'ต้องยืนยันคะแนนตามกติกาที่ผู้จัดกำหนด'; end if;
   periods:=p_data->'sets';
   if periods is null or jsonb_typeof(periods)<>'array' then raise exception 'กรอกคะแนนรายเซต'; end if;
   if jsonb_array_length(periods) not between need and (need*2-1) then raise exception 'จำนวนเซตไม่ถูกต้อง'; end if;
   s1:=0;s2:=0;
   for item in select value from jsonb_array_elements(periods) loop
    idx:=idx+1;
    if s1=need or s2=need then raise exception 'การแข่งขันจบแล้ว ห้ามเพิ่มเซต'; end if;
    if jsonb_typeof(item)<>'array' or jsonb_array_length(item)<>2 or coalesce(item->>0,'') !~ '^[0-9]{1,3}$' or coalesce(item->>1,'') !~ '^[0-9]{1,3}$' then raise exception 'กรอกแต้มทั้งสองทีมเป็นจำนวนเต็ม'; end if;
    x:=(item->>0)::int;y:=(item->>1)::int;
    if x=y then raise exception 'คะแนนเซตห้ามเสมอ'; end if;
    -- Regulation PDF does not specify point target/cap; referee confirms actual set scores.
    if x>y then s1:=s1+1; else s2:=s2+1; end if;
   end loop;
   if s1<>need and s2<>need then raise exception 'ยังไม่มีทีมชนะครบเซต'; end if;
  end if;
 end if;
 changed:=a is distinct from m.team1_name or b is distinct from m.team2_name or st is distinct from m.status or s1 is distinct from m.score1 or s2 is distinct from m.score2 or p1 is distinct from m.penalty1 or p2 is distinct from m.penalty2 or periods is distinct from m.takraw_sets or ff is distinct from m.takraw_forfeit;
 if changed and exists(select 1 from public.sports_football_matches o where o.event_id=v_event and o.stage<>'group' and o.id<>m.id and (case o.stage when 'quarter' then 1 when 'semifinal' then 2 else 3 end)>(case m.stage when 'group' then 0 when 'quarter' then 1 when 'semifinal' then 2 else 3 end) and (o.status='completed' or o.team1_name is distinct from split_part(o.source_participants,' | ',1) or o.team2_name is distinct from split_part(o.source_participants,' | ',2))) then raise exception 'รอบถัดไปยืนยันทีมแล้ว ไม่สามารถแก้ผลย้อนหลังโดยตรง'; end if;
 if not admin and m.status='completed' then raise exception 'ผลบันทึกแล้ว ติดต่อผู้ดูแลหากต้องแก้ไข'; end if;
 update public.sports_football_matches set team1_name=a,team2_name=b,status=st,score1=s1,score2=s2,penalty1=p1,penalty2=p2,
 takraw_sets=periods,takraw_forfeit=ff,takraw_reviewed=reviewed,
 scheduled_date=case when admin then (p_data->>'scheduled_date')::date else m.scheduled_date end,start_time=case when admin then (p_data->>'start_time')::time else m.start_time end,venue_name=case when admin then coalesce(p_data->>'venue_name',m.venue_name) else m.venue_name end,notes=left(coalesce(p_data->>'notes',''),500)
 where id=p_match;
end $$;
revoke all on function public.sports_takraw_save_match(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.sports_takraw_save_match(uuid,timestamptz,jsonb) to authenticated;
create or replace function public.sports_takraw_clear_sets() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if public.sports_is_takraw(new.event_id) and new.status<>'completed' then new.takraw_sets:=null;new.takraw_forfeit:=null; end if; return new; end $$;
revoke all on function public.sports_takraw_clear_sets() from public,anon,authenticated;
drop trigger if exists takraw_clear_sets on public.sports_football_matches;
create trigger takraw_clear_sets before insert or update on public.sports_football_matches for each row execute function public.sports_takraw_clear_sets();

drop policy if exists "takraw matches insert guard" on public.sports_football_matches;
create policy "takraw matches insert guard" on public.sports_football_matches as restrictive for insert to authenticated with check(not public.sports_is_takraw(event_id));
drop policy if exists "takraw matches delete guard" on public.sports_football_matches;
create policy "takraw matches delete guard" on public.sports_football_matches as restrictive for delete to authenticated using(not public.sports_is_takraw(event_id));

drop policy if exists "takraw groups insert guard" on public.sports_football_group_teams;
create policy "takraw groups insert guard" on public.sports_football_group_teams as restrictive for insert to authenticated with check(not public.sports_is_takraw(event_id));
drop policy if exists "takraw groups delete guard" on public.sports_football_group_teams;
create policy "takraw groups delete guard" on public.sports_football_group_teams as restrictive for delete to authenticated using(not public.sports_is_takraw(event_id));
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
 if public.sports_is_volleyball(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262642);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 6 and 12 or p_coaches is null or jsonb_array_length(p_coaches) not between 1 and 3 then raise exception 'วอลเลย์บอล: นักกีฬา 6–12 คน เจ้าหน้าที่ 1–3 คน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on (nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_volleyball(en.event_id)) then raise exception 'นักกีฬาซ้ำในรายการวอลเลย์บอล กรุณาตรวจรายชื่อ'; end if;
 end if;
 if public.sports_is_takraw(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262643);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 3 and 5 or p_coaches is null or jsonb_array_length(p_coaches) <> 3 then raise exception 'เซปักตะกร้อ: นักกีฬา 3–5 คน เจ้าหน้าที่ 3 คน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on (nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_takraw(en.event_id)) then raise exception 'นักกีฬาซ้ำในรายการเซปักตะกร้อ กรุณาตรวจรายชื่อ'; end if;
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
 if public.sports_is_volleyball(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and volleyball_reviewed)<>public.sports_volleyball_expected(p_event) then raise exception 'วอลเลย์บอลยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงวอลเลย์บอล'; end if;
 end if;
 if public.sports_is_takraw(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and takraw_reviewed)<>public.sports_takraw_expected(p_event) then raise exception 'เซปักตะกร้อยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเซปักตะกร้อ'; end if;
 end if;
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
 if public.sports_is_volleyball(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and volleyball_reviewed)<>public.sports_volleyball_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_takraw(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and takraw_reviewed)<>public.sports_takraw_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
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
