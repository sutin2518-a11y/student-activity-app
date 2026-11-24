-- v33.31.1: authorized replacement of old TEST athletics schedule; item 109 final.
-- Apply after 046, ONLY if 047 has not succeeded. Backup first. No deletion of registrations.
begin;
create temporary table _ath_seed(no int primary key,code text,label text,day date,report time,starts time,round_name text,kind text) on commit drop;
insert into _ath_seed values
(101,'GS3-AT-001','กระโดดไกล ไม่จำกัดอายุ ชาย','2026-12-09','08:30','09:00','ชิงชนะเลิศ','field'),
(102,'GS3-AT-002','ทุ่มน้ำหนัก ไม่จำกัดอายุ หญิง','2026-12-09','08:30','09:00','ชิงชนะเลิศ','field'),
(103,'GS3-AT-003','วิ่ง 1,500 เมตร ไม่เกิน 15 ปี หญิง','2026-12-09','08:30','09:00','ชิงชนะเลิศ','track'),
(104,'GS3-AT-004','วิ่ง 1,500 เมตร ไม่เกิน 15 ปี ชาย','2026-12-09','08:40','09:10','ชิงชนะเลิศ','track'),
(105,'GS3-AT-005','วิ่ง 1,500 เมตร ไม่จำกัดอายุ หญิง','2026-12-09','08:50','09:20','ชิงชนะเลิศ','track'),
(106,'GS3-AT-006','วิ่ง 1,500 เมตร ไม่จำกัดอายุ ชาย','2026-12-09','09:00','09:30','ชิงชนะเลิศ','track'),
(107,'GS3-AT-007','วิ่ง 600 เมตร ไม่เกิน 13 ปี หญิง','2026-12-09','09:10','09:40','ชิงชนะเลิศ','track'),
(108,'GS3-AT-008','วิ่ง 600 เมตร ไม่เกิน 13 ปี ชาย','2026-12-09','09:20','09:50','ชิงชนะเลิศ','track'),
(109,'GS3-AT-009','กระโดดไกล ไม่เกิน 13 ปี ชาย','2026-12-09','09:30','10:00','ชิงชนะเลิศ','field'),
(110,'GS3-AT-012','วิ่ง 200 เมตร ไม่เกิน 15 ปี ชาย','2026-12-09','09:30','10:00','คัดเลือก','track'),
(111,'GS3-AT-011','วิ่ง 200 เมตร ไม่เกิน 15 ปี หญิง','2026-12-09','09:40','10:10','คัดเลือก','track'),
(112,'GS3-AT-023','วิ่ง 200 เมตร ไม่จำกัดอายุ ชาย','2026-12-09','09:50','10:20','คัดเลือก','track'),
(113,'GS3-AT-013','วิ่ง 200 เมตร ไม่จำกัดอายุ หญิง','2026-12-09','10:00','10:30','คัดเลือก','track'),
(114,'GS3-AT-015','วิ่ง 4x300 เมตร ไม่เกิน 13 ปี ชาย','2026-12-09','10:10','10:40','คัดเลือก','relay'),
(115,'GS3-AT-025','วิ่ง 4x300 เมตร ไม่เกิน 13 ปี หญิง','2026-12-09','10:20','10:50','คัดเลือก','relay'),
(116,'GS3-AT-016','เขย่งก้าวกระโดด ไม่เกิน 15 ปี หญิง','2026-12-09','10:30','11:00','ชิงชนะเลิศ','field'),
(117,'GS3-AT-017','วิ่ง 4x400 เมตร ไม่เกิน 15 ปี หญิง','2026-12-09','10:30','11:00','คัดเลือก','relay'),
(118,'GS3-AT-018','วิ่ง 4x400 เมตร ไม่เกิน 15 ปี ชาย','2026-12-09','10:40','11:10','คัดเลือก','relay'),
(119,'GS3-AT-019','วิ่ง 4x400 เมตร ไม่จำกัดอายุ หญิง','2026-12-09','10:50','11:20','คัดเลือก','relay'),
(120,'GS3-AT-020','วิ่ง 4x400 เมตร ไม่จำกัดอายุ ชาย','2026-12-09','11:00','11:30','คัดเลือก','relay'),
(121,'GS3-AT-021','กระโดดไกล ไม่เกิน 15 ปี ชาย','2026-12-09','13:00','13:30','ชิงชนะเลิศ','field'),
(122,'GS3-AT-022','ทุ่มน้ำหนัก ไม่เกิน 15 ปี หญิง','2026-12-09','13:00','13:30','ชิงชนะเลิศ','field'),
(123,'GS3-AT-011','วิ่ง 200 เมตร ไม่เกิน 15 ปี หญิง','2026-12-09','13:00','13:30','ชิงชนะเลิศ','track'),
(124,'GS3-AT-012','วิ่ง 200 เมตร ไม่เกิน 15 ปี ชาย','2026-12-09','13:10','13:40','ชิงชนะเลิศ','track'),
(125,'GS3-AT-013','วิ่ง 200 เมตร ไม่จำกัดอายุ หญิง','2026-12-09','13:20','13:50','ชิงชนะเลิศ','track'),
(126,'GS3-AT-023','วิ่ง 200 เมตร ไม่จำกัดอายุ ชาย','2026-12-09','13:30','14:00','ชิงชนะเลิศ','track'),
(127,'GS3-AT-024','เขย่งก้าวกระโดด ไม่เกิน 15 ปี ชาย','2026-12-09','13:40','14:10','ชิงชนะเลิศ','field'),
(128,'GS3-AT-025','วิ่ง 4x300 เมตร ไม่เกิน 13 ปี หญิง','2026-12-09','13:40','14:10','ชิงชนะเลิศ','relay'),
(129,'GS3-AT-015','วิ่ง 4x300 เมตร ไม่เกิน 13 ปี ชาย','2026-12-09','13:50','14:20','ชิงชนะเลิศ','relay'),
(130,'GS3-AT-017','วิ่ง 4x400 เมตร ไม่เกิน 15 ปี หญิง','2026-12-09','14:00','14:30','ชิงชนะเลิศ','relay'),
(131,'GS3-AT-018','วิ่ง 4x400 เมตร ไม่เกิน 15 ปี ชาย','2026-12-09','14:10','14:40','ชิงชนะเลิศ','relay'),
(132,'GS3-AT-019','วิ่ง 4x400 เมตร ไม่จำกัดอายุ หญิง','2026-12-09','14:20','14:50','ชิงชนะเลิศ','relay'),
(133,'GS3-AT-020','วิ่ง 4x400 เมตร ไม่จำกัดอายุ ชาย','2026-12-09','14:30','15:00','ชิงชนะเลิศ','relay'),
(201,'GS3-AT-026','กระโดดไกล ไม่เกิน 15 ปี หญิง','2026-12-10','08:30','09:00','ชิงชนะเลิศ','field'),
(202,'GS3-AT-027','วิ่ง 300 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','08:30','09:00','คัดเลือก','track'),
(203,'GS3-AT-028','วิ่ง 300 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','08:40','09:10','คัดเลือก','track'),
(204,'GS3-AT-029','วิ่ง 60 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','08:50','09:20','คัดเลือก','track'),
(205,'GS3-AT-030','วิ่ง 60 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','09:00','09:30','คัดเลือก','track'),
(206,'GS3-AT-031','วิ่ง 400 เมตร ไม่เกิน 15 ปี หญิง','2026-12-10','09:10','09:40','คัดเลือก','track'),
(207,'GS3-AT-032','วิ่ง 400 เมตร ไม่เกิน 15 ปี ชาย','2026-12-10','09:20','09:50','คัดเลือก','track'),
(208,'GS3-AT-033','วิ่ง 400 เมตร ไม่จำกัดอายุ หญิง','2026-12-10','09:30','10:00','คัดเลือก','track'),
(209,'GS3-AT-034','วิ่ง 400 เมตร ไม่จำกัดอายุ ชาย','2026-12-10','09:40','10:10','คัดเลือก','track'),
(210,'GS3-AT-035','เขย่งก้าวกระโดด ไม่จำกัดอายุ ชาย','2026-12-10','09:50','10:20','ชิงชนะเลิศ','field'),
(211,'GS3-AT-036','วิ่ง 100 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','09:50','10:20','คัดเลือก','track'),
(212,'GS3-AT-037','วิ่ง 100 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','10:00','10:30','คัดเลือก','track'),
(213,'GS3-AT-038','วิ่ง 100 เมตร ไม่เกิน 15 ปี หญิง','2026-12-10','10:10','10:40','คัดเลือก','track'),
(214,'GS3-AT-039','วิ่ง 100 เมตร ไม่เกิน 15 ปี ชาย','2026-12-10','10:20','10:50','คัดเลือก','track'),
(215,'GS3-AT-040','วิ่ง 100 เมตร ไม่จำกัดอายุ หญิง','2026-12-10','10:30','11:00','คัดเลือก','track'),
(216,'GS3-AT-041','วิ่ง 100 เมตร ไม่จำกัดอายุ ชาย','2026-12-10','10:40','11:10','คัดเลือก','track'),
(217,'GS3-AT-027','วิ่ง 300 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','10:50','11:20','ชิงชนะเลิศ','track'),
(218,'GS3-AT-028','วิ่ง 300 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','11:00','11:30','ชิงชนะเลิศ','track'),
(219,'GS3-AT-042','กระโดดไกล ไม่จำกัดอายุ หญิง','2026-12-10','13:00','13:30','ชิงชนะเลิศ','field'),
(220,'GS3-AT-043','ทุ่มน้ำหนัก ไม่เกิน 15 ปี ชาย','2026-12-10','13:00','13:30','ชิงชนะเลิศ','field'),
(221,'GS3-AT-029','วิ่ง 60 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','13:00','13:30','ชิงชนะเลิศ','track'),
(222,'GS3-AT-030','วิ่ง 60 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','13:10','13:40','ชิงชนะเลิศ','track'),
(223,'GS3-AT-031','วิ่ง 400 เมตร ไม่เกิน 15 ปี หญิง','2026-12-10','13:20','13:50','ชิงชนะเลิศ','track'),
(224,'GS3-AT-032','วิ่ง 400 เมตร ไม่เกิน 15 ปี ชาย','2026-12-10','13:30','14:00','ชิงชนะเลิศ','track'),
(225,'GS3-AT-033','วิ่ง 400 เมตร ไม่จำกัดอายุ หญิง','2026-12-10','13:40','14:10','ชิงชนะเลิศ','track'),
(226,'GS3-AT-034','วิ่ง 400 เมตร ไม่จำกัดอายุ ชาย','2026-12-10','13:50','14:20','ชิงชนะเลิศ','track'),
(227,'GS3-AT-044','เขย่งก้าวกระโดด ไม่จำกัดอายุ หญิง','2026-12-10','13:50','14:20','ชิงชนะเลิศ','field'),
(228,'GS3-AT-045','วิ่ง 4x100 เมตร ไม่เกิน 13 ปี หญิง','2026-12-10','14:00','14:30','คัดเลือก','relay'),
(229,'GS3-AT-046','วิ่ง 4x100 เมตร ไม่เกิน 13 ปี ชาย','2026-12-10','14:10','14:40','คัดเลือก','relay'),
(230,'GS3-AT-047','วิ่ง 4x100 เมตร ไม่เกิน 15 ปี หญิง','2026-12-10','14:20','14:50','คัดเลือก','relay'),
(231,'GS3-AT-048','วิ่ง 4x100 เมตร ไม่เกิน 15 ปี ชาย','2026-12-10','14:30','15:00','คัดเลือก','relay'),
(232,'GS3-AT-049','วิ่ง 4x100 เมตร ไม่จำกัดอายุ หญิง','2026-12-10','14:40','15:10','คัดเลือก','relay'),
(233,'GS3-AT-050','วิ่ง 4x100 เมตร ไม่จำกัดอายุ ชาย','2026-12-10','14:50','15:20','คัดเลือก','relay'),
(301,'GS3-AT-051','กระโดดไกล ไม่เกิน 13 ปี หญิง','2026-12-11','12:30','13:00','ชิงชนะเลิศ','field'),
(302,'GS3-AT-052','ทุ่มน้ำหนัก ไม่จำกัดอายุ ชาย','2026-12-11','12:30','13:00','ชิงชนะเลิศ','field'),
(303,'GS3-AT-036','วิ่ง 100 เมตร ไม่เกิน 13 ปี หญิง','2026-12-11','12:30','13:00','ชิงชนะเลิศ','track'),
(304,'GS3-AT-037','วิ่ง 100 เมตร ไม่เกิน 13 ปี ชาย','2026-12-11','12:35','13:05','ชิงชนะเลิศ','track'),
(305,'GS3-AT-038','วิ่ง 100 เมตร ไม่เกิน 15 ปี หญิง','2026-12-11','12:40','13:10','ชิงชนะเลิศ','track'),
(306,'GS3-AT-039','วิ่ง 100 เมตร ไม่เกิน 15 ปี ชาย','2026-12-11','12:45','13:15','ชิงชนะเลิศ','track'),
(307,'GS3-AT-040','วิ่ง 100 เมตร ไม่จำกัดอายุ หญิง','2026-12-11','12:50','13:20','ชิงชนะเลิศ','track'),
(308,'GS3-AT-041','วิ่ง 100 เมตร ไม่จำกัดอายุ ชาย','2026-12-11','12:55','13:25','ชิงชนะเลิศ','track'),
(309,'GS3-AT-053','วิ่ง 800 เมตร ไม่เกิน 15 ปี หญิง','2026-12-11','13:00','13:30','ชิงชนะเลิศ','track'),
(310,'GS3-AT-054','วิ่ง 800 เมตร ไม่เกิน 15 ปี ชาย','2026-12-11','13:10','13:40','ชิงชนะเลิศ','track'),
(311,'GS3-AT-055','วิ่ง 800 เมตร ไม่จำกัดอายุ หญิง','2026-12-11','13:20','13:50','ชิงชนะเลิศ','track'),
(312,'GS3-AT-056','วิ่ง 800 เมตร ไม่จำกัดอายุ ชาย','2026-12-11','13:30','14:00','ชิงชนะเลิศ','track'),
(313,'GS3-AT-045','วิ่ง 4x100 เมตร ไม่เกิน 13 ปี หญิง','2026-12-11','13:40','14:10','ชิงชนะเลิศ','relay'),
(314,'GS3-AT-046','วิ่ง 4x100 เมตร ไม่เกิน 13 ปี ชาย','2026-12-11','13:50','14:20','ชิงชนะเลิศ','relay'),
(315,'GS3-AT-047','วิ่ง 4x100 เมตร ไม่เกิน 15 ปี หญิง','2026-12-11','14:00','14:30','ชิงชนะเลิศ','relay'),
(316,'GS3-AT-048','วิ่ง 4x100 เมตร ไม่เกิน 15 ปี ชาย','2026-12-11','14:10','14:40','ชิงชนะเลิศ','relay'),
(317,'GS3-AT-049','วิ่ง 4x100 เมตร ไม่จำกัดอายุ หญิง','2026-12-11','14:20','14:50','ชิงชนะเลิศ','relay'),
(318,'GS3-AT-050','วิ่ง 4x100 เมตร ไม่จำกัดอายุ ชาย','2026-12-11','14:30','15:00','ชิงชนะเลิศ','relay');
-- One-time cleanup, authorized for the old TEST athletics schedule of this competition only.
-- Abort if the new athletics module already has any rounds for this competition.
lock table public.sports_schedule_sessions in share row exclusive mode;
do $$
declare comp uuid; x record; already_installed boolean; removed integer;
begin
 select id into strict comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
 for x in select * from _ath_seed loop
  if (select count(*) from public.sports_events e where e.competition_id=comp and e.event_code=x.code and e.event_type='athletics' and e.sport_name='กรีฑา '||x.label)<>1 then
   raise exception 'รหัสหรือชื่อรายการกรีฑาไม่ตรง: % %',x.no,x.code;
  end if;
 end loop;
 if to_regclass('public.sports_ath_rounds') is not null then
  execute 'select exists(select 1 from public.sports_ath_rounds r join public.sports_events e on e.id=r.event_id where e.competition_id=$1)' into already_installed using comp;
  if already_installed then raise exception 'พบระบบรายงานตัวกรีฑาที่ติดตั้งแล้ว หยุดเพื่อรักษาข้อมูล ห้ามรันชุดล้าง TEST ซ้ำ'; end if;
 end if;
 delete from public.sports_schedule_sessions ss using public.sports_events e
 where ss.competition_id=comp and e.competition_id=comp and ss.event_id=e.id
 and e.event_type='athletics' and e.event_code like 'GS3-AT-%';
 get diagnostics removed = row_count;
 raise notice 'ลบโปรแกรมกรีฑาเดิม (TEST) % ช่วง',removed;
