-- v33.28 Petanque. Requires 043. All fixtures draft; no deletes.
begin;
create temporary table pt_school(alias text primary key,label text not null,canonical text) on commit drop;
insert into pt_school(alias,label) values
('DJ','ดงเจนวิทยาคม'),
('KK','ขุนควรวิทยาคม'),
('PR','ปงรัชดาภิเษก'),
('TP','ถ้ำปินวิทยาคม'),
('DK','ดอกคำใต้วิทยาคม'),
('MU','สาธิตมหาวิทยาลัยพะเยา'),
('PY','พะเยาพิทยาคม'),
('CK','เชียงคำวิทยาคม'),
('FK','ฝายกวางวิทยาคม'),
('RP','ราชประชานุเคราะห์ 24'),
('CG','เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์พะเยา'),
('PS','ภูซางวิทยาคม'),
('JU','จุนวิทยาคม'),
('PL','พญาลอวิทยาคม'),
('PN','พินิตประสาธน์'),
('FG','ฟากกว๊านวิทยาคม'),
('PP','พะเยาประสาธน์วิทย์');
update pt_school a set canonical=(select case when count(*)=1 then min(s.name) end from public.sports_schools s where regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(a.label,'[[:space:]]+','','g'));
do $$ begin
 if to_regprocedure('public.sports_is_takraw(uuid)') is null then raise exception 'ติดตั้ง Migration 043 ก่อน'; end if;
 if exists(select 1 from pt_school where canonical is null) then raise exception 'จับคู่โรงเรียนไม่ได้หรือซ้ำ: %',(select string_agg(label,', ') from pt_school where canonical is null); end if;
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-PT-15M','GS3-PT-15F','GS3-PT-UM','GS3-PT-UF'))<>4 then raise exception 'ไม่พบเปตองครบ 4 รุ่น'; end if;
 if exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-PT-15M','GS3-PT-15F','GS3-PT-UM','GS3-PT-UF') and (exists(select 1 from public.sports_matches m where m.event_id=e.id) or exists(select 1 from public.sports_football_matches m where m.event_id=e.id) or exists(select 1 from public.sports_football_group_teams t where t.event_id=e.id))) then raise exception 'พบข้อมูลเปตองเดิม หยุดเพื่อป้องกันข้อมูลซ้ำ'; end if;
