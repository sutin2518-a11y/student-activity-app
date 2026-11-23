-- v32: Four football categories, official fixtures (51 matches), private team rosters,
-- photograph-compatible athlete entries, and audit log.
-- Apply AFTER migration 0025. This migration never deletes existing sports records.
-- Official PDF schedules are seeded as DRAFT; main admin reviews and publishes them.
begin;

do $$ begin
  if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
      where c.slug='phayao-secondary-group-sports-2569'
        and e.event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF'))<>4 then
    raise exception 'Missing one or more football events from Stage 3 seed (expected 4). Run setup/01_seed_schedule_drafts.sql first.';
  end if;
end $$;

create table if not exists public.sports_football_group_teams (
 id uuid primary key default gen_random_uuid(),
 competition_id uuid not null references public.sports_competitions(id),
 event_id uuid not null references public.sports_events(id),
 group_code text not null check(group_code in ('A','B','C','D')),
 seed_order integer not null check(seed_order between 1 and 30),
 school_name text not null check(length(btrim(school_name)) between 1 and 200),
 unique(event_id,group_code,school_name),
 unique(event_id,group_code,seed_order)
);
create index if not exists sports_football_group_teams_event_idx on public.sports_football_group_teams(event_id,group_code,seed_order);

create table if not exists public.sports_football_matches (
 id uuid primary key default gen_random_uuid(),
 competition_id uuid not null references public.sports_competitions(id),
 event_id uuid not null references public.sports_events(id),
 match_no integer not null check(match_no between 1 and 1000),
 stage text not null check(stage in ('group','quarter','semifinal','final')),
 group_code text check(group_code in ('A','B','C','D')),
 team1_name text not null default '',
 team2_name text not null default '',
 source_participants text not null default '',
 scheduled_date date,
 start_time time,
 venue_name text not null default '',
 status text not null default 'draft' check(status in ('draft','published','completed','cancelled')),
 score1 smallint check(score1 is null or score1 between 0 and 99),
 score2 smallint check(score2 is null or score2 between 0 and 99),
 penalty1 smallint check(penalty1 is null or penalty1 between 0 and 99),
 penalty2 smallint check(penalty2 is null or penalty2 between 0 and 99),
 notes text not null default '',
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 unique(event_id,match_no),
 check ((stage='group' and group_code is not null) or (stage<>'group' and group_code is null)),
 check ((score1 is null and score2 is null) or (score1 is not null and score2 is not null)),
 check ((penalty1 is null and penalty2 is null) or (penalty1 is not null and penalty2 is not null)),
 check (status <> 'completed' or (score1 is not null and score2 is not null)),
 check (status <> 'completed' or score1<>score2 or (penalty1 is not null and penalty1<>penalty2)),
 check (status not in ('published','completed') or (scheduled_date is not null and start_time is not null))
);
create index if not exists sports_football_matches_event_time_idx on public.sports_football_matches(event_id,scheduled_date,start_time);

create table if not exists public.sports_football_match_history (
 id bigint generated always as identity primary key,
 match_id uuid not null references public.sports_football_matches(id) on delete cascade,
 event_id uuid not null references public.sports_events(id),
 changed_at timestamptz not null default now(),
 changed_by uuid references auth.users(id) on delete set null,
 before_data jsonb not null,
 after_data jsonb not null
);

create or replace function public.sports_football_track_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new is distinct from old then
  new.updated_at := now(); new.updated_by := auth.uid();
  insert into public.sports_football_match_history(match_id,event_id,changed_by,before_data,after_data)
  values(old.id,old.event_id,auth.uid(),to_jsonb(old),to_jsonb(new));
 end if;
 return new;
end $$;
drop trigger if exists sports_football_matches_audit on public.sports_football_matches;
create trigger sports_football_matches_audit before update on public.sports_football_matches
for each row execute function public.sports_football_track_change();

