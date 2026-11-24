-- v33.29 Table tennis. Requires 044. All fixtures draft; no deletes.
begin;
create temporary table tt_school(alias text primary key,label text not null,canonical text) on commit drop;
insert into tt_school(alias,label) values
('FG','ฟากกว๊านวิทยาคม'),
('CK','เชียงคำวิทยาคม'),
('CM','เชียงม่วนวิทยาคม'),
('MJ','แม่ใจวิทยาคม'),
('PR','ปงรัชดาภิเษก'),
('DK','ดอกคำใต้วิทยาคม'),
('DJ','ดงเจนวิทยาคม'),
('PY','พะเยาพิทยาคม'),
('NG','งำเมืองวิทยาคม'),
('PS','ภูซางวิทยาคม'),
('PN','พินิตประสาธน์');
update tt_school a set canonical=(select case when count(*)=1 then min(s.name) end from public.sports_schools s where regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(a.label,'[[:space:]]+','','g'));
do $$ begin
 if to_regprocedure('public.sports_is_petanque(uuid)') is null then raise exception 'ติดตั้ง Migration 044 ก่อน'; end if;
 if exists(select 1 from tt_school where canonical is null) then raise exception 'จับคู่โรงเรียนไม่ได้หรือซ้ำ: %',(select string_agg(label,', ') from tt_school where canonical is null); end if;
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-TT-13M-S','GS3-TT-13F-S','GS3-TT-13M-D','GS3-TT-13F-D','GS3-TT-13X-X','GS3-TT-15M-S','GS3-TT-15F-S','GS3-TT-15M-D','GS3-TT-15F-D','GS3-TT-15X-X','GS3-TT-UM-S','GS3-TT-UF-S','GS3-TT-UM-D','GS3-TT-UF-D','GS3-TT-UX-X'))<>15 then raise exception 'ไม่พบเทเบิลเทนนิสครบ 15 รายการ'; end if;
 if exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-TT-13M-S','GS3-TT-13F-S','GS3-TT-13M-D','GS3-TT-13F-D','GS3-TT-13X-X','GS3-TT-15M-S','GS3-TT-15F-S','GS3-TT-15M-D','GS3-TT-15F-D','GS3-TT-15X-X','GS3-TT-UM-S','GS3-TT-UF-S','GS3-TT-UM-D','GS3-TT-UF-D','GS3-TT-UX-X') and (exists(select 1 from public.sports_matches m where m.event_id=e.id) or exists(select 1 from public.sports_football_matches m where m.event_id=e.id) or exists(select 1 from public.sports_football_group_teams t where t.event_id=e.id))) then raise exception 'พบข้อมูลเทเบิลเทนนิสเดิม หยุดเพื่อป้องกันข้อมูลซ้ำ'; end if;
 if exists(select 1 from public.sports_schedule_sessions ss join public.sports_events e on e.id=ss.event_id join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code like 'GS3-TT-%' and ss.status in ('published','postponed')) then raise exception 'พบโปรแกรมเทเบิลเทนนิสส่วนกลางที่เผยแพร่แล้ว กรุณาตรวจสอบก่อนย้าย'; end if;