end $$;
create or replace function public.sports_is_petanque(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and e.event_code in ('GS3-PT-15F','GS3-PT-UF','GS3-PT-15M','GS3-PT-UM') and c.slug='phayao-secondary-group-sports-2569');
$$;
revoke all on function public.sports_is_petanque(uuid) from public,anon;
grant execute on function public.sports_is_petanque(uuid) to authenticated;
drop policy if exists "petanque matches RPC only" on public.sports_football_matches;
create policy "petanque matches RPC only" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_petanque(event_id)) with check(not public.sports_is_petanque(event_id));
drop policy if exists "petanque group guard" on public.sports_football_group_teams;
create policy "petanque group guard" on public.sports_football_group_teams as restrictive for update to authenticated using(not public.sports_is_petanque(event_id)) with check(not public.sports_is_petanque(event_id));
create or replace function public.sports_petanque_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_petanque(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_petanque_can_score(uuid) from public,anon;
grant execute on function public.sports_petanque_can_score(uuid) to authenticated;
drop policy if exists "petanque specialist insert guard" on public.sports_matches;
create policy "petanque specialist insert guard" on public.sports_matches as restrictive for insert to authenticated with check (not public.sports_is_petanque(event_id));
drop policy if exists "petanque specialist update guard" on public.sports_matches;
create policy "petanque specialist update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_petanque(event_id)) with check(not public.sports_is_petanque(event_id));


drop policy if exists "petanque matches insert guard" on public.sports_football_matches;
create policy "petanque matches insert guard" on public.sports_football_matches as restrictive for insert to authenticated with check(not public.sports_is_petanque(event_id));
drop policy if exists "petanque matches delete guard" on public.sports_football_matches;
create policy "petanque matches delete guard" on public.sports_football_matches as restrictive for delete to authenticated using(not public.sports_is_petanque(event_id));

drop policy if exists "petanque groups insert guard" on public.sports_football_group_teams;
create policy "petanque groups insert guard" on public.sports_football_group_teams as restrictive for insert to authenticated with check(not public.sports_is_petanque(event_id));
drop policy if exists "petanque groups delete guard" on public.sports_football_group_teams;
create policy "petanque groups delete guard" on public.sports_football_group_teams as restrictive for delete to authenticated using(not public.sports_is_petanque(event_id));
alter table public.sports_football_matches add column if not exists petanque_phase int;
alter table public.sports_football_matches add column if not exists petanque_bye boolean not null default false;
alter table public.sports_football_matches add column if not exists petanque_review_note text not null default '';
alter table public.sports_football_matches add column if not exists petanque_reviewed boolean not null default true;
alter table public.sports_football_matches add column if not exists petanque_reason text;
update public.sports_events set max_athletes_per_entry=4,venue_name='สนามเปตองโรงเรียนบ้านแดนเมือง',updated_at=now() where public.sports_is_petanque(id);
with seed(event_code,group_code,seed_order,alias) as (values
('GS3-PT-UM','A',1,'DJ'),
('GS3-PT-UM','A',2,'KK'),
('GS3-PT-UM','A',3,'PR'),
('GS3-PT-UM','B',1,'TP'),
('GS3-PT-UM','B',2,'DK'),
('GS3-PT-UM','B',3,'MU'),
('GS3-PT-UM','B',4,'PY'),
('GS3-PT-UM','C',1,'CK'),
('GS3-PT-UM','C',2,'FK'),
('GS3-PT-UM','C',3,'RP'),
('GS3-PT-UM','C',4,'CG'),
('GS3-PT-UM','D',1,'PS'),
('GS3-PT-UM','D',2,'JU'),
('GS3-PT-UM','D',3,'PL'),
('GS3-PT-UF','A',1,'JU'),
('GS3-PT-UF','A',2,'PN'),
('GS3-PT-UF','A',3,'FK'),
('GS3-PT-UF','A',4,'DK'),
('GS3-PT-UF','B',1,'KK'),
('GS3-PT-UF','B',2,'PR'),
('GS3-PT-UF','B',3,'PL'),
('GS3-PT-UF','B',4,'RP'),
('GS3-PT-UF','C',1,'MU'),
('GS3-PT-UF','C',2,'PY'),
('GS3-PT-UF','C',3,'CG'),
('GS3-PT-UF','D',1,'CK'),
('GS3-PT-UF','D',2,'TP'),
('GS3-PT-UF','D',3,'PS'),
('GS3-PT-UF','D',4,'DJ'),
('GS3-PT-15M','A',1,'KK'),
('GS3-PT-15M','A',2,'CG'),
('GS3-PT-15M','A',3,'CK'),
('GS3-PT-15M','B',1,'DJ'),
('GS3-PT-15M','B',2,'RP'),
('GS3-PT-15M','B',3,'TP'),
('GS3-PT-15M','B',4,'FG'),
('GS3-PT-15M','C',1,'PS'),
('GS3-PT-15M','C',2,'PR'),
('GS3-PT-15M','C',3,'PL'),
('GS3-PT-15M','C',4,'PY'),
('GS3-PT-15M','D',1,'JU'),
('GS3-PT-15M','D',2,'FK'),
('GS3-PT-15M','D',3,'DK'),
('GS3-PT-15F','A',1,'DK'),
('GS3-PT-15F','A',2,'CK'),
('GS3-PT-15F','A',3,'KK'),
('GS3-PT-15F','A',4,'PL'),
('GS3-PT-15F','B',1,'TP'),
('GS3-PT-15F','B',2,'JU'),
('GS3-PT-15F','B',3,'FK'),
('GS3-PT-15F','B',4,'PP'),
('GS3-PT-15F','C',1,'DJ'),
('GS3-PT-15F','C',2,'PY'),
('GS3-PT-15F','C',3,'RP'),
('GS3-PT-15F','D',1,'PS'),
('GS3-PT-15F','D',2,'PR'),
('GS3-PT-15F','D',3,'PN'),
('GS3-PT-15F','D',4,'CG') ) insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,s.group_code,s.seed_order,n.canonical from seed s join pt_school n on n.alias=s.alias join public.sports_events e on e.event_code=s.event_code and public.sports_is_petanque(e.id);
with seed(event_code,match_no,group_code,phase,a,b,court,review_note,day) as (values
('GS3-PT-UM',1,'A',1,'DJ','KK',1,'','2026-12-03'),
('GS3-PT-UM',2,'A',1,'PR','X',1,'','2026-12-03'),
('GS3-PT-UM',3,'B',1,'TP','DK',2,'','2026-12-03'),
('GS3-PT-UM',4,'B',1,'MU','PY',3,'','2026-12-03'),
('GS3-PT-UM',5,'C',1,'CK','FK',4,'','2026-12-03'),
('GS3-PT-UM',6,'C',1,'RP','CG',5,'','2026-12-03'),
('GS3-PT-UM',7,'D',1,'PS','JU',6,'','2026-12-03'),
('GS3-PT-UM',8,'D',1,'PL','X',6,'','2026-12-03'),
('GS3-PT-UM',9,'A',2,'W1','W2',1,'','2026-12-03'),
('GS3-PT-UM',10,'B',2,'W3','W4',2,'','2026-12-03'),
('GS3-PT-UM',11,'C',2,'W5','W6',4,'','2026-12-03'),
('GS3-PT-UM',12,'D',2,'W7','W8',6,'','2026-12-03'),
('GS3-PT-UM',13,'A',3,'L1','L9',1,'','2026-12-03'),
('GS3-PT-UM',14,'B',3,'W24','L10',3,'ต้นฉบับ L3; เสนอผู้ชนะคู่แพ้พบแพ้ 24','2026-12-03'),
('GS3-PT-UM',15,'C',3,'W25','L11',5,'ต้นฉบับ L5; เสนอผู้ชนะคู่แพ้พบแพ้ 25','2026-12-03'),
('GS3-PT-UM',16,'D',3,'L7','L12',6,'ต้นฉบับ W12; ต้องเป็น L12','2026-12-03'),
('GS3-PT-UM',17,NULL,4,'W9','W15',1,'','2026-12-03'),
('GS3-PT-UM',18,NULL,4,'W13','W11',2,'','2026-12-03'),
('GS3-PT-UM',19,NULL,4,'W10','W16',3,'','2026-12-03'),
('GS3-PT-UM',20,NULL,4,'W14','W12',4,'','2026-12-03'),
('GS3-PT-UM',21,NULL,5,'W17','W18',2,'','2026-12-03'),
('GS3-PT-UM',22,NULL,5,'W19','W20',4,'','2026-12-03'),
('GS3-PT-UM',23,NULL,6,'W21','W22',1,'','2026-12-03'),
('GS3-PT-UM',24,'B',2,'L3','L4',NULL,'เพิ่มคู่แพ้พบแพ้ที่ขาดตามระเบียบ','2026-12-03'),
('GS3-PT-UM',25,'C',2,'L5','L6',NULL,'เพิ่มคู่แพ้พบแพ้ที่ขาดตามระเบียบ','2026-12-03'),
('GS3-PT-UF',1,'A',1,'JU','PN',7,'','2026-12-03'),
('GS3-PT-UF',2,'A',1,'FK','DK',8,'','2026-12-03'),
('GS3-PT-UF',3,'B',1,'KK','PR',9,'','2026-12-03'),
('GS3-PT-UF',4,'B',1,'PL','RP',10,'','2026-12-03'),
('GS3-PT-UF',5,'C',1,'MU','PY',11,'','2026-12-03'),
('GS3-PT-UF',6,'C',1,'CG','X',11,'','2026-12-03'),
('GS3-PT-UF',7,'D',1,'CK','TP',12,'','2026-12-03'),
('GS3-PT-UF',8,'D',1,'PS','DJ',13,'','2026-12-03'),
('GS3-PT-UF',9,'A',2,'W1','W2',NULL,'','2026-12-03'),
('GS3-PT-UF',10,'A',2,'L1','L2',NULL,'','2026-12-03'),
('GS3-PT-UF',11,'B',2,'W3','W4',NULL,'','2026-12-03'),
('GS3-PT-UF',12,'B',2,'L3','L4',NULL,'','2026-12-03'),
('GS3-PT-UF',13,'C',2,'W5','W6',NULL,'','2026-12-03'),
('GS3-PT-UF',14,'D',2,'W7','W8',NULL,'','2026-12-03'),
('GS3-PT-UF',15,'D',2,'L7','L8',NULL,'','2026-12-03'),
('GS3-PT-UF',16,'A',3,'L9','W10',NULL,'','2026-12-03'),
('GS3-PT-UF',17,'B',3,'L11','W12',NULL,'','2026-12-03'),
('GS3-PT-UF',18,'C',3,'L13','L5',NULL,'ต้นฉบับ W14 ข้ามสาย; เสนอ L5','2026-12-03'),
('GS3-PT-UF',19,'D',3,'L14','W15',NULL,'ต้นฉบับ L15/W16 ข้ามสาย; เสนอ L14/W15','2026-12-03'),
('GS3-PT-UF',21,NULL,4,'W9','W18',5,'','2026-12-03'),
('GS3-PT-UF',22,NULL,4,'W16','W13',6,'','2026-12-03'),
('GS3-PT-UF',23,NULL,4,'W11','W19',7,'','2026-12-03'),
('GS3-PT-UF',24,NULL,4,'W17','W14',8,'','2026-12-03'),
('GS3-PT-UF',25,NULL,5,'W21','W23',1,'คงสายตามตารางหน้า 4; ยืนยันต่างจากระเบียบ fixed bracket','2026-12-03'),
('GS3-PT-UF',26,NULL,5,'W22','W24',3,'คงสายตามตารางหน้า 4; ยืนยันต่างจากระเบียบ fixed bracket','2026-12-03'),
('GS3-PT-UF',27,NULL,6,'W25','W26',2,'','2026-12-03'),
('GS3-PT-15M',1,'A',1,'KK','CG',1,'','2026-12-04'),
('GS3-PT-15M',2,'A',1,'CK','X',1,'','2026-12-04'),
('GS3-PT-15M',3,'B',1,'DJ','RP',2,'','2026-12-04'),
('GS3-PT-15M',4,'B',1,'TP','FG',3,'','2026-12-04'),
('GS3-PT-15M',5,'C',1,'PS','PR',4,'','2026-12-04'),
('GS3-PT-15M',6,'C',1,'PL','PY',5,'','2026-12-04'),
('GS3-PT-15M',7,'D',1,'JU','FK',6,'','2026-12-04'),
('GS3-PT-15M',8,'D',1,'DK','X',6,'','2026-12-04'),
('GS3-PT-15M',9,'A',2,'W1','W2',1,'','2026-12-04'),
('GS3-PT-15M',10,'B',2,'W3','W4',2,'','2026-12-04'),
('GS3-PT-15M',11,'B',2,'L3','L4',3,'','2026-12-04'),
('GS3-PT-15M',12,'C',2,'W5','W6',4,'','2026-12-04'),
('GS3-PT-15M',13,'D',2,'W7','W8',6,'','2026-12-04'),
('GS3-PT-15M',14,'A',3,'L9','L1',1,'ต้นฉบับ L9/X; ต้องพบ L1','2026-12-04'),
('GS3-PT-15M',15,'B',3,'L10','W11',2,'','2026-12-04'),
('GS3-PT-15M',16,'C',3,'L12','W25',4,'ต้นฉบับ W13 ข้ามสาย; เสนอ W25','2026-12-04'),
('GS3-PT-15M',17,'D',3,'L13','L7',6,'ต้นฉบับ L14/X ข้ามสาย; เสนอ L13/L7','2026-12-04'),
('GS3-PT-15M',18,NULL,4,'W9','W16',1,'','2026-12-04'),
('GS3-PT-15M',19,NULL,4,'W14','W12',2,'','2026-12-04'),
('GS3-PT-15M',20,NULL,4,'W10','W17',3,'','2026-12-04'),
('GS3-PT-15M',21,NULL,4,'W15','W13',4,'','2026-12-04'),
('GS3-PT-15M',22,NULL,5,'W18','W19',2,'ต้นฉบับ W17/W18; เสนอ W18/W19','2026-12-04'),
('GS3-PT-15M',23,NULL,5,'W20','W21',4,'ต้นฉบับ W19/W20; เสนอ W20/W21','2026-12-04'),
('GS3-PT-15M',24,NULL,6,'W22','W23',1,'ต้นฉบับ W21/W22; เสนอ W22/W23','2026-12-04'),
('GS3-PT-15M',25,'C',2,'L5','L6',NULL,'เพิ่มคู่แพ้พบแพ้ที่ขาดตามระเบียบ','2026-12-04'),
('GS3-PT-15F',1,'A',1,'DK','CK',NULL,'','2026-12-04'),
('GS3-PT-15F',2,'A',1,'KK','PL',NULL,'','2026-12-04'),
('GS3-PT-15F',3,'B',1,'TP','JU',NULL,'','2026-12-04'),
('GS3-PT-15F',4,'B',1,'FK','PP',NULL,'','2026-12-04'),
('GS3-PT-15F',5,'C',1,'DJ','PY',NULL,'','2026-12-04'),
('GS3-PT-15F',6,'C',1,'RP','X',NULL,'','2026-12-04'),
('GS3-PT-15F',7,'D',1,'PS','PR',NULL,'','2026-12-04'),
('GS3-PT-15F',8,'D',1,'PN','CG',NULL,'','2026-12-04'),
('GS3-PT-15F',9,'A',2,'W1','W2',NULL,'','2026-12-04'),
('GS3-PT-15F',10,'A',2,'L1','L2',NULL,'','2026-12-04'),
('GS3-PT-15F',11,'B',2,'W3','W4',NULL,'','2026-12-04'),
('GS3-PT-15F',12,'B',2,'L3','L4',NULL,'','2026-12-04'),
('GS3-PT-15F',13,'C',2,'W5','W6',NULL,'','2026-12-04'),
('GS3-PT-15F',14,'C',2,'L5','X',NULL,'','2026-12-04'),
('GS3-PT-15F',15,'D',2,'W7','W8',NULL,'','2026-12-04'),
('GS3-PT-15F',16,'D',2,'L7','L8',NULL,'','2026-12-04'),
('GS3-PT-15F',17,'A',3,'L9','W10',NULL,'','2026-12-04'),
('GS3-PT-15F',18,'B',3,'L11','W12',NULL,'','2026-12-04'),
('GS3-PT-15F',19,'C',3,'L13','W14',NULL,'','2026-12-04'),
('GS3-PT-15F',20,'D',3,'L15','W16',NULL,'','2026-12-04'),
('GS3-PT-15F',21,NULL,4,'W9','W19',5,'','2026-12-04'),
('GS3-PT-15F',22,NULL,4,'W17','W13',6,'','2026-12-04'),
('GS3-PT-15F',23,NULL,4,'W11','W20',7,'','2026-12-04'),
('GS3-PT-15F',24,NULL,4,'W18','W15',8,'','2026-12-04'),
('GS3-PT-15F',25,NULL,5,'W21','W24',1,'คงสายตามตารางหน้า 8; ยืนยันต่างจากระเบียบ fixed bracket','2026-12-04'),
('GS3-PT-15F',26,NULL,5,'W22','W23',2,'คงสายตามตารางหน้า 8; ยืนยันต่างจากระเบียบ fixed bracket','2026-12-04'),
('GS3-PT-15F',27,NULL,6,'W25','W26',3,'','2026-12-04') ), resolved as (select s.*,coalesce(a.canonical,case when s.a='X' then 'X' when left(s.a,1)='W' then 'ผู้ชนะคู่ที่ '||substring(s.a from 2) else 'ผู้แพ้คู่ที่ '||substring(s.a from 2) end) team_a,coalesce(b.canonical,case when s.b='X' then 'X' when left(s.b,1)='W' then 'ผู้ชนะคู่ที่ '||substring(s.b from 2) else 'ผู้แพ้คู่ที่ '||substring(s.b from 2) end) team_b from seed s left join pt_school a on a.alias=s.a left join pt_school b on b.alias=s.b)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,stage,group_code,team1_name,team2_name,venue_name,source_participants,petanque_phase,petanque_bye,petanque_review_note,petanque_reviewed)
select e.competition_id,e.id,s.match_no,s.day::date,case s.phase when 4 then 'quarter' when 5 then 'semifinal' when 6 then 'final' else 'group' end,s.group_code,s.team_a,s.team_b,case when s.court is not null then 'สนามเปตองโรงเรียนบ้านแดนเมือง สนาม '||s.court else '' end,s.team_a||' | '||s.team_b,s.phase,s.b='X',s.review_note,s.review_note='' from resolved s join public.sports_events e on e.event_code=s.event_code and public.sports_is_petanque(e.id);
-- Source slots are immutable. BYE never receives invented scores.
create or replace function public.sports_petanque_slot(p_event uuid,p_source text) returns text language plpgsql stable security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; a text; b text; want_win boolean;
begin
 if p_source='X' then return 'X'; end if;
 if p_source !~ '^ผู้(ชนะ|แพ้)คู่ที่ [0-9]+$' then
  if exists(select 1 from public.sports_football_group_teams where event_id=p_event and school_name=p_source) then return p_source; end if;
  return null;
 end if;
 want_win:=p_source like 'ผู้ชนะ%';
 select * into m from public.sports_football_matches where event_id=p_event and match_no=substring(p_source from '[0-9]+$')::int;
 if not found then return null; end if;
 if m.petanque_bye then
  if not want_win then return null; end if;
  return public.sports_petanque_slot(p_event,split_part(m.source_participants,' | ',1));
 end if;
 if m.status<>'completed' or m.score1 is null or m.score2 is null or m.score1=m.score2 then return null; end if;
 a:=m.team1_name;b:=m.team2_name;
 if (m.score1>m.score2)=want_win then return a; else return b; end if;