end $$;
-- Insert the corrected 84 sessions; original protection remains in place.

do $$ declare comp uuid; x record; ev uuid; old public.sports_schedule_sessions%rowtype; n int;
begin
 select id into strict comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
 for x in select * from _ath_seed order by no loop
  select count(*),min(e.id::text)::uuid into n,ev from public.sports_events e where e.competition_id=comp and e.event_code=x.code and e.event_type='athletics' and e.sport_name='กรีฑา '||x.label;
  if n<>1 then raise exception 'รหัสหรือชื่อรายการกรีฑาไม่ตรง: % %',x.no,x.code;end if;
  if (select count(*) from public.sports_schedule_sessions ss join public.sports_events e on e.id=ss.event_id where ss.competition_id=comp and e.event_type='athletics' and ss.session_number=x.no::text)>1 then raise exception 'พบหมายเลขช่วงซ้ำ %',x.no;end if;
  select ss.* into old from public.sports_schedule_sessions ss join public.sports_events e on e.id=ss.event_id where ss.competition_id=comp and e.event_type='athletics' and ss.session_number=x.no::text;
  if found then
   if old.status<>'draft' and (old.event_id,old.session_date,old.report_time,old.start_time,old.round_name) is distinct from (ev,x.day,x.report,x.starts,x.round_name) then raise exception 'โปรแกรมเดิมไม่ใช่ฉบับร่างและไม่ตรงฉบับแก้ไข: %',x.no;end if;
   if old.status='draft' then update public.sports_schedule_sessions set event_id=ev,session_date=x.day,report_time=x.report,start_time=x.starts,end_time=null,round_name=x.round_name,venue_name='สนามกีฬาโรงเรียนเชียงคำวิทยาคม',source_ref='โปรแกรมการแข่งขันกรีฑาแก้ไข24พย.pdf',review_note=case when x.no=109 then 'รายการ 109 แก้เป็นชิงชนะเลิศตามผู้จัด' else 'ฉบับแก้ไข 24 พ.ย. 2569' end where id=old.id;end if;
  else
   insert into public.sports_schedule_sessions(competition_id,event_id,seed_key,session_number,session_date,report_time,start_time,round_name,venue_name,source_ref,review_note,status) values(comp,ev,'ATH-2026-'||x.no,x.no::text,x.day,x.report,x.starts,x.round_name,'สนามกีฬาโรงเรียนเชียงคำวิทยาคม','โปรแกรมการแข่งขันกรีฑาแก้ไข24พย.pdf',case when x.no=109 then 'รายการ 109 แก้เป็นชิงชนะเลิศตามผู้จัด' else 'ฉบับแก้ไข 24 พ.ย. 2569' end,'draft');
  end if;
 end loop;
