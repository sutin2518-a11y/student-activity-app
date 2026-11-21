-- Stage 4: E-Sport (Arena of Valor) groups, round-robin fixtures, schedules and results.
-- Apply only after Stage 3 migration + seed have completed successfully.
-- All seeded rows remain drafts. This migration does not publish events or sessions.
begin;

do $$
declare v_comp uuid; v_count integer;
begin
  select id into v_comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
  if v_comp is null then raise exception 'Stage 1 competition missing'; end if;
  select count(*) into v_count from public.sports_events
   where competition_id=v_comp and event_code in ('GS3-ES-SM','GS3-ES-SF');
  if v_count <> 2 then raise exception 'Expected existing E-Sport events GS3-ES-SM and GS3-ES-SF; found %',v_count; end if;
end $$;

create table if not exists public.sports_esports_groups (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  event_id uuid not null,
  group_code text not null check (group_code in ('A','B','C','D')),
  sort_order smallint not null check (sort_order between 1 and 4),
  created_at timestamptz not null default now(),
  unique (competition_id,event_id,group_code),
  unique (competition_id,event_id,id),
  foreign key (competition_id,event_id) references public.sports_events(competition_id,id) on delete cascade
);

create table if not exists public.sports_esports_group_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  event_id uuid not null,
  group_id uuid not null,
  school_name text not null check (length(btrim(school_name)) between 1 and 180),
  seed_order smallint not null check (seed_order between 1 and 20),
  created_at timestamptz not null default now(),
  unique (group_id,school_name),
  unique (group_id,seed_order),
  unique (competition_id,event_id,id),
  unique (competition_id,event_id,group_id,id),
  foreign key (competition_id,event_id,group_id)
    references public.sports_esports_groups(competition_id,event_id,id) on delete cascade
);

create table if not exists public.sports_esports_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  event_id uuid not null,
  group_id uuid,
  match_no text not null check (length(btrim(match_no)) between 1 and 30),
  stage text not null default 'group' check (stage in ('group','knockout','semifinal','final','third_place')),
  team1_id uuid not null,
  team2_id uuid not null,
  scheduled_date date,
  start_time time,
  venue_name text not null default 'หอประชุมโรงเรียนเชียงคำวิทยาคม' check (length(venue_name) <= 250),
  match_status text not null default 'draft' check (match_status in ('draft','scheduled','completed','cancelled')),
  score1 smallint,
  score2 smallint,
  duration_minutes numeric(7,2) check (duration_minutes is null or duration_minutes >= 0),
  team1_kills integer check (team1_kills is null or team1_kills >= 0),
  team2_kills integer check (team2_kills is null or team2_kills >= 0),
  notes text not null default '' check (length(notes) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (competition_id,event_id,match_no),
  foreign key (competition_id,event_id) references public.sports_events(competition_id,id) on delete cascade,
  foreign key (competition_id,event_id,group_id)
    references public.sports_esports_groups(competition_id,event_id,id) on delete restrict,
  foreign key (competition_id,event_id,team1_id)
    references public.sports_esports_group_teams(competition_id,event_id,id) on delete restrict,
  foreign key (competition_id,event_id,team2_id)
    references public.sports_esports_group_teams(competition_id,event_id,id) on delete restrict,
  foreign key (competition_id,event_id,group_id,team1_id)
    references public.sports_esports_group_teams(competition_id,event_id,group_id,id) on delete restrict,
  foreign key (competition_id,event_id,group_id,team2_id)
    references public.sports_esports_group_teams(competition_id,event_id,group_id,id) on delete restrict,
  check (team1_id <> team2_id),
  check ((stage='group' and group_id is not null) or (stage<>'group' and group_id is null)),
  check (
    (match_status='completed' and score1 is not null and score2 is not null
      and ((score1=2 and score2 in (0,1)) or (score2=2 and score1 in (0,1))))
    or (match_status<>'completed' and score1 is null and score2 is null)
  ),
  check (match_status<>'scheduled' or (scheduled_date is not null and start_time is not null))
);

create index if not exists sports_esports_groups_event_idx on public.sports_esports_groups(competition_id,event_id,sort_order);
create index if not exists sports_esports_teams_group_idx on public.sports_esports_group_teams(competition_id,event_id,group_id,seed_order);
create index if not exists sports_esports_matches_event_idx on public.sports_esports_matches(competition_id,event_id,stage,match_status,scheduled_date,start_time);

create or replace function public.sports_esports_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists sports_esports_matches_stamp on public.sports_esports_matches;
create trigger sports_esports_matches_stamp before update on public.sports_esports_matches
for each row execute function public.sports_esports_stamp();