end $$;
create or replace function public.sports_is_tabletennis(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and e.event_code in ('GS3-TT-13M-S','GS3-TT-13F-S','GS3-TT-13M-D','GS3-TT-13F-D','GS3-TT-13X-X','GS3-TT-15M-S','GS3-TT-15F-S','GS3-TT-15M-D','GS3-TT-15F-D','GS3-TT-15X-X','GS3-TT-UM-S','GS3-TT-UF-S','GS3-TT-UM-D','GS3-TT-UF-D','GS3-TT-UX-X') and c.slug='phayao-secondary-group-sports-2569');
$$;
revoke all on function public.sports_is_tabletennis(uuid) from public,anon;
grant execute on function public.sports_is_tabletennis(uuid) to authenticated;
drop policy if exists "tabletennis matches RPC only" on public.sports_football_matches;
create policy "tabletennis matches RPC only" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_tabletennis(event_id)) with check(not public.sports_is_tabletennis(event_id));
drop policy if exists "tabletennis group guard" on public.sports_football_group_teams;
create policy "tabletennis group guard" on public.sports_football_group_teams as restrictive for update to authenticated using(not public.sports_is_tabletennis(event_id)) with check(not public.sports_is_tabletennis(event_id));
create or replace function public.sports_tabletennis_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_tabletennis(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_tabletennis_can_score(uuid) from public,anon;
grant execute on function public.sports_tabletennis_can_score(uuid) to authenticated;
drop policy if exists "tabletennis specialist insert guard" on public.sports_matches;
create policy "tabletennis specialist insert guard" on public.sports_matches as restrictive for insert to authenticated with check (not public.sports_is_tabletennis(event_id));
drop policy if exists "tabletennis specialist update guard" on public.sports_matches;
create policy "tabletennis specialist update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_tabletennis(event_id)) with check(not public.sports_is_tabletennis(event_id));


drop policy if exists "tabletennis matches insert guard" on public.sports_football_matches;
create policy "tabletennis matches insert guard" on public.sports_football_matches as restrictive for insert to authenticated with check(not public.sports_is_tabletennis(event_id));
drop policy if exists "tabletennis matches delete guard" on public.sports_football_matches;
create policy "tabletennis matches delete guard" on public.sports_football_matches as restrictive for delete to authenticated using(not public.sports_is_tabletennis(event_id));

drop policy if exists "tabletennis groups insert guard" on public.sports_football_group_teams;
create policy "tabletennis groups insert guard" on public.sports_football_group_teams as restrictive for insert to authenticated with check(not public.sports_is_tabletennis(event_id));
drop policy if exists "tabletennis groups delete guard" on public.sports_football_group_teams;
create policy "tabletennis groups delete guard" on public.sports_football_group_teams as restrictive for delete to authenticated using(not public.sports_is_tabletennis(event_id));
alter table public.sports_football_matches add column if not exists tt_review_note text not null default '';
alter table public.sports_football_matches add column if not exists tt_reviewed boolean not null default false;
alter table public.sports_football_matches add column if not exists tt_games jsonb;
alter table public.sports_football_matches add column if not exists tt_best_of int;
alter table public.sports_football_matches add column if not exists tt_end_time time;
update public.sports_events set max_athletes_per_entry=case when event_code like '%-S' then 1 else 2 end, updated_at=now() where public.sports_is_tabletennis(id);
with seed(event_code,seed_order,alias) as (values
('GS3-TT-13M-S',1,'FG'),
('GS3-TT-13M-S',2,'CK'),
('GS3-TT-13M-S',3,'CM'),
('GS3-TT-13M-S',4,'MJ'),
('GS3-TT-13M-S',5,'PR'),
('GS3-TT-13M-S',6,'DK'),
('GS3-TT-13M-S',7,'DJ'),
('GS3-TT-13M-S',8,'PY'),
('GS3-TT-13F-S',1,'PY'),
('GS3-TT-13F-S',2,'PR'),
('GS3-TT-13F-S',3,'MJ'),
('GS3-TT-13F-S',4,'CM'),
('GS3-TT-13F-S',5,'DK'),
('GS3-TT-13F-S',6,'CK'),
('GS3-TT-13F-S',7,'DJ'),
('GS3-TT-13M-D',1,'PY'),
('GS3-TT-13M-D',2,'PR'),
('GS3-TT-13M-D',3,'CM'),
('GS3-TT-13M-D',4,'DK'),
('GS3-TT-13M-D',5,'CK'),
('GS3-TT-13M-D',6,'DJ'),
('GS3-TT-13F-D',1,'DJ'),
('GS3-TT-13F-D',2,'PY'),
('GS3-TT-13F-D',3,'CK'),
('GS3-TT-13F-D',4,'PR'),
('GS3-TT-13F-D',5,'CM'),
('GS3-TT-13X-X',1,'MJ'),
('GS3-TT-13X-X',2,'PY'),
('GS3-TT-13X-X',3,'DK'),
('GS3-TT-13X-X',4,'CK'),
('GS3-TT-13X-X',5,'CM'),
('GS3-TT-13X-X',6,'PR'),
('GS3-TT-15M-S',1,'CK'),
('GS3-TT-15M-S',2,'PR'),
('GS3-TT-15M-S',3,'DJ'),
('GS3-TT-15M-S',4,'FG'),
('GS3-TT-15M-S',5,'NG'),
('GS3-TT-15M-S',6,'PY'),
('GS3-TT-15M-S',7,'CM'),
('GS3-TT-15M-S',8,'DK'),
('GS3-TT-15F-S',1,'PY'),
('GS3-TT-15F-S',2,'PR'),
('GS3-TT-15F-S',3,'DJ'),
('GS3-TT-15F-S',4,'DK'),
('GS3-TT-15F-S',5,'CK'),
('GS3-TT-15M-D',1,'DK'),
('GS3-TT-15M-D',2,'CM'),
('GS3-TT-15M-D',3,'CK'),
('GS3-TT-15M-D',4,'PR'),
('GS3-TT-15M-D',5,'DJ'),
('GS3-TT-15M-D',6,'PY'),
('GS3-TT-15F-D',1,'PY'),
('GS3-TT-15F-D',2,'DJ'),
('GS3-TT-15F-D',3,'PR'),
('GS3-TT-15F-D',4,'CK'),
('GS3-TT-15X-X',1,'PY'),
('GS3-TT-15X-X',2,'PR'),
('GS3-TT-15X-X',3,'CK'),
('GS3-TT-15X-X',4,'DK'),
('GS3-TT-UM-S',1,'PS'),
('GS3-TT-UM-S',2,'CK'),
('GS3-TT-UM-S',3,'CM'),
('GS3-TT-UM-S',4,'DK'),
('GS3-TT-UM-S',5,'PY'),
('GS3-TT-UM-S',6,'PR'),
('GS3-TT-UM-S',7,'FG'),
('GS3-TT-UF-S',1,'PR'),
('GS3-TT-UF-S',2,'DJ'),
('GS3-TT-UF-S',3,'PN'),
('GS3-TT-UF-S',4,'PY'),
('GS3-TT-UF-S',5,'CK'),
('GS3-TT-UF-S',6,'DK'),
('GS3-TT-UF-S',7,'CM'),
('GS3-TT-UM-D',1,'CM'),
('GS3-TT-UM-D',2,'PY'),
('GS3-TT-UM-D',3,'PR'),
('GS3-TT-UM-D',4,'DK'),
('GS3-TT-UM-D',5,'PS'),
('GS3-TT-UM-D',6,'CK'),
('GS3-TT-UF-D',1,'CK'),
('GS3-TT-UF-D',2,'DJ'),
('GS3-TT-UF-D',3,'PR'),
('GS3-TT-UF-D',4,'PY'),
('GS3-TT-UF-D',5,'DK'),
('GS3-TT-UF-D',6,'CM'),
('GS3-TT-UX-X',1,'CK'),
('GS3-TT-UX-X',2,'CM'),
('GS3-TT-UX-X',3,'PR'),
('GS3-TT-UX-X',4,'PY'),
('GS3-TT-UX-X',5,'DK')) insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,'A',s.seed_order,n.canonical from seed s join tt_school n on n.alias=s.alias join public.sports_events e on e.event_code=s.event_code and public.sports_is_tabletennis(e.id);
with seed(event_code,match_no,stage,a,b,note) as (values
('GS3-TT-13M-S',1,'quarter','FG','CK','หน้า 11–12: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',2,'quarter','CM','MJ','หน้า 11–12: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',3,'quarter','PR','DK','หน้า 11–12: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',4,'quarter','DJ','PY','หน้า 11–12: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 4; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',5,'semifinal','1','2','หน้า 11–12: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',6,'semifinal','3','4','หน้า 11–12: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13M-S',7,'final','5','6','หน้า 11–12: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-13F-S',1,'quarter','PY','PR','หน้า 13–14: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13F-S',2,'quarter','MJ','CM','หน้า 13–14: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13F-S',3,'quarter','DK','CK','หน้า 13–14: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13F-S',4,'semifinal','1','2','หน้า 13–14: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13F-S',5,'semifinal','3','DJ','หน้า 13–14: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13F-S',6,'final','4','5','หน้า 13–14: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–7 ในตารางแก้เป็น 5–6 ตามแผนผัง'),
('GS3-TT-13M-D',1,'quarter','PY','PR','หน้า 15–16: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ตารางเกิน 1 คู่และอ้างเลขผิด ยึดแผนผัง 5 คู่'),
('GS3-TT-13M-D',2,'quarter','CM','DK','หน้า 15–16: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ตารางเกิน 1 คู่และอ้างเลขผิด ยึดแผนผัง 5 คู่'),
('GS3-TT-13M-D',3,'semifinal','CK','DJ','หน้า 15–16: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; ตารางเกิน 1 คู่และอ้างเลขผิด ยึดแผนผัง 5 คู่'),
('GS3-TT-13M-D',4,'semifinal','1','2','หน้า 15–16: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางเกิน 1 คู่และอ้างเลขผิด ยึดแผนผัง 5 คู่'),
('GS3-TT-13M-D',5,'final','4','3','หน้า 15–16: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางเกิน 1 คู่และอ้างเลขผิด ยึดแผนผัง 5 คู่'),
('GS3-TT-13F-D',1,'semifinal','DJ','PY','หน้า 17–18: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; แผนผังไม่ระบุเลขคู่ชิง ใช้คู่ 4 ตามตาราง'),
('GS3-TT-13F-D',2,'quarter','CK','PR','หน้า 17–18: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; แผนผังไม่ระบุเลขคู่ชิง ใช้คู่ 4 ตามตาราง'),
('GS3-TT-13F-D',3,'semifinal','2','CM','หน้า 17–18: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); แผนผังไม่ระบุเลขคู่ชิง ใช้คู่ 4 ตามตาราง'),
('GS3-TT-13F-D',4,'final','1','3','หน้า 17–18: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); แผนผังไม่ระบุเลขคู่ชิง ใช้คู่ 4 ตามตาราง'),
('GS3-TT-13X-X',1,'quarter','MJ','PY','หน้า 19–20: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1'),
('GS3-TT-13X-X',2,'quarter','DK','CK','หน้า 19–20: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2'),
('GS3-TT-13X-X',3,'semifinal','1','CM','หน้า 19–20: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-13X-X',4,'semifinal','2','PR','หน้า 19–20: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-13X-X',5,'final','3','4','หน้า 19–20: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-15M-S',1,'quarter','CK','PR','หน้า 21–22: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',2,'quarter','DJ','FG','หน้า 21–22: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',3,'quarter','NG','PY','หน้า 21–22: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',4,'quarter','CM','DK','หน้า 21–22: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 4; เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',5,'semifinal','1','2','หน้า 21–22: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',6,'semifinal','3','4','หน้า 21–22: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15M-S',7,'final','5','6','หน้า 21–22: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); เลขคู่ 6–8 ในตารางแก้เป็น 5–7 ตามแผนผัง'),
('GS3-TT-15F-S',1,'semifinal','PY','PR','หน้า 23–24: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; คู่ 3 อ้างตัวเองในตาราง แก้เป็นผู้ชนะคู่ 2'),
('GS3-TT-15F-S',2,'quarter','DJ','DK','หน้า 23–24: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; คู่ 3 อ้างตัวเองในตาราง แก้เป็นผู้ชนะคู่ 2'),
('GS3-TT-15F-S',3,'semifinal','2','CK','หน้า 23–24: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); คู่ 3 อ้างตัวเองในตาราง แก้เป็นผู้ชนะคู่ 2'),
('GS3-TT-15F-S',4,'final','1','3','หน้า 23–24: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); คู่ 3 อ้างตัวเองในตาราง แก้เป็นผู้ชนะคู่ 2'),
('GS3-TT-15M-D',1,'quarter','DK','CM','หน้า 25–26: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ยึดเลขคู่และลำดับตามตาราง (แผนผังสลับเลข 2/3) ให้ยืนยัน'),
('GS3-TT-15M-D',2,'quarter','CK','PR','หน้า 25–26: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ยึดเลขคู่และลำดับตามตาราง (แผนผังสลับเลข 2/3) ให้ยืนยัน'),
('GS3-TT-15M-D',3,'semifinal','DJ','PY','หน้า 25–26: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; ยึดเลขคู่และลำดับตามตาราง (แผนผังสลับเลข 2/3) ให้ยืนยัน'),
('GS3-TT-15M-D',4,'semifinal','1','2','หน้า 25–26: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ยึดเลขคู่และลำดับตามตาราง (แผนผังสลับเลข 2/3) ให้ยืนยัน'),
('GS3-TT-15M-D',5,'final','3','4','หน้า 25–26: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ยึดเลขคู่และลำดับตามตาราง (แผนผังสลับเลข 2/3) ให้ยืนยัน'),
('GS3-TT-15F-D',1,'semifinal','PY','DJ','หน้า 27–28: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1'),
('GS3-TT-15F-D',2,'semifinal','PR','CK','หน้า 27–28: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2'),
('GS3-TT-15F-D',3,'final','1','2','หน้า 27–28: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-15X-X',1,'semifinal','PY','PR','หน้า 29–30: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ตารางระบุชายคู่และเลขคู่ชิง 4 แก้ตามหัวเรื่อง/แผนผังคู่ 3'),
('GS3-TT-15X-X',2,'semifinal','CK','DK','หน้า 29–30: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ตารางระบุชายคู่และเลขคู่ชิง 4 แก้ตามหัวเรื่อง/แผนผังคู่ 3'),
('GS3-TT-15X-X',3,'final','1','2','หน้า 29–30: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุชายคู่และเลขคู่ชิง 4 แก้ตามหัวเรื่อง/แผนผังคู่ 3'),
('GS3-TT-UM-S',1,'quarter','PS','CK','หน้า 31–32: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1'),
('GS3-TT-UM-S',2,'quarter','CM','DK','หน้า 31–32: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2'),
('GS3-TT-UM-S',3,'quarter','PY','PR','หน้า 31–32: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3'),
('GS3-TT-UM-S',4,'semifinal','1','2','หน้า 31–32: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-UM-S',5,'semifinal','3','FG','หน้า 31–32: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-UM-S',6,'final','4','5','หน้า 31–32: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF)'),
('GS3-TT-UF-S',1,'quarter','PR','DJ','หน้า 33–34: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UF-S',2,'quarter','PN','PY','หน้า 33–34: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UF-S',3,'quarter','CK','DK','หน้า 33–34: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UF-S',4,'semifinal','1','2','หน้า 33–34: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UF-S',5,'semifinal','3','CM','หน้า 33–34: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UF-S',6,'final','4','5','หน้า 33–34: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ชื่อพินิตประสาธน์ตรงทะเบียน'),
('GS3-TT-UM-D',1,'quarter','CM','PY','หน้า 35–36: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; แผนผังสลับเลข 2/3 และระบุสนามเฮือนคำ; ตาราง/ระเบียบระบุ Golden Pagoda ให้ยืนยัน'),
('GS3-TT-UM-D',2,'quarter','PR','DK','หน้า 35–36: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; แผนผังสลับเลข 2/3 และระบุสนามเฮือนคำ; ตาราง/ระเบียบระบุ Golden Pagoda ให้ยืนยัน'),
('GS3-TT-UM-D',3,'semifinal','PS','CK','หน้า 35–36: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 3; แผนผังสลับเลข 2/3 และระบุสนามเฮือนคำ; ตาราง/ระเบียบระบุ Golden Pagoda ให้ยืนยัน'),
('GS3-TT-UM-D',4,'semifinal','1','2','หน้า 35–36: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); แผนผังสลับเลข 2/3 และระบุสนามเฮือนคำ; ตาราง/ระเบียบระบุ Golden Pagoda ให้ยืนยัน'),
('GS3-TT-UM-D',5,'final','3','4','หน้า 35–36: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); แผนผังสลับเลข 2/3 และระบุสนามเฮือนคำ; ตาราง/ระเบียบระบุ Golden Pagoda ให้ยืนยัน'),
('GS3-TT-UF-D',1,'quarter','CK','DJ','หน้า 37–38: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ตารางระบุหญิงเดี่ยวและชื่อพะเยาวิทยาคม; เสนอใช้หญิงคู่/พะเยาพิทยาคม ต้องยืนยันชื่อโรงเรียน'),
('GS3-TT-UF-D',2,'quarter','PR','PY','หน้า 37–38: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ตารางระบุหญิงเดี่ยวและชื่อพะเยาวิทยาคม; เสนอใช้หญิงคู่/พะเยาพิทยาคม ต้องยืนยันชื่อโรงเรียน'),
('GS3-TT-UF-D',3,'semifinal','DK','1','หน้า 37–38: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุหญิงเดี่ยวและชื่อพะเยาวิทยาคม; เสนอใช้หญิงคู่/พะเยาพิทยาคม ต้องยืนยันชื่อโรงเรียน'),
('GS3-TT-UF-D',4,'semifinal','CM','2','หน้า 37–38: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุหญิงเดี่ยวและชื่อพะเยาวิทยาคม; เสนอใช้หญิงคู่/พะเยาพิทยาคม ต้องยืนยันชื่อโรงเรียน'),
('GS3-TT-UF-D',5,'final','3','4','หน้า 37–38: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุหญิงเดี่ยวและชื่อพะเยาวิทยาคม; เสนอใช้หญิงคู่/พะเยาพิทยาคม ต้องยืนยันชื่อโรงเรียน'),
('GS3-TT-UX-X',1,'semifinal','CK','CM','หน้า 39–40: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 1; ตารางระบุหญิงคู่ 13 ปี และแผนผังระบุสนามเฮือนคำ ให้ยืนยัน'),
('GS3-TT-UX-X',2,'quarter','PR','PY','หน้า 39–40: ต้นฉบับ 2 ธ.ค. 09:00 โต๊ะ 2; ตารางระบุหญิงคู่ 13 ปี และแผนผังระบุสนามเฮือนคำ ให้ยืนยัน'),
('GS3-TT-UX-X',3,'semifinal','2','DK','หน้า 39–40: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุหญิงคู่ 13 ปี และแผนผังระบุสนามเฮือนคำ ให้ยืนยัน'),
('GS3-TT-UX-X',4,'final','1','3','หน้า 39–40: ต้นฉบับไม่ระบุเวลา (ตรวจโต๊ะจาก PDF); ตารางระบุหญิงคู่ 13 ปี และแผนผังระบุสนามเฮือนคำ ให้ยืนยัน')), resolved as (select s.*, coalesce(a.canonical,'ผู้ชนะคู่ที่ '||s.a) team_a,coalesce(b.canonical,'ผู้ชนะคู่ที่ '||s.b) team_b from seed s left join tt_school a on a.alias=s.a left join tt_school b on b.alias=s.b)
insert into public.sports_football_matches(competition_id,event_id,match_no,stage,team1_name,team2_name,scheduled_date,source_participants,tt_review_note)
select e.competition_id,e.id,s.match_no,s.stage,s.team_a,s.team_b,'2026-12-02'::date,s.team_a||' | '||s.team_b,s.note from resolved s join public.sports_events e on e.event_code=s.event_code and public.sports_is_tabletennis(e.id);
create or replace function public.sports_tt_slot(p_event uuid,p_source text) returns text language plpgsql stable security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype;
begin
 if p_source !~ '^ผู้ชนะคู่ที่ [0-9]+$' then
  if exists(select 1 from public.sports_football_group_teams where event_id=p_event and school_name=p_source) then return p_source; end if;
  return null;
 end if;
 select * into m from public.sports_football_matches where event_id=p_event and match_no=substring(p_source from '[0-9]+$')::int;
 if not found or m.status<>'completed' or m.score1 is null or m.score2 is null or m.score1=m.score2 then return null; end if;
 return case when m.score1>m.score2 then m.team1_name else m.team2_name end;
end $$;
revoke all on function public.sports_tt_slot(uuid,text) from public,anon,authenticated;
create or replace function public.sports_tt_expected(p_event uuid) returns int language sql stable security definer set search_path='' as $$
 select case event_code
 when 'GS3-TT-13M-S' then 7
 when 'GS3-TT-13F-S' then 6
 when 'GS3-TT-13M-D' then 5
 when 'GS3-TT-13F-D' then 4
 when 'GS3-TT-13X-X' then 5
 when 'GS3-TT-15M-S' then 7
 when 'GS3-TT-15F-S' then 4
 when 'GS3-TT-15M-D' then 5
 when 'GS3-TT-15F-D' then 3
 when 'GS3-TT-15X-X' then 3
 when 'GS3-TT-UM-S' then 6
 when 'GS3-TT-UF-S' then 6
 when 'GS3-TT-UM-D' then 5
 when 'GS3-TT-UF-D' then 5
 when 'GS3-TT-UX-X' then 4
 else 0 end from public.sports_events where id=p_event;
$$;
revoke all on function public.sports_tt_expected(uuid) from public,anon,authenticated;
create or replace function public.sports_tt_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype;
begin
 select * into strict e from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_tabletennis(p_event) or not public.sports_stage3_admin(e.competition_id) then raise exception 'ไม่มีสิทธิ์เผยแพร่' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if e.status='draft' or public.sports_award_is_published(p_event) then raise exception 'เปิดแสดงรายการก่อนเผยแพร่ หรือประกาศรางวัลแล้ว'; end if;
 if (select count(*) from public.sports_football_matches where event_id=p_event)<>public.sports_tt_expected(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and (not tt_reviewed or scheduled_date is null or start_time is null or tt_end_time is null or tt_end_time<=start_time or btrim(venue_name)='' or tt_best_of is null or tt_best_of not in (3,5,7))) then raise exception 'ตรวจวันเวลา โต๊ะ จำนวนเกม และข้อสังเกตให้ครบ'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on m.id<>n.id and n.competition_id=m.competition_id and n.scheduled_date=m.scheduled_date and n.venue_name=m.venue_name where m.event_id=p_event and public.sports_is_tabletennis(n.event_id) and n.status<>'cancelled' and m.start_time<n.tt_end_time and n.start_time<m.tt_end_time) then raise exception 'โต๊ะแข่งขันมีเวลาซ้อนกัน'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on n.event_id=m.event_id and (split_part(m.source_participants,' | ',1)='ผู้ชนะคู่ที่ '||n.match_no or split_part(m.source_participants,' | ',2)='ผู้ชนะคู่ที่ '||n.match_no) where m.event_id=p_event and n.scheduled_date+n.tt_end_time>m.scheduled_date+m.start_time) then raise exception 'คู่ถัดไปต้องเริ่มหลังคู่ต้นทาง'; end if;
 update public.sports_football_matches set status='published' where event_id=p_event and status='draft';