end $$;
create table if not exists public.sports_ath_rounds(
 session_id uuid primary key references public.sports_schedule_sessions(id), event_id uuid not null references public.sports_events(id),
 kind text not null check(kind in ('track','relay','field')), phase text not null check(phase in ('qualifying','final')),
 state text not null default 'waiting' check(state in ('waiting','open','closed','finished')), roster_ready boolean not null default false,
 changed_at timestamptz not null default clock_timestamp(), changed_by uuid references auth.users(id) on delete set null);
insert into public.sports_ath_rounds(session_id,event_id,kind,phase)
select ss.id,ss.event_id,x.kind,case when x.round_name='คัดเลือก' then 'qualifying' else 'final' end from _ath_seed x join public.sports_events e on e.event_code=x.code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569' join public.sports_schedule_sessions ss on ss.event_id=e.id and ss.competition_id=c.id and ss.session_number=x.no::text
on conflict(session_id) do nothing;
-- Refuse inconsistent previous installations; do not overwrite call-room records.
do $$ begin if (select count(*) from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id join _ath_seed x on x.no::text=ss.session_number join public.sports_events e on e.id=r.event_id and e.event_code=x.code join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569' where r.event_id=ss.event_id and r.kind=x.kind and r.phase=case when x.round_name='คัดเลือก' then 'qualifying' else 'final' end)<>84 then raise exception 'โครงสร้างช่วงแข่งขันไม่ครบ 84';end if;end $$;
-- Permit four actual relay runners in the existing registration form. Preserve any larger configured quota.
update public.sports_events e set max_athletes_per_entry=4 where exists(select 1 from public.sports_ath_rounds r where r.event_id=e.id and r.kind='relay') and coalesce(e.max_athletes_per_entry,0)<4;
create table if not exists public.sports_ath_duties(event_id uuid references public.sports_events(id),email text not null,duty text not null check(duty in ('call','field','both')),primary key(event_id,email));
create table if not exists public.sports_ath_people(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.sports_ath_rounds(session_id),entry_id uuid not null references public.sports_entries(id),
 roster jsonb not null, attendance text not null default 'pending' check(attendance in ('pending','present','absent')),
 checked_at timestamptz,checked_by uuid references auth.users(id) on delete set null,heat integer check(heat>0),lane integer check(lane>0),received_at timestamptz,received_by uuid references auth.users(id) on delete set null,
 result_status text check(result_status in ('OK','DNS','DNF','DQ','NM')), mark numeric(12,3) check(mark>0), result_note text not null default '', qualified boolean not null default false,
 changed_at timestamptz not null default clock_timestamp(),unique(session_id,entry_id), check((result_status='OK' and mark is not null) or (result_status is distinct from 'OK' and mark is null)));
create unique index if not exists sports_ath_lane_unique on public.sports_ath_people(session_id,heat,lane) where heat is not null and lane is not null;
create table if not exists public.sports_ath_audit(id bigint generated always as identity primary key,session_id uuid references public.sports_ath_rounds(session_id),actor uuid references auth.users(id) on delete set null,action text not null,detail jsonb not null default '{}',at timestamptz not null default now());
alter table public.sports_ath_rounds enable row level security;
alter table public.sports_ath_duties enable row level security;
alter table public.sports_ath_people enable row level security;
alter table public.sports_ath_audit enable row level security;
revoke all on public.sports_ath_rounds,public.sports_ath_duties,public.sports_ath_people,public.sports_ath_audit from public,anon,authenticated;
create or replace function public.sports_ath_managed(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.sports_ath_rounds where event_id=p_event) $$;
create or replace function public.sports_ath_access(p_event uuid,p_duty text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_ath_managed(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email join public.sports_ath_duties d on d.event_id=e.id and d.email=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google') and (d.duty in (p_duty,'both') or p_duty='read'))));
$$;
create or replace function public.sports_ath_school(p_event uuid,p_school uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.sports_events e join public.sports_user_roles r on r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=p_school and (r.competition_id=e.competition_id or r.competition_id is null) where e.id=p_event);
$$;
create or replace function public.sports_ath_roster(p_entry uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.full_name,'student_code',a.student_code,'position',a.roster_position) order by a.roster_position nulls last,a.id),'[]'::jsonb) from public.sports_athletes a join public.sports_entries en on en.id=a.entry_id where en.id=p_entry and en.status='approved';
$$;
create or replace function public.sports_ath_public(p_comp uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',ss.id,'event_id',e.id,'code',e.event_code,'label',e.sport_name,'no',ss.session_number,'day',ss.session_date,'report',ss.report_time,'start',ss.start_time,'round',ss.round_name,'kind',r.kind,'phase',r.phase,'state',r.state,'status',ss.status) order by ss.session_date,ss.start_time,ss.session_number),'[]'::jsonb)
 from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id join public.sports_events e on e.id=r.event_id where ss.competition_id=p_comp and ss.event_id=r.event_id and (public.sports_stage3_admin(p_comp) or public.sports_ath_access(e.id,'read') or (ss.status='published' and e.status<>'draft'));
$$;
create or replace function public.sports_ath_private(p_session uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.sports_ath_rounds%rowtype; ev public.sports_events%rowtype; adm boolean; can_read boolean;
begin
 select * into strict r from public.sports_ath_rounds where session_id=p_session;select * into strict ev from public.sports_events where id=r.event_id;
 adm:=public.sports_stage3_admin(ev.competition_id); can_read:=public.sports_ath_access(ev.id,'read');
 if not can_read and not exists(select 1 from public.sports_entries en where en.event_id=ev.id and public.sports_ath_school(ev.id,en.school_id)) then raise exception 'ไม่มีสิทธิ์อ่านรายชื่อนักกีฬา' using errcode='42501';end if;
 return jsonb_build_object('admin',adm,'call',public.sports_ath_access(ev.id,'call'),'field',public.sports_ath_access(ev.id,'field'),'award',public.sports_cert_can_record(ev.id),'ready',r.roster_ready,'state',r.state,'published',public.sports_award_is_published(ev.id),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'entry_id',en.id,'school',s.name,'coach',en.coach_name,'roster',p.roster,'attendance',p.attendance,'checked_at',p.checked_at,'heat',p.heat,'lane',p.lane,'received_at',p.received_at,'result_status',p.result_status,'mark',p.mark,'result_note',p.result_note,'qualified',p.qualified,'changed_at',p.changed_at,'current',p.roster=public.sports_ath_roster(en.id)) order by s.name,en.id) from public.sports_ath_people p join public.sports_entries en on en.id=p.entry_id join public.sports_schools s on s.id=en.school_id where p.session_id=p_session and (can_read or public.sports_ath_school(ev.id,en.school_id))),'[]'::jsonb),
 'eligible',case when adm then coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'school',s.name,'roster',public.sports_ath_roster(en.id)) order by s.name,en.id) from public.sports_entries en join public.sports_schools s on s.id=en.school_id where en.event_id=ev.id and en.status='approved' and (r.phase='qualifying' or not exists(select 1 from public.sports_ath_rounds q where q.event_id=ev.id and q.phase='qualifying') or exists(select 1 from public.sports_ath_people p join public.sports_ath_rounds q on q.session_id=p.session_id where q.event_id=ev.id and q.phase='qualifying' and q.state='finished' and p.entry_id=en.id and p.qualified and p.roster=public.sports_ath_roster(en.id)))),'[]'::jsonb) else '[]'::jsonb end,
 'duties',case when adm then coalesce((select jsonb_agg(jsonb_build_object('email',a.email,'duty',d.duty) order by a.email) from public.sports_event_referees a left join public.sports_ath_duties d on d.event_id=a.event_id and d.email=a.email where a.event_id=ev.id and a.competition_id=ev.competition_id and a.is_active),'[]'::jsonb) else '[]'::jsonb end);