-- RLS: only the explicit competition_admin/super_admin role can manage E-Sport data.
-- Public users can read groups after the corresponding event is published and can read
-- only scheduled/completed/cancelled matches.
revoke all privileges on public.sports_esports_groups from public,anon,authenticated;
revoke all privileges on public.sports_esports_group_teams from public,anon,authenticated;
revoke all privileges on public.sports_esports_matches from public,anon,authenticated;
grant select on public.sports_esports_groups,public.sports_esports_group_teams,public.sports_esports_matches to anon,authenticated;
grant insert,update,delete on public.sports_esports_groups,public.sports_esports_group_teams,public.sports_esports_matches to authenticated;

alter table public.sports_esports_groups enable row level security;
alter table public.sports_esports_group_teams enable row level security;
alter table public.sports_esports_matches enable row level security;

drop policy if exists "esports groups read" on public.sports_esports_groups;
create policy "esports groups read" on public.sports_esports_groups for select to anon,authenticated
using (public.sports_stage3_admin(competition_id) or exists (
  select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
));
drop policy if exists "esports groups manage" on public.sports_esports_groups;
create policy "esports groups manage" on public.sports_esports_groups for all to authenticated
using (public.sports_stage3_admin(competition_id)) with check (public.sports_stage3_admin(competition_id));

drop policy if exists "esports teams read" on public.sports_esports_group_teams;
create policy "esports teams read" on public.sports_esports_group_teams for select to anon,authenticated
using (public.sports_stage3_admin(competition_id) or exists (
  select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
));
drop policy if exists "esports teams manage" on public.sports_esports_group_teams;
create policy "esports teams manage" on public.sports_esports_group_teams for all to authenticated
using (public.sports_stage3_admin(competition_id)) with check (public.sports_stage3_admin(competition_id));

drop policy if exists "esports matches read" on public.sports_esports_matches;
create policy "esports matches read" on public.sports_esports_matches for select to anon,authenticated
using (public.sports_stage3_admin(competition_id) or (match_status<>'draft' and exists (
  select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
)));
drop policy if exists "esports matches insert" on public.sports_esports_matches;
create policy "esports matches insert" on public.sports_esports_matches for insert to authenticated
with check (public.sports_stage3_admin(competition_id));
drop policy if exists "esports matches update" on public.sports_esports_matches;
create policy "esports matches update" on public.sports_esports_matches for update to authenticated
using (public.sports_stage3_admin(competition_id)) with check (public.sports_stage3_admin(competition_id));
drop policy if exists "esports matches delete draft" on public.sports_esports_matches;
create policy "esports matches delete draft" on public.sports_esports_matches for delete to authenticated
using (public.sports_stage3_admin(competition_id) and match_status='draft');

-- Preserve the two existing Stage 3 event records. Correct the date using the cover and
-- official schedule on page 8 (5-7 December 2569); leave both events unpublished.
update public.sports_events e
set competition_format='league',
    notes='แข่งขันวันที่ 5–7 ธันวาคม 2569 ตามหน้าปกและกำหนดการหน้า 8; แบ่งกลุ่มตามผังหน้า 10–11; โปรแกรมคู่แข่งขันและผลการแข่งขันจัดการในหน้า E-Sport',
    updated_at=now()
from public.sports_competitions c
where e.competition_id=c.id and c.slug='phayao-secondary-group-sports-2569'
  and e.event_code in ('GS3-ES-SM','GS3-ES-SF');