end $$;
revoke all on function public.sports_petanque_slot(uuid,text) from public,anon,authenticated;
create or replace function public.sports_petanque_sync(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; a text; b text;
begin
 for m in select * from public.sports_football_matches where event_id=p_event and status<>'completed' order by petanque_phase,match_no loop
  a:=coalesce(public.sports_petanque_slot(p_event,split_part(m.source_participants,' | ',1)),split_part(m.source_participants,' | ',1));
  b:=coalesce(public.sports_petanque_slot(p_event,split_part(m.source_participants,' | ',2)),split_part(m.source_participants,' | ',2));
  if a is distinct from m.team1_name or b is distinct from m.team2_name then
   update public.sports_football_matches set team1_name=a,team2_name=b where id=m.id;
  end if;
 end loop;
end $$;
revoke all on function public.sports_petanque_sync(uuid) from public,anon,authenticated;
create or replace function public.sports_petanque_expected(p_event uuid) returns int language sql stable security definer set search_path='' as $$
 select case when event_code in ('GS3-PT-15M','GS3-PT-UM') then 23 when event_code in ('GS3-PT-15F','GS3-PT-UF') then 25 else 0 end from public.sports_events where id=p_event
$$;
revoke all on function public.sports_petanque_expected(uuid) from public,anon,authenticated;
create or replace function public.sports_petanque_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype;
begin
 select * into strict e from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_petanque(p_event) or not public.sports_stage3_admin(e.competition_id) then raise exception 'ไม่มีสิทธิ์เผยแพร่' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if e.status='draft' or public.sports_award_is_published(p_event) then raise exception 'เปิดแสดงรายการก่อนเผยแพร่ หรือรายการประกาศรางวัลแล้ว'; end if;
 if (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye)<>public.sports_petanque_expected(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and (not petanque_reviewed or (not petanque_bye and (scheduled_date is null or start_time is null or btrim(venue_name)='')))) then raise exception 'กรุณากำหนดสนาม เวลา และยืนยันข้อสังเกตให้ครบ'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on m.id<>n.id and n.competition_id=m.competition_id and n.scheduled_date=m.scheduled_date and n.venue_name=m.venue_name where m.event_id=p_event and public.sports_is_petanque(n.event_id) and not m.petanque_bye and not n.petanque_bye and n.status<>'cancelled' and m.start_time is not null and n.start_time is not null and m.scheduled_date+m.start_time < n.scheduled_date+n.start_time+make_interval(mins=>case when n.stage='group' then 50 else 60 end) and n.scheduled_date+n.start_time < m.scheduled_date+m.start_time+make_interval(mins=>case when m.stage='group' then 50 else 60 end)) then raise exception 'พบเวลาแข่งขันซ้อนกันในสนามเดียวกัน'; end if;
 if exists(select 1 from public.sports_football_matches m join public.sports_football_matches n on n.event_id=m.event_id and n.petanque_phase<m.petanque_phase and (m.stage<>'group' or m.group_code=n.group_code) where m.event_id=p_event and not m.petanque_bye and not n.petanque_bye and n.scheduled_date+n.start_time+make_interval(mins=>case when n.stage='group' then 50 else 60 end)>m.scheduled_date+m.start_time) then raise exception 'เวลาแข่งขันรอบถัดไปต้องอยู่หลังรอบก่อนหน้า (สายเดียวกันในรอบแรก)'; end if;
 perform public.sports_petanque_sync(p_event);
 update public.sports_football_matches set status=case when petanque_bye then 'cancelled' else 'published' end where event_id=p_event and status='draft';