-- Public only sees published fixtures, no personal registration details.
revoke all on public.sports_football_group_teams,public.sports_football_matches,public.sports_football_match_history from public,anon,authenticated;
grant select on public.sports_football_group_teams,public.sports_football_matches to anon,authenticated;
grant select on public.sports_football_match_history to authenticated;
grant update on public.sports_football_matches to authenticated;
grant update on public.sports_football_group_teams to authenticated;
alter table public.sports_football_group_teams enable row level security;
alter table public.sports_football_matches enable row level security;
alter table public.sports_football_match_history enable row level security;
drop policy if exists "football groups visible" on public.sports_football_group_teams;
create policy "football groups visible" on public.sports_football_group_teams for select to anon,authenticated using (
 public.sports_stage3_admin(competition_id) or exists(select 1 from public.sports_events e where e.id=event_id and e.status<>'draft')
);
drop policy if exists "football groups admin edit" on public.sports_football_group_teams;
create policy "football groups admin edit" on public.sports_football_group_teams for update to authenticated
using(public.sports_stage3_admin(competition_id)) with check(public.sports_stage3_admin(competition_id));
drop policy if exists "football matches visible" on public.sports_football_matches;
create policy "football matches visible" on public.sports_football_matches for select to anon,authenticated using (
 public.sports_stage3_admin(competition_id) or (status in ('published','completed','cancelled') and exists(
 select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'))
);
drop policy if exists "football matches admin edit" on public.sports_football_matches;
create policy "football matches admin edit" on public.sports_football_matches for update to authenticated
using(public.sports_stage3_admin(competition_id)) with check(public.sports_stage3_admin(competition_id));
drop policy if exists "football audit admin read" on public.sports_football_match_history;
create policy "football audit admin read" on public.sports_football_match_history for select to authenticated using (
 exists(select 1 from public.sports_football_matches m where m.id=match_id and public.sports_stage3_admin(m.competition_id))
);

-- Additional fields are stored separately so generic registrations/other sports are unchanged.
create table if not exists public.sports_football_player_details (
 entry_id uuid not null references public.sports_entries(id) on delete cascade,
 roster_position integer not null check(roster_position between 1 and 20),
 birth_date date,
 jersey_number integer check(jersey_number between 0 and 99),
 player_role text not null default '' check(length(player_role)<60),
 player_note text not null default '' check(length(player_note)<300),
 primary key(entry_id,roster_position)
);
-- Never expose names, birthdays, phone numbers or photos to anonymous users.
revoke all on public.sports_football_player_details from public,anon,authenticated;
alter table public.sports_football_player_details enable row level security;

-- Atomic football registration. School may edit its existing received roster without
-- re-registering. Roster photos remain private and are tied to entry ID + name + position.
create or replace function public.sports_football_register(
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
 if v_event.event_code not in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF') then raise exception 'ไม่ใช่รายการฟุตบอล'; end if;
 v_admin := public.sports_stage3_admin(v_event.competition_id);
 if not v_admin and not exists(select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.role='school_manager' and r.is_active and r.school_id=p_school
    and (r.competition_id is null or r.competition_id=v_event.competition_id))
  then raise exception 'ไม่มีสิทธิ์จัดการทีมโรงเรียนนี้' using errcode='42501'; end if;
 if not v_admin and v_event.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 if p_players is null or jsonb_typeof(p_players)<>'array' then raise exception 'รูปแบบข้อมูลนักกีฬาไม่ถูกต้อง'; end if;
 v_count := jsonb_array_length(p_players);
 if v_count<1 or v_count>20 then raise exception 'ลงทะเบียนนักกีฬาได้ 1–20 คนต่อทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'full_name'),'') is null
    or nullif(a->>'birth_date','') is null or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')
  then raise exception 'กรุณากรอกชื่อ วันเกิด และเบอร์เสื้อทุกคน'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number') having count(*)>1)
  then raise exception 'มีหมายเลขเสื้อซ้ำในทีม'; end if;
 if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1 then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
    regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมให้ครบ'; end if;
 -- Avoid duplicate registrations from concurrent browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),pg_catalog.hashtext(p_school::text));
 select e.id into v_id from public.sports_entries e where e.event_id=p_event and e.school_id=p_school
  and e.status<>'withdrawn' order by e.created_at limit 1 for update;
 select name into v_name from public.sports_schools where id=p_school;
 if v_name is null then raise exception 'ไม่พบโรงเรียน'; end if;
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
 delete from public.sports_football_player_details where entry_id=v_id;
 insert into public.sports_football_player_details(entry_id,roster_position,birth_date,jersey_number,player_role,player_note)
 select v_id,pos,nullif(a->>'birth_date','')::date,(a->>'jersey_number')::int,
   left(coalesce(a->>'player_role',''),59),left(coalesce(a->>'player_note',''),299)
 from jsonb_array_elements(p_players) with ordinality x(a,pos);
 return v_id;
end $$;
revoke all on function public.sports_football_register(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.sports_football_register(uuid,uuid,jsonb,jsonb) to authenticated;

-- Private roster retrieval for owner school or competition admin; no public athlete list.
create or replace function public.sports_football_roster_details(p_entry uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_entry record; v_players jsonb; v_coaches jsonb;
begin
 select e.id,e.event_id,e.school_id,e.competition_id,e.entry_name,e.status,s.name as school_name,s.director_name,ev.sport_name
 into v_entry from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 join public.sports_events ev on ev.id=e.event_id
 where e.id=p_entry and ev.event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF');
 if not found then raise exception 'ไม่พบใบสมัครฟุตบอล'; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(v_entry.competition_id) or exists (
  select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
    and r.school_id=v_entry.school_id and (r.competition_id is null or r.competition_id=v_entry.competition_id)))
  then raise exception 'ไม่มีสิทธิ์ดูข้อมูลนักกีฬา' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('full_name',a.full_name,'student_code',a.student_code,
   'birth_date',d.birth_date,'jersey_number',d.jersey_number,'player_role',d.player_role,'player_note',d.player_note)
   order by a.roster_position),'[]'::jsonb) into v_players
 from public.sports_athletes a left join public.sports_football_player_details d on d.entry_id=a.entry_id and d.roster_position=a.roster_position
 where a.entry_id=p_entry;
 select coalesce(coaches,'[]'::jsonb) into v_coaches from public.sports_roster_staff where entry_id=p_entry;
 return jsonb_build_object('id',v_entry.id,'event_id',v_entry.event_id,'school_id',v_entry.school_id,
   'school_name',v_entry.school_name,'director_name',v_entry.director_name,'sport_name',v_entry.sport_name,
   'status',v_entry.status,'players',v_players,'coaches',coalesce(v_coaches,'[]'::jsonb));