-- Official group assignments copied from the team/group lists on pages 10-11.
with src(event_code,group_code,group_order,school_name,seed_order) as (
 values
 ('GS3-ES-SM','A',1,'ภูซางวิทยาคม',1),
 ('GS3-ES-SM','A',1,'เชียงม่วนวิทยาคม',2),
 ('GS3-ES-SM','A',1,'พะเยาพิทยาคม',3),
 ('GS3-ES-SM','A',1,'เชียงคำวิทยาคม',4),
 ('GS3-ES-SM','B',2,'ปงรัชดาภิเษก',1),
 ('GS3-ES-SM','B',2,'ฟากกว๊านวิทยาคม',2),
 ('GS3-ES-SM','B',2,'ดงเจนวิทยาคม',3),
 ('GS3-ES-SM','B',2,'พะเยาประสาธน์วิทย์',4),
 ('GS3-ES-SM','C',3,'จุนวิทยาคม',1),
 ('GS3-ES-SM','C',3,'สาธิตมหาวิทยาลัยพะเยา',2),
 ('GS3-ES-SM','C',3,'พินิตประสาธน์',3),
 ('GS3-ES-SM','C',3,'ถ้ำปินวิทยาคม',4),
 ('GS3-ES-SM','C',3,'แม่ใจวิทยาคม',5),
 ('GS3-ES-SM','D',4,'ดอกคำใต้วิทยาคม',1),
 ('GS3-ES-SM','D',4,'ฝายกวางวิทยาคม',2),
 ('GS3-ES-SM','D',4,'ราชประชานุเคราะห์ ๒๔ จ.พะเยา',3),
 ('GS3-ES-SM','D',4,'งำเมืองวิทยาคม',4),
 ('GS3-ES-SM','D',4,'ขุนควรวิทยาคม',5),
 ('GS3-ES-SF','A',1,'เชียงม่วนวิทยาคม',1),
 ('GS3-ES-SF','A',1,'ดอกคำใต้วิทยาคม',2),
 ('GS3-ES-SF','A',1,'เฉลิมพระเกียรติฯพะเยา',3),
 ('GS3-ES-SF','A',1,'จุนวิทยาคม',4),
 ('GS3-ES-SF','A',1,'สาธิตมหาวิทยาลัยพะเยา',5),
 ('GS3-ES-SF','B',2,'งำเมืองวิทยาคม',1),
 ('GS3-ES-SF','B',2,'ดงเจนวิทยาคม',2),
 ('GS3-ES-SF','B',2,'พะเยาพิทยาคม',3),
 ('GS3-ES-SF','B',2,'เชียงคำวิทยาคม',4),
 ('GS3-ES-SF','B',2,'ฝายกวางวิทยาคม',5)
)
insert into public.sports_esports_groups(competition_id,event_id,group_code,sort_order)
select c.id,e.id,s.group_code,s.group_order
from src s
join public.sports_competitions c on c.slug='phayao-secondary-group-sports-2569'
join public.sports_events e on e.competition_id=c.id and e.event_code=s.event_code
group by c.id,e.id,s.group_code,s.group_order
on conflict (competition_id,event_id,group_code) do nothing;

with src(event_code,group_code,school_name,seed_order) as (
 values
 ('GS3-ES-SM','A','ภูซางวิทยาคม',1),('GS3-ES-SM','A','เชียงม่วนวิทยาคม',2),('GS3-ES-SM','A','พะเยาพิทยาคม',3),('GS3-ES-SM','A','เชียงคำวิทยาคม',4),
 ('GS3-ES-SM','B','ปงรัชดาภิเษก',1),('GS3-ES-SM','B','ฟากกว๊านวิทยาคม',2),('GS3-ES-SM','B','ดงเจนวิทยาคม',3),('GS3-ES-SM','B','พะเยาประสาธน์วิทย์',4),
 ('GS3-ES-SM','C','จุนวิทยาคม',1),('GS3-ES-SM','C','สาธิตมหาวิทยาลัยพะเยา',2),('GS3-ES-SM','C','พินิตประสาธน์',3),('GS3-ES-SM','C','ถ้ำปินวิทยาคม',4),('GS3-ES-SM','C','แม่ใจวิทยาคม',5),
 ('GS3-ES-SM','D','ดอกคำใต้วิทยาคม',1),('GS3-ES-SM','D','ฝายกวางวิทยาคม',2),('GS3-ES-SM','D','ราชประชานุเคราะห์ ๒๔ จ.พะเยา',3),('GS3-ES-SM','D','งำเมืองวิทยาคม',4),('GS3-ES-SM','D','ขุนควรวิทยาคม',5),
 ('GS3-ES-SF','A','เชียงม่วนวิทยาคม',1),('GS3-ES-SF','A','ดอกคำใต้วิทยาคม',2),('GS3-ES-SF','A','เฉลิมพระเกียรติฯพะเยา',3),('GS3-ES-SF','A','จุนวิทยาคม',4),('GS3-ES-SF','A','สาธิตมหาวิทยาลัยพะเยา',5),
 ('GS3-ES-SF','B','งำเมืองวิทยาคม',1),('GS3-ES-SF','B','ดงเจนวิทยาคม',2),('GS3-ES-SF','B','พะเยาพิทยาคม',3),('GS3-ES-SF','B','เชียงคำวิทยาคม',4),('GS3-ES-SF','B','ฝายกวางวิทยาคม',5)
)
insert into public.sports_esports_group_teams(competition_id,event_id,group_id,school_name,seed_order)
select c.id,e.id,g.id,s.school_name,s.seed_order
from src s
join public.sports_competitions c on c.slug='phayao-secondary-group-sports-2569'
join public.sports_events e on e.competition_id=c.id and e.event_code=s.event_code
join public.sports_esports_groups g on g.competition_id=c.id and g.event_id=e.id and g.group_code=s.group_code
on conflict (group_id,school_name) do nothing;