end $$;
create or replace function public.sports_ath_action(p_session uuid,p_action text,p_payload jsonb default '{}',p_expected timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.sports_ath_rounds%rowtype; ss public.sports_schedule_sessions%rowtype; p public.sports_ath_people%rowtype; adm boolean; ent uuid; snap jsonb; st text; h int; l int; val numeric; mail text; d text; ids uuid[]; cnt int;
begin
 select * into strict r from public.sports_ath_rounds where session_id=p_session;
 -- Same lock order as registration: event row before advisory lock.
 if p_action='prepare' then perform 1 from public.sports_events where id=r.event_id for update;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(r.event_id::text),94723);
 select * into strict r from public.sports_ath_rounds where session_id=p_session for update;
 select * into strict ss from public.sports_schedule_sessions where id=p_session for share;
 if ss.event_id<>r.event_id or ss.round_name is distinct from (case when r.phase='qualifying' then 'คัดเลือก' else 'ชิงชนะเลิศ' end) then raise exception 'รายการกลางถูกเปลี่ยน กรุณาตรวจสอบ';end if;
 adm:=public.sports_stage3_admin(ss.competition_id);
 if not public.sports_ath_access(r.event_id,'read') then raise exception 'ไม่มีสิทธิ์ดำเนินการ' using errcode='42501';end if;
 if p_action<>'duty' and ss.status<>'published' then raise exception 'โปรแกรมต้องอยู่สถานะเผยแพร่';end if;
 if p_action='duty' then
  if not adm then raise exception 'เฉพาะผู้ดูแล';end if;
  mail:=lower(btrim(p_payload->>'email'));d:=p_payload->>'duty';
  if not exists(select 1 from public.sports_event_referees a where a.event_id=r.event_id and a.competition_id=ss.competition_id and a.email=mail and a.is_active) then raise exception 'ต้องมอบหมายกรรมการรายการนี้ในระบบกลางก่อน';end if;
  if d='none' then delete from public.sports_ath_duties where event_id=r.event_id and email=mail;elsif d in ('call','field','both') then insert into public.sports_ath_duties values(r.event_id,mail,d) on conflict(event_id,email) do update set duty=excluded.duty;else raise exception 'หน้าที่ไม่ถูกต้อง';end if;
 elsif p_action='prepare' then
  if public.sports_award_is_published(r.event_id) then raise exception 'รายการนี้เคยประกาศผลแล้ว กรุณาตรวจข้อมูลเดิมก่อน';end if;
  if not adm or r.state<>'waiting' or r.roster_ready then raise exception 'ต้องเป็นผู้ดูแลและยังไม่จัดรายชื่อ';end if;
  if ss.status<>'published' then raise exception 'เผยแพร่โปรแกรมในระบบกลางก่อน';end if;
  if r.phase='final' and exists(select 1 from public.sports_ath_rounds q where q.event_id=r.event_id and q.phase='qualifying' and q.state<>'finished') then raise exception 'รอผลคัดเลือกก่อน';end if;
  if r.phase='final' and exists(select 1 from public.sports_ath_people a join public.sports_ath_rounds q on q.session_id=a.session_id where q.event_id=r.event_id and q.phase='qualifying' and a.qualified and a.roster<>public.sports_ath_roster(a.entry_id)) then raise exception 'รายชื่อผู้ผ่านรอบเปลี่ยน กรุณาตรวจสอบก่อน';end if;
  for ent in select en.id from public.sports_entries en where en.event_id=r.event_id and en.competition_id=ss.competition_id and en.status='approved' and (r.phase='qualifying' or not exists(select 1 from public.sports_ath_rounds q where q.event_id=r.event_id and q.phase='qualifying') or exists(select 1 from public.sports_ath_people a join public.sports_ath_rounds q on q.session_id=a.session_id where q.event_id=r.event_id and q.phase='qualifying' and q.state='finished' and a.entry_id=en.id and a.qualified and a.roster=public.sports_ath_roster(en.id))) loop
   snap:=public.sports_ath_roster(ent);
   if jsonb_array_length(snap)<>(case when r.kind='relay' then 4 else 1 end) then raise exception 'ใบสมัคร % ต้องมีนักกีฬาตามจำนวนจริง (เดี่ยว 1 ผลัด 4) กรุณาตรวจระบบทะเบียน',ent;end if;
   insert into public.sports_ath_people(session_id,entry_id,roster) values(p_session,ent,snap);
  end loop;
  if not exists(select 1 from public.sports_ath_people where session_id=p_session) then raise exception 'ไม่มีรายชื่อที่ผ่านการรับสมัครหรือคัดเลือก';end if;
  update public.sports_ath_rounds set roster_ready=true where session_id=p_session;
  update public.sports_events set status='closed',updated_at=now() where id=r.event_id and status='registration';
 elsif p_action='open' then
  if not public.sports_ath_access(r.event_id,'call') or not r.roster_ready or r.state<>'waiting' or ss.status<>'published' then raise exception 'ยังเปิดรายงานตัวไม่ได้';end if;
  update public.sports_ath_rounds set state='open' where session_id=p_session;
 elsif p_action='close' then
  if not public.sports_ath_access(r.event_id,'call') or r.state<>'open' then raise exception 'ไม่มีสิทธิ์ปิด';end if;
  if exists(select 1 from public.sports_ath_people a where a.session_id=p_session and (a.attendance='pending' or a.roster<>public.sports_ath_roster(a.entry_id) or (a.attendance='present' and (a.heat is null or a.lane is null)))) then raise exception 'ตรวจรายชื่อ สถานะ และชุด/ช่องวิ่งหรือลำดับให้ครบ';end if;
  update public.sports_ath_rounds set state='closed' where session_id=p_session;
  update public.sports_ath_people set result_status='DNS',changed_at=clock_timestamp() where session_id=p_session and attendance='absent';
 elsif p_action='finish' then
  if not public.sports_ath_access(r.event_id,'field') or r.state<>'closed' then raise exception 'ยังปิดผลไม่ได้';end if;
  if exists(select 1 from public.sports_ath_people a where a.session_id=p_session and (a.result_status is null or a.roster<>public.sports_ath_roster(a.entry_id) or (a.attendance='present' and a.received_at is null))) then raise exception 'บันทึกผลและยืนยันรายชื่อให้ครบ';end if;
  if r.phase='qualifying' and not exists(select 1 from public.sports_ath_people where session_id=p_session and qualified) then raise exception 'ต้องยืนยันผู้ผ่านรอบตามกติกาจริงก่อน';end if;
  update public.sports_ath_rounds set state='finished' where session_id=p_session;
 elsif p_action in ('attendance','receive','result','qualify') then
  select * into strict p from public.sports_ath_people where session_id=p_session and id=(p_payload->>'id')::uuid for update;
  if p_expected is null or p_expected<>p.changed_at then raise exception 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่';end if;
  if p.roster<>public.sports_ath_roster(p.entry_id) then raise exception 'ใบสมัครเปลี่ยนหลังจัดรายชื่อ กรุณาติดต่อผู้ดูแล';end if;
  if p_action='attendance' then
   if r.state<>'open' or not public.sports_ath_access(r.event_id,'call') then raise exception 'ยังไม่เปิดรายงานตัวหรือไม่มีสิทธิ์';end if;
   st:=p_payload->>'status'; h:=(p_payload->>'heat')::int;l:=(p_payload->>'lane')::int;
   if st not in ('present','absent','pending') or st is null then raise exception 'สถานะไม่ถูกต้อง';end if;
   if st='present' and (jsonb_typeof(p_payload->'verified') is distinct from 'array' or (select count(distinct v) from jsonb_array_elements_text(p_payload->'verified') v)<>jsonb_array_length(p.roster) or exists(select 1 from jsonb_array_elements(p.roster) a where not ((p_payload->'verified') ? (a->>'id')))) then raise exception 'ต้องตรวจสอบตัวนักกีฬาทุกคนก่อนยืนยัน';end if;
   if st='present' and (h is null or l is null or h<1 or l<1) then raise exception 'ระบุชุดและช่องวิ่ง/ลำดับ';end if;
   update public.sports_ath_people set attendance=st,heat=case when st='present' then h end,lane=case when st='present' then l end,checked_at=clock_timestamp(),checked_by=auth.uid(),changed_at=clock_timestamp() where id=p.id;
  elsif p_action='receive' then
   if r.state<>'closed' or not public.sports_ath_access(r.event_id,'field') or p.attendance<>'present' then raise exception 'ยังไม่ส่งนักกีฬาเข้าสนาม';end if;
   update public.sports_ath_people set received_at=clock_timestamp(),received_by=auth.uid(),changed_at=clock_timestamp() where id=p.id;
  elsif p_action='result' then
   if r.state<>'closed' or not public.sports_ath_access(r.event_id,'field') or p.attendance<>'present' or p.received_at is null then raise exception 'ต้องรับนักกีฬาเข้าสนามก่อน';end if;
   st:=p_payload->>'status';val:=(p_payload->>'mark')::numeric;
   if st is null or st not in ('OK','DNS','DNF','DQ','NM') or (st='NM' and r.kind<>'field') or (st='DNF' and r.kind='field') then raise exception 'สถานะผลไม่ถูกต้อง';end if;
   if st='OK' and (val is null or val::text in ('NaN','Infinity','-Infinity') or val<=0 or val>=1000000 or round(val,3)<>val) then raise exception 'กรอกเวลา (วินาที) หรือระยะ (เมตร) เป็นทศนิยมไม่เกิน 3 ตำแหน่ง';end if;
   if st<>'OK' and nullif(btrim(p_payload->>'note'),'') is null then raise exception 'ระบุเหตุผล';end if;
   update public.sports_ath_people set result_status=st,mark=case when st='OK' then val end,result_note=left(coalesce(p_payload->>'note',''),500),qualified=false,changed_at=clock_timestamp() where id=p.id;
  else
   if r.state<>'closed' or r.phase<>'qualifying' or not public.sports_ath_access(r.event_id,'field') or p.result_status is distinct from 'OK' then raise exception 'ต้องมีผลถูกต้องก่อนคัดเลือก';end if;
   update public.sports_ath_people set qualified=coalesce((p_payload->>'qualified')::boolean,false),changed_at=clock_timestamp() where id=p.id;
  end if;
 else raise exception 'ไม่รองรับคำสั่ง';end if;
 update public.sports_ath_rounds set changed_at=clock_timestamp(),changed_by=auth.uid() where session_id=p_session;
 insert into public.sports_ath_audit(session_id,actor,action,detail) values(p_session,auth.uid(),p_action,p_payload);