end $$;
revoke all on function public.sports_tt_publish(uuid) from public,anon;
grant execute on function public.sports_tt_publish(uuid) to authenticated;
create or replace function public.sports_tt_save(p_match uuid,p_expected timestamptz,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; ev uuid; comp uuid; a text; b text; x int; y int; aw int:=0; bw int:=0; need int; g jsonb; games jsonb; da date; st time; et time; venue text; best int;
begin
 select event_id,competition_id into strict ev,comp from public.sports_football_matches where id=p_match;
 if not public.sports_tabletennis_can_score(ev) then raise exception 'ไม่มีสิทธิ์บันทึกผลรายการนี้' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(comp::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev::text),94723);
 select * into strict m from public.sports_football_matches where id=p_match for update;
 if m.updated_at is distinct from p_expected then raise exception 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่'; end if;
 if public.sports_award_is_published(ev) then raise exception 'ประกาศรางวัลแล้ว'; end if;
 if m.status='draft' then
  if not public.sports_stage3_admin(comp) then raise exception 'เฉพาะผู้ดูแลแก้โปรแกรม'; end if;
  da:=(p_data->>'date')::date;st:=(p_data->>'time')::time;et:=(p_data->>'end')::time;best:=(p_data->>'best')::int;
  if da is null or da not between '2026-12-02'::date and '2026-12-03'::date or st is null or et is null or et<=st or best is null or best not in(3,5,7) or coalesce(p_data->>'table','') !~ '^[1-9][0-9]?$' or coalesce(p_data->>'venue','') not in ('golden','huen') then raise exception 'กรอกวัน เวลา โต๊ะ สถานที่ และจำนวนเกมให้ถูกต้อง'; end if;
  venue:=case when p_data->>'venue'='golden' then 'ห้องประชุม Golden Pagoda โรงเรียนเชียงคำวิทยาคม' else 'ห้องประชุมเฮือนคำ อาคาร 6 โรงเรียนพะเยาพิทยาคม' end||' โต๊ะ '||(p_data->>'table');
  if exists(select 1 from public.sports_football_matches n where n.id<>m.id and n.competition_id=comp and public.sports_is_tabletennis(n.event_id) and n.status<>'cancelled' and n.scheduled_date=da and n.venue_name=venue and st<n.tt_end_time and n.start_time<et) then raise exception 'โต๊ะมีเวลาซ้อนกัน'; end if;
  update public.sports_football_matches set scheduled_date=da,start_time=st,tt_end_time=et,venue_name=venue,tt_best_of=best,tt_reviewed=coalesce((p_data->>'reviewed')::boolean,false) where id=p_match;
  return;
 end if;
 if exists(select 1 from public.sports_events where id=ev and status='registration') then raise exception 'ปิดรับสมัครและยืนยันรายชื่อก่อนบันทึกผล'; end if;
 if m.status<>'published' or not m.tt_reviewed or m.tt_best_of is null or m.tt_best_of not in(3,5,7) then raise exception 'คู่ยังไม่พร้อมบันทึก หรือจบการแข่งขันแล้ว'; end if;
 a:=public.sports_tt_slot(ev,split_part(m.source_participants,' | ',1));b:=public.sports_tt_slot(ev,split_part(m.source_participants,' | ',2));
 if a is null or b is null or a=b then raise exception 'ยังไม่ทราบคู่แข่งขัน'; end if;
 -- One approved entry per school/event is required; no award or score based on ambiguous rosters.
 if exists(select 1 from unnest(array[a,b]) as participant(school_name) where (select count(*) from public.sports_entries en join public.sports_schools s on s.id=en.school_id where en.event_id=ev and en.status='approved' and s.name=participant.school_name and (select count(*) from public.sports_athletes sa where sa.entry_id=en.id)=(select case when event_code like '%-S' then 1 else 2 end from public.sports_events where id=ev))<>1) then raise exception 'ต้องมีใบสมัครที่อนุมัติแล้วเพียงหนึ่งใบต่อโรงเรียนในรายการนี้'; end if;
 need:=(m.tt_best_of+1)/2;games:=p_data->'games';
 if games is null or jsonb_typeof(games)<>'array' or jsonb_array_length(games) not between need and m.tt_best_of then raise exception 'จำนวนเกมไม่ถูกต้อง'; end if;
 for g in select value from jsonb_array_elements(games) loop
  if aw=need or bw=need or jsonb_typeof(g)<>'array' or jsonb_array_length(g)<>2 or coalesce(g->>0,'') !~ '^[0-9]{1,3}$' or coalesce(g->>1,'') !~ '^[0-9]{1,3}$' then raise exception 'คะแนนเกมไม่ถูกต้องหรือแข่งครบแล้ว'; end if;
  x:=(g->>0)::int;y:=(g->>1)::int;
  if greatest(x,y)<>greatest(11,least(x,y)+2) then raise exception 'เกมต้องชนะที่ 11 แต้ม หรือห่าง 2 แต้มเมื่อดิวซ์'; end if;
  if x>y then aw:=aw+1;else bw:=bw+1;end if;
 end loop;
 if aw<>need and bw<>need then raise exception 'ยังไม่มีผู้ชนะครบจำนวนเกม'; end if;
 update public.sports_football_matches set team1_name=a,team2_name=b,score1=aw,score2=bw,penalty1=null,penalty2=null,tt_games=games,status='completed' where id=p_match;
 update public.sports_football_matches n set team1_name=coalesce(public.sports_tt_slot(ev,split_part(n.source_participants,' | ',1)),split_part(n.source_participants,' | ',1)),team2_name=coalesce(public.sports_tt_slot(ev,split_part(n.source_participants,' | ',2)),split_part(n.source_participants,' | ',2)) where n.event_id=ev and n.status<>'completed' and (split_part(n.source_participants,' | ',1)='ผู้ชนะคู่ที่ '||m.match_no or split_part(n.source_participants,' | ',2)='ผู้ชนะคู่ที่ '||m.match_no);