end $$;
revoke all on function public.sports_football_roster_details(uuid) from public,anon;
grant execute on function public.sports_football_roster_details(uuid) to authenticated;

-- Explicit private roster listing; uses same ownership rules as details.
create or replace function public.sports_football_my_entries(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_admin boolean;
begin
 select competition_id into v_comp from public.sports_events where id=p_event and event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF');
 if v_comp is null or auth.uid() is null then return '[]'::jsonb; end if;
 v_admin:=public.sports_stage3_admin(v_comp);
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'school_id',e.school_id,'school_name',s.name,'status',e.status,
   'athlete_count',(select count(*) from public.sports_athletes a where a.entry_id=e.id)) order by s.name)
 from public.sports_entries e join public.sports_schools s on s.id=e.school_id
 where e.event_id=p_event and e.status<>'withdrawn' and (v_admin or exists(
   select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.role='school_manager' and r.is_active
   and r.school_id=e.school_id and (r.competition_id is null or r.competition_id=v_comp))) ),'[]'::jsonb);
end $$;
revoke all on function public.sports_football_my_entries(uuid) from public,anon;
grant execute on function public.sports_football_my_entries(uuid) to authenticated;

-- All 51 original fixtures: 9 U13 boys + 17 U15 boys + 16 open boys + 9 open girls.
-- Do not overwrite schedule or results when a migration is retried.
with src(event_code,name,venue_name) as (values
('GS3-FB-13M','ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย','โรงเรียนภูซางวิทยาคม'),
('GS3-FB-15M','ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย','โรงเรียนฝายกวางวิทยาคม'),
('GS3-FB-UM','ฟุตบอล รุ่นไม่จำกัดอายุ ชาย','โรงเรียนเชียงคำวิทยาคม'),
('GS3-FB-UF','ฟุตบอล รุ่นไม่จำกัดอายุ หญิง','โรงเรียนภูซางวิทยาคม')
)
update public.sports_events e set sport_name=src.name,venue_name=src.venue_name,
  max_athletes_per_entry=20, points_win=3, points_draw=0, points_loss=0,
  updated_at=now()
from src where e.event_code=src.event_code and e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569');