end $$;
-- Freeze only prepared event rosters. All earlier sports retain their existing registration workflow.
create or replace function public.sports_ath_lock_roster() returns trigger language plpgsql security definer set search_path='' as $$
declare ev uuid; oldev uuid;
begin
 if TG_TABLE_NAME='sports_entries' then
  if TG_OP<>'DELETE' then ev:=new.event_id;end if;
  if TG_OP<>'INSERT' then oldev:=old.event_id;end if;
 else
  if TG_OP<>'DELETE' then select event_id into ev from public.sports_entries where id=new.entry_id;end if;
  if TG_OP<>'INSERT' then select event_id into oldev from public.sports_entries where id=old.entry_id;end if;
 end if;
 -- Event moves are not supported once an athletics roster is frozen.
 if public.sports_ath_managed(ev) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev::text),94723);
  if exists(select 1 from public.sports_ath_rounds where event_id=ev and roster_ready) then raise exception 'รายการกรีฑานี้ปิดรายชื่อเข้าสู่กระบวนการแข่งขันแล้ว';end if;
 end if;
 if oldev is distinct from ev and public.sports_ath_managed(oldev) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(oldev::text),94723);
  if exists(select 1 from public.sports_ath_rounds where event_id=oldev and roster_ready) then raise exception 'รายการกรีฑานี้ปิดรายชื่อเข้าสู่กระบวนการแข่งขันแล้ว';end if;
 end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