-- Generate round-robin group-stage fixtures only. No unverified knockout bracket is invented.
with pairs as (
 select a.competition_id,a.event_id,a.group_id,g.group_code,
        a.id as team1_id,b.id as team2_id,
        row_number() over(partition by a.group_id order by a.seed_order,b.seed_order) as n
 from public.sports_esports_group_teams a
 join public.sports_esports_group_teams b on b.group_id=a.group_id and a.seed_order<b.seed_order
 join public.sports_esports_groups g on g.id=a.group_id
 join public.sports_competitions c on c.id=a.competition_id and c.slug='phayao-secondary-group-sports-2569'
)
insert into public.sports_esports_matches(competition_id,event_id,group_id,match_no,stage,team1_id,team2_id,match_status,venue_name)
select competition_id,event_id,group_id,group_code||'-'||lpad(n::text,2,'0'),'group',team1_id,team2_id,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'
from pairs
on conflict (competition_id,event_id,match_no) do nothing;

-- Official event-level schedule. The Day 5 report time and start time overlap in the PDF;
-- keep the source times but flag the conflict for committee review.
with sessions(event_code,seed_key,session_number,session_date,report_time,start_time,round_name,participants,review_note) as (
 values
 ('GS3-ES-SM','ESPORT-2569-M-D1','ES-M-01',date '2026-12-05',time '09:00',time '09:00','รอบแรก / รอบแบ่งกลุ่ม','แข่งขันรอบแรกตามตารางที่คณะกรรมการกำหนด','เอกสารหน้า 8 ระบุรายงานตัว 09:00–09:30 น. และเริ่มแข่งขัน 09:00 น. เวลาเหลื่อมกัน โปรดยืนยัน'),
 ('GS3-ES-SM','ESPORT-2569-M-D2','ES-M-02',date '2026-12-06',time '09:00',time '10:00','รอบ Knockout 8 ทีมสุดท้าย','ทีมอันดับ 1–2 ของกลุ่ม A–D รวม 8 ทีม ตามข้อกำหนดหน้า 12','เวลาอ้างอิงกำหนดการหน้า 8; คู่แข่งขันรอผลรอบแบ่งกลุ่ม'),
 ('GS3-ES-SM','ESPORT-2569-M-D3-SF','ES-M-03',date '2026-12-07',time '09:00',time '10:00','รอบ 4 ทีมสุดท้าย','คู่แข่งขันตามผลรอบ Knockout','เวลาอ้างอิงกำหนดการหน้า 8'),
 ('GS3-ES-SM','ESPORT-2569-M-D3-F','ES-M-04',date '2026-12-07',time '09:00',time '13:00','รอบชิงชนะเลิศ','คู่แข่งขันตามผลรอบ 4 ทีมสุดท้าย','เวลาอ้างอิงกำหนดการหน้า 8'),
 ('GS3-ES-SF','ESPORT-2569-F-D1','ES-F-01',date '2026-12-05',time '09:00',time '09:00','รอบแรก / รอบแบ่งกลุ่ม','แข่งขันรอบแรกตามตารางที่คณะกรรมการกำหนด','เอกสารหน้า 8 ระบุรายงานตัว 09:00–09:30 น. และเริ่มแข่งขัน 09:00 น. เวลาเหลื่อมกัน โปรดยืนยัน'),
 ('GS3-ES-SF','ESPORT-2569-F-D2','ES-F-02',date '2026-12-06',time '09:00',time '10:00','รอบ Knockout 8 ทีมสุดท้าย','รอคณะกรรมการยืนยันจำนวนทีมที่ผ่านเข้ารอบจาก 2 กลุ่ม','เอกสารระบุ Knockout 8 ทีม แต่ไม่ได้ระบุเกณฑ์คัดเลือกทีมหญิงจาก 2 กลุ่ม'),
 ('GS3-ES-SF','ESPORT-2569-F-D3-SF','ES-F-03',date '2026-12-07',time '09:00',time '10:00','รอบ 4 ทีมสุดท้าย','คู่แข่งขันตามผลรอบ Knockout','รอการยืนยันรูปแบบคัดเลือกทีมหญิง'),
 ('GS3-ES-SF','ESPORT-2569-F-D3-F','ES-F-04',date '2026-12-07',time '09:00',time '13:00','รอบชิงชนะเลิศ','คู่แข่งขันตามผลรอบ 4 ทีมสุดท้าย','รอการยืนยันรูปแบบคัดเลือกทีมหญิง')
)
insert into public.sports_schedule_sessions(
 competition_id,event_id,seed_key,session_number,session_date,report_time,start_time,round_name,participants,
 venue_name,source_ref,review_note,status
)
select c.id,e.id,s.seed_key,s.session_number,s.session_date,s.report_time,s.start_time,s.round_name,s.participants,
 'หอประชุมโรงเรียนเชียงคำวิทยาคม','ระเบียบ E-SPORT หน้า 8',s.review_note,'draft'
from sessions s
join public.sports_competitions c on c.slug='phayao-secondary-group-sports-2569'
join public.sports_events e on e.competition_id=c.id and e.event_code=s.event_code
on conflict (competition_id,seed_key) do nothing;

commit;