end $$;
revoke all on function public.sports_tt_save(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.sports_tt_save(uuid,timestamptz,jsonb) to authenticated;
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
 if public.sports_is_petanque(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 3 and 4 then raise exception 'เปตอง: นักกีฬา 3 คน สำรองได้ 1 คน'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
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
 if public.sports_is_tabletennis(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262644);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if e.status<>'registration' or public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เทเบิลเทนนิสปิดลงทะเบียนหรือเริ่มแข่งแล้ว'; end if;
  if n<>(case when e.event_code like '%-S' then 1 else 2 end) or p_coaches is null or jsonb_array_length(p_coaches)>3 then raise exception 'ตรวจจำนวนผู้เล่นเดี่ยว/คู่ และเจ้าหน้าที่ไม่เกิน 3 คน'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขัน'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'มีใบสมัครรายการนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อผู้เล่นซ้ำในคู่'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a where (select count(distinct en.event_id) from public.sports_athletes sa join public.sports_entries en on en.id=sa.entry_id join public.sports_events oe on oe.id=en.event_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_tabletennis(en.event_id) and oe.level_rule=e.level_rule and ((nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g')))>=2) then raise exception 'นักกีฬาลงได้ไม่เกิน 2 รายการในรุ่นเดียวกัน'; end if;
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
 if public.sports_is_petanque(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye and status='completed' and petanque_reviewed)<>public.sports_petanque_expected(p_event) then raise exception 'เปตองยังแข่งขันไม่ครบ'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเปตอง'; end if;
 end if;
 if public.sports_is_tabletennis(p_event) then
  if (select count(distinct en.school_id) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id)<>4 then raise exception 'อันดับเทเบิลเทนนิสต้องเป็นผู้เข้าแข่งขัน 4 รายที่แตกต่างกันตามสาย'; end if;
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and tt_reviewed)<>public.sports_tt_expected(p_event) then raise exception 'เทเบิลเทนนิสยังแข่งขันไม่ครบ'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเทเบิลเทนนิส'; end if;
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
 if v_event.event_type <> 'team' and not public.sports_is_tabletennis(p_event) then return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if public.sports_is_volleyball(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and volleyball_reviewed)<>public.sports_volleyball_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_petanque(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye and status='completed' and petanque_reviewed)<>public.sports_petanque_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_tabletennis(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and tt_reviewed)<>public.sports_tt_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
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



do $$ begin
 if (select count(*) from public.sports_football_matches where public.sports_is_tabletennis(event_id))<>75 then raise exception 'คู่เทเบิลเทนนิสไม่ครบ';end if;
end $$;
commit;
notify pgrst, 'reload schema';