revoke all on function public.sports_ath_lock_roster() from public,anon,authenticated;
drop trigger if exists sports_ath_freeze_entries on public.sports_entries;
create trigger sports_ath_freeze_entries before insert or update or delete on public.sports_entries for each row execute function public.sports_ath_lock_roster();
drop trigger if exists sports_ath_freeze_athletes on public.sports_athletes;
create trigger sports_ath_freeze_athletes before insert or update or delete on public.sports_athletes for each row execute function public.sports_ath_lock_roster();
-- Only an unambiguous completed final with three valid performances may use central award workflow.
create or replace function public.sports_ath_awards(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.sports_ath_rounds%rowtype; arr jsonb; n int;
begin
 if not public.sports_ath_access(p_event,'field') and not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์';end if;
 select * into r from public.sports_ath_rounds where event_id=p_event and phase='final' and state='finished';
 if not found or exists(select 1 from public.sports_ath_people where session_id=r.session_id and roster<>public.sports_ath_roster(entry_id)) then return jsonb_build_object('status','incomplete','placements','[]'::jsonb);end if;
 if (select count(*) from public.sports_ath_people where session_id=r.session_id and result_status='OK')<3 then return jsonb_build_object('status','incomplete','placements','[]'::jsonb);end if;
 -- Equal marks require official tie-breaking rules not provided by this PDF. Do not guess.
 if exists(select 1 from (select mark,rank() over(order by case when r.kind='field' then -mark else mark end) pos,count(*) over(partition by mark) ties from public.sports_ath_people where session_id=r.session_id and result_status='OK') x where pos<=3 and ties>1) then return jsonb_build_object('status','ambiguous','placements','[]'::jsonb);end if;
 select jsonb_agg(jsonb_build_object('rank',x.pos,'slot',1,'entry_id',x.entry_id) order by x.pos) into arr from (select entry_id,row_number() over(order by case when r.kind='field' then -mark else mark end) pos from public.sports_ath_people where session_id=r.session_id and result_status='OK') x where pos<=3;
 return jsonb_build_object('status','ready','source','athletics','placements',arr);
end $$;
create or replace function public.sports_ath_public_results(p_session uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('school',x.school,'mark',x.mark,'status',x.result_status,'rank',x.pos) order by x.pos nulls last,x.school),'[]'::jsonb) from (select s.name school,p.mark,p.result_status,case when p.result_status='OK' then rank() over(partition by p.result_status order by case when r.kind='field' then -p.mark else p.mark end) end pos from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id join public.sports_ath_people p on p.session_id=r.session_id join public.sports_entries en on en.id=p.entry_id join public.sports_schools s on s.id=en.school_id where r.session_id=p_session and r.event_id=ss.event_id and r.state='finished' and ss.status='published' and (r.phase='qualifying' or public.sports_award_is_published(r.event_id))) x;
$$;
-- Direct results cannot bypass this workflow for mapped athletics events.
drop policy if exists "athletics insert guard" on public.sports_event_results;
create policy "athletics insert guard" on public.sports_event_results as restrictive for insert to authenticated with check(not public.sports_ath_managed(event_id));
drop policy if exists "athletics update guard" on public.sports_event_results;
create policy "athletics update guard" on public.sports_event_results as restrictive for update to authenticated using(not public.sports_ath_managed(event_id)) with check(not public.sports_ath_managed(event_id));
drop policy if exists "athletics delete guard" on public.sports_event_results;
create policy "athletics delete guard" on public.sports_event_results as restrictive for delete to authenticated using(not public.sports_ath_managed(event_id));
create or replace function public.sports_cert_submit(p_event uuid,p_awards jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_expected int;
 v_num int;
 v_status text;
 v_box jsonb;
begin
 if not public.sports_cert_can_record(p_event) then
   raise exception 'ไม่มีสิทธิ์ประกาศผลรายการนี้' using errcode='42501';
 end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 if public.sports_ath_managed(p_event) then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
   v_box:=public.sports_ath_awards(p_event);
   if v_box->>'status'<>'ready' or p_awards is null or not (p_awards @> (v_box->'placements') and (v_box->'placements') @> p_awards) then raise exception 'อันดับกรีฑาต้องตรงกับผลรอบชิงที่ยืนยันแล้ว';end if;
 end if;
 if public.sports_is_boxing(p_event) then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
   v_box:=public.sports_boxing_awards(p_event);
   if v_box->>'status'<>'ready' then raise exception 'ยังไม่พร้อมประกาศผลมวยหรือกติการางวัลยังไม่ได้รับการยืนยัน';end if;
   v_expected:=jsonb_array_length(v_box->'placements');
   if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected or not (p_awards @> (v_box->'placements') and (v_box->'placements') @> p_awards) then raise exception 'อันดับมวยต้องตรงกับผลที่ยืนยัน';end if;
 else
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

 end if;

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

 if public.sports_ath_managed(p_event) then
  insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,performance_value,performance_unit,result_text,recorded_at)
  select p_event,en.id,en.school_id,en.entry_name,pl.rank,p.mark,case when r.kind='field' then 'เมตร' else 'วินาที' end,p.result_status,now()
  from public.sports_ath_rounds r join public.sports_ath_people p on p.session_id=r.session_id join public.sports_entries en on en.id=p.entry_id left join public.sports_certificate_placements pl on pl.event_id=p_event and pl.entry_id=p.entry_id where r.event_id=p_event and r.phase='final' and r.state='finished'
  on conflict(event_id,entry_id) do update set rank=excluded.rank,performance_value=excluded.performance_value,performance_unit=excluded.performance_unit,result_text=excluded.result_text,recorded_at=excluded.recorded_at;
 end if;
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
 if public.sports_ath_managed(p_event) then return public.sports_ath_awards(p_event);end if;
 if public.sports_is_boxing(p_event) then return public.sports_boxing_awards(p_event);end if;
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
 if public.sports_ath_managed(p_event) then raise exception 'แก้ผลกรีฑาหลังประกาศต้องตรวจสอบผลรอบชิงและเอกสารก่อน';end if;
 if public.sports_is_boxing(p_event) then raise exception 'การแก้ผลมวยหลังประกาศต้องตรวจสอบสายและเกียรติบัตรโดยผู้ดูแลก่อน';end if;
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