with src(event_code,group_code,seed_order,school_name) as (values
('GS3-FB-13M','A',1,'เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'),
('GS3-FB-13M','A',2,'เชียงคำวิทยาคม'),
('GS3-FB-13M','A',3,'พะเยาพิทยาคม'),
('GS3-FB-13M','B',1,'ภูซางวิทยาคม'),
('GS3-FB-13M','B',2,'ปงรัชดาภิเษก'),
('GS3-FB-13M','B',3,'จุนวิทยาคม'),
('GS3-FB-UF','A',1,'ปงรัชดาภิเษก'),
('GS3-FB-UF','A',2,'ภูซางวิทยาคม'),
('GS3-FB-UF','A',3,'ฝายกวางวิทยาคม'),
('GS3-FB-UF','B',1,'ปงพัฒนาวิทยาคม'),
('GS3-FB-UF','B',2,'ดอกคำใต้วิทยาคม'),
('GS3-FB-UF','B',3,'ราชประชานุเคราะห์ 24'),
('GS3-FB-15M','A',1,'เชียงคำวิทยาคม'),
('GS3-FB-15M','A',2,'ปงรัชดาภิเษก'),
('GS3-FB-15M','A',3,'ภูซางวิทยาคม'),
('GS3-FB-15M','B',1,'ดงเจนวิทยาคม'),
('GS3-FB-15M','B',2,'ราชประชานุเคราะห์ 24'),
('GS3-FB-15M','B',3,'เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'),
('GS3-FB-15M','C',1,'ปงพัฒนาวิทยาคม'),
('GS3-FB-15M','C',2,'พะเยาพิทยาคม'),
('GS3-FB-15M','C',3,'จุนวิทยาคม'),
('GS3-FB-15M','D',1,'ดอกคำใต้วิทยาคม'),
('GS3-FB-15M','D',2,'แม่ใจวิทยาคม'),
('GS3-FB-UM','A',1,'จุนวิทยาคม'),
('GS3-FB-UM','A',2,'แม่ใจวิทยาคม'),
('GS3-FB-UM','A',3,'พะเยาพิทยาคม'),
('GS3-FB-UM','B',1,'ปงพัฒนาวิทยาคม'),
('GS3-FB-UM','B',2,'ปงรัชดาภิเษก'),
('GS3-FB-UM','B',3,'ภูซางวิทยาคม'),
('GS3-FB-UM','C',1,'เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'),
('GS3-FB-UM','C',2,'ดงเจนวิทยาคม'),
('GS3-FB-UM','C',3,'เชียงคำวิทยาคม')
)
insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,src.group_code,src.seed_order,src.school_name from src join public.sports_events e on e.event_code=src.event_code
join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,group_code,school_name) do nothing;