end $$;
revoke all on function public.sports_petanque_publish(uuid) from public,anon;
grant execute on function public.sports_petanque_publish(uuid) to authenticated;
create or replace function public.sports_petanque_save(p_match uuid,p_expected timestamptz,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare m public.sports_football_matches%rowtype; ev uuid; comp uuid; a text; b text; x int; y int; target int; reason text; note text;
begin
 select event_id,competition_id into strict ev,comp from public.sports_football_matches where id=p_match;
 if not public.sports_petanque_can_score(ev) then raise exception 'ไม่มีสิทธิ์บันทึกผลเปตองรายการนี้' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(comp::text),252541);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev::text),94723);
 select * into strict m from public.sports_football_matches where id=p_match for update;
 if m.updated_at is distinct from p_expected then raise exception 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่'; end if;
 if public.sports_award_is_published(ev) then raise exception 'ประกาศอันดับแล้ว ต้องตรวจแก้ไขผลรางวัลก่อน'; end if;
 if m.status='draft' then
  if not public.sports_stage3_admin(comp) then raise exception 'เฉพาะผู้ดูแลแก้โปรแกรม'; end if;
  if not m.petanque_bye and coalesce(p_data->>'court','') !~ '^([1-9]|1[0-3])$' then raise exception 'กรุณาเลือกสนาม 1–13'; end if;
  update public.sports_football_matches set scheduled_date=coalesce(nullif(p_data->>'date','')::date,m.scheduled_date),start_time=case when m.petanque_bye then null else nullif(p_data->>'time','')::time end,venue_name=case when m.petanque_bye then m.venue_name else 'สนามเปตองโรงเรียนบ้านแดนเมือง สนาม '||(p_data->>'court') end,petanque_reviewed=coalesce((p_data->>'reviewed')::boolean,false) where id=p_match;
  return;
 end if;
 if m.status<>'published' or m.petanque_bye then raise exception 'บันทึกได้เฉพาะคู่จริงที่เผยแพร่และยังไม่จบการแข่งขัน'; end if;
 if not m.petanque_reviewed then raise exception 'โปรแกรมยังไม่ยืนยัน'; end if;
 a:=public.sports_petanque_slot(ev,split_part(m.source_participants,' | ',1)); b:=public.sports_petanque_slot(ev,split_part(m.source_participants,' | ',2));
 if a is null or b is null or a=b or a='X' or b='X' then raise exception 'ยังไม่ทราบทีมทั้งสองจากผลคู่ก่อนหน้า'; end if;
 if coalesce(p_data->>'a','') !~ '^[0-9]{1,2}$' or coalesce(p_data->>'b','') !~ '^[0-9]{1,2}$' then raise exception 'กรอกคะแนนเป็นจำนวนเต็ม'; end if;
 x:=(p_data->>'a')::int;y:=(p_data->>'b')::int;target:=case when m.stage='group' then 11 else 13 end;
 reason:=p_data->>'reason';note:=btrim(coalesce(p_data->>'notes',''));
 if reason is null or reason not in ('target','time','extra','forfeit') or x=y or greatest(x,y)>target then raise exception 'ผลคะแนนไม่ถูกต้อง'; end if;
 if reason='target' and greatest(x,y)<>target then raise exception 'คะแนนผู้ชนะต้องถึงเป้าหมาย'; end if;
 if reason in ('time','extra') and m.stage<>'group' and note='' then raise exception 'รอบน็อกเอาต์คะแนนไม่ถึง 13 ต้องระบุการยืนยันของผู้จัด'; end if;
 if reason in ('extra','forfeit') and note='' then raise exception 'กรุณาระบุเหตุผล/ผลเที่ยวตัดสิน'; end if;
 update public.sports_football_matches set team1_name=a,team2_name=b,status='completed',score1=x,score2=y,penalty1=null,penalty2=null,petanque_reason=reason,notes=left(note,500) where id=p_match;
 perform public.sports_petanque_sync(ev);
end $$;
revoke all on function public.sports_petanque_save(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.sports_petanque_save(uuid,timestamptz,jsonb) to authenticated;
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
 if public.sports_is_petanque(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye and status='completed' and petanque_reviewed)<>public.sports_petanque_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
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
 if (select count(*) from public.sports_football_matches where public.sports_is_petanque(event_id))<>103 or (select count(*) from public.sports_football_matches where public.sports_is_petanque(event_id) and not petanque_bye)<>96 then raise exception 'จำนวนคู่เปตองไม่ครบ'; end if;
end $$;
commit;
notify pgrst, 'reload schema';