revoke all on function public.sports_ath_managed(uuid),public.sports_ath_access(uuid,text),public.sports_ath_school(uuid,uuid),public.sports_ath_roster(uuid),public.sports_ath_public(uuid),public.sports_ath_private(uuid),public.sports_ath_action(uuid,text,jsonb,timestamptz),public.sports_ath_awards(uuid),public.sports_ath_public_results(uuid) from public,anon,authenticated;
grant execute on function public.sports_ath_managed(uuid),public.sports_ath_private(uuid),public.sports_ath_action(uuid,text,jsonb,timestamptz),public.sports_ath_awards(uuid) to authenticated;
grant execute on function public.sports_ath_public(uuid),public.sports_ath_public_results(uuid) to anon,authenticated;
create or replace function public.sports_photo_object_permitted(p_path text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  candidate_entry uuid;
  entry_record record;
begin
  if auth.uid() is null then return false; end if;
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-9]|[1-9][0-9]|1[0-9][0-9]|200)-[0-9a-f]{20}\.jpg$'
  then return false; end if;
  candidate_entry := split_part(p_path,'/',1)::uuid;
  select en.competition_id, en.school_id, en.status, en.event_id
    into entry_record
    from public.sports_entries en
    join public.sports_events ev on ev.id = en.event_id
   where en.id = candidate_entry;
  if not found then return false; end if;

  if public.sports_stage3_admin(entry_record.competition_id) then return true; end if;
  if not p_write and public.sports_ath_access(entry_record.event_id,'read') then return true;end if;
  if p_write and entry_record.status not in ('submitted','rejected','approved') then return false; end if;

  return exists (
    select 1 from public.sports_user_roles r
     where r.user_id = auth.uid() and r.is_active = true
       and r.role = 'school_manager' and r.school_id = entry_record.school_id
       and (r.competition_id is null or r.competition_id = entry_record.competition_id)
  );
end; $$;

revoke all on function public.sports_photo_object_permitted(text,boolean) from public, anon;
grant execute on function public.sports_photo_object_permitted(text,boolean) to authenticated;


commit;
notify pgrst, 'reload schema';