with src(event_code,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants) as (values
('GS3-FB-13M',1,'2026-11-30','09:30','group','A','เฉลิมพระเกียรติ','เชียงคำวิทยาคม','โรงเรียนภูซางวิทยาคม','เฉลิมพระเกียรติ พบ เชียงคำวิทยาคม'),
('GS3-FB-13M',2,'2026-11-30','10:30','group','B','ภูซางวิทยาคม','ปงรัชดาภิเษก','โรงเรียนภูซางวิทยาคม','ภูซางวิทยาคม พบ ปงรัชดาภิเษก'),
('GS3-FB-13M',5,'2026-12-01','09:30','group','A','เชียงคำวิทยาคม','พะเยาพิทยาคม','โรงเรียนภูซางวิทยาคม','เชียงคำวิทยาคม พบ พะเยาพิทยาคม'),
('GS3-FB-13M',6,'2026-12-01','10:30','group','B','ปงรัชดาภิเษก','จุนวิทยาคม','โรงเรียนภูซางวิทยาคม','ปงรัชดาภิเษก พบ จุนวิทยาคม'),
('GS3-FB-13M',9,'2026-12-02','09:30','group','A','เฉลิมพระเกียรติ','พะเยาพิทยาคม','โรงเรียนภูซางวิทยาคม','เฉลิมพระเกียรติ พบ พะเยาพิทยาคม'),
('GS3-FB-13M',10,'2026-12-02','10:30','group','B','ภูซางวิทยาคม','จุนวิทยาคม','โรงเรียนภูซางวิทยาคม','ภูซางวิทยาคม พบ จุนวิทยาคม'),
('GS3-FB-13M',13,'2026-12-03','09:30','semifinal',null,'ที่ 1 สาย A','ที่ 2 สาย B','โรงเรียนภูซางวิทยาคม','ที่ 1 สาย A พบ ที่ 2 สาย B'),
('GS3-FB-13M',14,'2026-12-03','10:30','semifinal',null,'ที่ 1 สาย B','ที่ 2 สาย A','โรงเรียนภูซางวิทยาคม','ที่ 1 สาย B พบ ที่ 2 สาย A'),
('GS3-FB-13M',17,'2026-12-04','09:30','final',null,'คู่ที่ชนะคู่ที่13','คู่ที่ชนะคู่ที่14','โรงเรียนภูซางวิทยาคม','คู่ที่ชนะคู่ที่13 พบ คู่ที่ชนะคู่ที่14'),
('GS3-FB-15M',1,'2026-12-02','09:00','group','A','เชียงคำวิทยาคม','ปงรัชดาภิเษก','โรงเรียนฝายกวางวิทยาคม','เชียงคำวิทยาคม พบ ปงรัชดาภิเษก'),
('GS3-FB-15M',2,'2026-12-02','10:00','group','B','ดงเจนวิทยาคม','ราชประชานุเคราะห์ 24','โรงเรียนฝายกวางวิทยาคม','ดงเจนวิทยาคม พบ ราชประชานุเคราะห์ 24'),
('GS3-FB-15M',3,'2026-12-02','13:00','group','C','ปงพัฒนาวิทยาคม','พะเยาพิทยาคม','โรงเรียนฝายกวางวิทยาคม','ปงพัฒนาวิทยาคม พบ พะเยาพิทยาคม'),
('GS3-FB-15M',4,'2026-12-02','14:00','group','D','ดอกคำใต้วิทยาคม','แม่ใจวิทยาคม','โรงเรียนฝายกวางวิทยาคม','ดอกคำใต้วิทยาคม พบ แม่ใจวิทยาคม'),
('GS3-FB-15M',5,'2026-12-03','09:00','group','C','ปงพัฒนาวิทยาคม','จุนวิทยาคม','โรงเรียนฝายกวางวิทยาคม','ปงพัฒนาวิทยาคม พบ จุนวิทยาคม'),
('GS3-FB-15M',6,'2026-12-03','10:00','group','B','ดงเจนวิทยาคม','เฉลิมพระเกียรติฯ พะเยา','โรงเรียนฝายกวางวิทยาคม','ดงเจนวิทยาคม พบ เฉลิมพระเกียรติฯ พะเยา'),
('GS3-FB-15M',7,'2026-12-03','13:00','group','A','เชียงคำวิทยาคม','ภูซางวิทยาคม','โรงเรียนฝายกวางวิทยาคม','เชียงคำวิทยาคม พบ ภูซางวิทยาคม'),
('GS3-FB-15M',8,'2026-12-04','09:00','group','A','ปงรัชดาภิเษก','ภูซางวิทยาคม','โรงเรียนฝายกวางวิทยาคม','ปงรัชดาภิเษก พบ ภูซางวิทยาคม'),
('GS3-FB-15M',9,'2026-12-04','10:00','group','B','ราชประชานุเคราะห์ 24','เฉลิมพระเกียรติฯ พะเยา','โรงเรียนฝายกวางวิทยาคม','ราชประชานุเคราะห์ 24 พบ เฉลิมพระเกียรติฯ พะเยา'),
('GS3-FB-15M',10,'2026-12-04','13:00','group','C','พะเยาพิทยาคม','จุนวิทยาคม','โรงเรียนฝายกวางวิทยาคม','พะเยาพิทยาคม พบ จุนวิทยาคม'),
('GS3-FB-15M',11,'2026-12-05','09:00','quarter',null,'ที่ 1 สาย A','ที่ 2 สาย C','โรงเรียนฝายกวางวิทยาคม','ที่ 1 สาย A พบ ที่ 2 สาย C'),
('GS3-FB-15M',12,'2026-12-05','10:00','quarter',null,'ที่ 1 สาย C','ที่ 2 สาย A','โรงเรียนฝายกวางวิทยาคม','ที่ 1 สาย C พบ ที่ 2 สาย A'),
('GS3-FB-15M',13,'2026-12-05','13:00','quarter',null,'ที่ 1 สาย B','ที่ 2 สาย D','โรงเรียนฝายกวางวิทยาคม','ที่ 1 สาย B พบ ที่ 2 สาย D'),
('GS3-FB-15M',14,'2026-12-05','14:00','quarter',null,'ที่ 1 สาย D','ที่ 2 สาย B','โรงเรียนฝายกวางวิทยาคม','ที่ 1 สาย D พบ ที่ 2 สาย B'),
('GS3-FB-15M',15,'2026-12-06','09:00','semifinal',null,'คู่ชนะคู่ที่ 11','คู่ชนะคู่ที่ 13','โรงเรียนฝายกวางวิทยาคม','คู่ชนะคู่ที่ 11 พบ คู่ชนะคู่ที่ 13'),
('GS3-FB-15M',16,'2026-12-06','10:00','semifinal',null,'คู่ชนะคู่ที่ 12','คู่ชนะคู่ที่ 14','โรงเรียนฝายกวางวิทยาคม','คู่ชนะคู่ที่ 12 พบ คู่ชนะคู่ที่ 14'),
('GS3-FB-15M',17,'2026-12-07','10:00','final',null,'คู่ชนะคู่ที่ 15','คู่ชนะคู่ที่ 16','โรงเรียนฝายกวางวิทยาคม','คู่ชนะคู่ที่ 15 พบ คู่ชนะคู่ที่ 16'),
('GS3-FB-UM',1,'2026-11-30','10:00','group','A','จุนวิทยาคม','แม่ใจวิทยาคม','โรงเรียนเชียงคำวิทยาคม','จุนวิทยาคม – แม่ใจวิทยาคม'),
('GS3-FB-UM',2,'2026-11-30','12:00','group','B','ปงพัฒนาวิทยคม','ปงรัชดาภิเษก','โรงเรียนเชียงคำวิทยาคม','ปงพัฒนาวิทยคม – ปงรัชดาภิเษก'),
('GS3-FB-UM',3,'2026-11-30','14:00','group','C','เฉลิมพระเกียรติ','เชียงคำวิทยาคม','โรงเรียนเชียงคำวิทยาคม','เฉลิมพระเกียรติ - เชียงคำวิทยาคม'),
('GS3-FB-UM',4,'2026-12-02','10:00','group','A','จุนวิทยาคม','พะเยาพิทยาคม','โรงเรียนเชียงคำวิทยาคม','จุนวิทยาคม - พะเยาพิทยาคม'),
('GS3-FB-UM',5,'2026-12-02','12:00','group','B','ปงพัฒนาวิทยาคม','ภูซางวิทยาคม','โรงเรียนเชียงคำวิทยาคม','ปงพัฒนาวิทยาคม – ภูซางวิทยาคม'),
('GS3-FB-UM',6,'2026-12-02','14:00','group','C','เชียงคำวิทยาคม','ดงเจนวิทยาคม','โรงเรียนเชียงคำวิทยาคม','เชียงคำวิทยาคม– ดงเจนวิทยาคม'),
('GS3-FB-UM',7,'2026-12-03','10:00','group','A','แม่ใจวิทยาคม','พะเยาพิทยาคม','โรงเรียนเชียงคำวิทยาคม','แม่ใจวิทยาคม– พะเยาพิทยาคม'),
('GS3-FB-UM',8,'2026-12-03','12:00','group','B','ปงรัชดาภิเษก','ภูซางวิทยาคม','โรงเรียนเชียงคำวิทยาคม','ปงรัชดาภิเษก - ภูซางวิทยาคม'),
('GS3-FB-UM',9,'2026-12-03','14:00','group','C','เฉลิมพระเกียรติ','ดงเจนวิทยาคม','โรงเรียนเชียงคำวิทยาคม','เฉลิมพระเกียรติ – ดงเจนวิทยาคม'),
('GS3-FB-UM',10,'2026-12-05','09:00','quarter',null,'จับสลาก 1','จับสลาก 2','โรงเรียนเชียงคำวิทยาคม','จับสลาก 1 - จับสลาก 2'),
('GS3-FB-UM',11,'2026-12-05','10:30','quarter',null,'จับสลาก 3','จับสลาก 4','โรงเรียนเชียงคำวิทยาคม','จับสลาก 3 - จับสลาก 4'),
('GS3-FB-UM',12,'2026-12-05','13:00','quarter',null,'จับสลาก 5','จับสลาก 6','โรงเรียนเชียงคำวิทยาคม','จับสลาก 5 - จับสลาก 6'),
('GS3-FB-UM',13,'2026-12-05','14:30','quarter',null,'จับสลาก 7','จับสลาก 8','โรงเรียนเชียงคำวิทยาคม','จับสลาก 7 - จับสลาก 8'),
('GS3-FB-UM',14,'2026-12-06','10:00','semifinal',null,'ผู้ชนะคู่ที่ 10','ผู้ชนะคู่ที่ 11','โรงเรียนเชียงคำวิทยาคม','ผู้ชนะคู่ที่ 10 - ผู้ชนะคู่ที่ 11'),
('GS3-FB-UM',15,'2026-12-06','12:00','semifinal',null,'ผู้ชนะคู่ที่ 12','ผู้ชนะคู่ที่ 13','โรงเรียนเชียงคำวิทยาคม','ผู้ชนะคู่ที่ 12 - ผู้ชนะคู่ที่ 13'),
('GS3-FB-UM',16,'2026-12-07','10:00','final',null,'ผู้ชนะคู่ที่ 14','ผู้ชนะคู่ที่ 15','โรงเรียนเชียงคำวิทยาคม','ผู้ชนะคู่ที่ 14 - ผู้ชนะคู่ที่ 15'),
('GS3-FB-UF',3,'2026-11-30','13:00','group','A','ปงรัชดาภิเษก','ภูซางวิทยาคม','โรงเรียนภูซางวิทยาคม','ปงรัชดาภิเษก พบ ภูซางวิทยาคม'),
('GS3-FB-UF',4,'2026-11-30','14:00','group','B','ปงพัฒนาวิทยาคม','ดอกคำใต้วิทยาคม','โรงเรียนภูซางวิทยาคม','ปงพัฒนาวิทยาคม พบ ดอกคำใต้วิทยาคม'),
('GS3-FB-UF',7,'2026-12-01','13:00','group','A','ภูซางวิทยาคม','ฝายกวางวิทยาคม','โรงเรียนภูซางวิทยาคม','ภูซางวิทยาคม พบ ฝายกวางวิทยาคม'),
('GS3-FB-UF',8,'2026-12-01','14:00','group','B','ดอกคำใต้วิทยาคม','ราชประชานุเคราะห์ 24','โรงเรียนภูซางวิทยาคม','ดอกคำใต้วิทยาคม พบ ราชประชานุเคราะห์ 24'),
('GS3-FB-UF',11,'2026-12-02','13:00','group','A','ปงรัชดาภิเษก','ฝายกวางวิทยาคม','โรงเรียนภูซางวิทยาคม','ปงรัชดาภิเษก พบ ฝายกวางวิทยาคม'),
('GS3-FB-UF',12,'2026-12-02','14:00','group','B','ปงพัฒนาวิทยาคม','ราชประชานุเคราะห์ 24','โรงเรียนภูซางวิทยาคม','ปงพัฒนาวิทยาคม พบ ราชประชานุเคราะห์ 24'),
('GS3-FB-UF',15,'2026-12-03','13:00','semifinal',null,'ที่ 1 สาย A','ที่ 2 สาย B','โรงเรียนภูซางวิทยาคม','ที่ 1 สาย A พบ ที่ 2 สาย B'),
('GS3-FB-UF',16,'2026-12-03','14:00','semifinal',null,'ที่ 1 สาย B','ที่ 2 สาย A','โรงเรียนภูซางวิทยาคม','ที่ 1 สาย B พบ ที่ 2 สาย A'),
('GS3-FB-UF',18,'2026-12-04','10:30','final',null,'คู่ที่ชนะคู่ที่15','คู่ที่ชนะคู่ที่16','โรงเรียนภูซางวิทยาคม','คู่ที่ชนะคู่ที่15 พบ คู่ที่ชนะคู่ที่16')
)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants)
select e.competition_id,e.id,src.match_no,src.scheduled_date::date,src.start_time::time,src.stage,src.group_code,src.team1_name,src.team2_name,src.venue_name,src.source_participants
from src join public.sports_events e on e.event_code=src.event_code
join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,match_no) do nothing;

-- Prevent accidental duplicate kickoff slots at the same football field,
-- including the U13 boys/open girls events sharing Phu Sang stadium.
create unique index if not exists sports_football_venue_start_unique
on public.sports_football_matches(venue_name,scheduled_date,start_time)
where scheduled_date is not null and start_time is not null and status <> 'cancelled';

commit;
notify pgrst, 'reload schema';
