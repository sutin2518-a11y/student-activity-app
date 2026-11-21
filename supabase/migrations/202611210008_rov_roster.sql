begin;
alter table public.sports_athletes add column if not exists ign text, add column if not exists team_role text, add column if not exists play_position text;
create table if not exists public.sports_roster_staff(entry_id uuid primary key references public.sports_entries(id) on delete cascade, coaches jsonb not null);
alter table public.sports_roster_staff enable row level security;
revoke all on public.sports_roster_staff from public,anon,authenticated;
drop function if exists public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb);
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
 if e.stage3_source is not null and e.status <> 'registration' and p_entry is null then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 n:=jsonb_array_length(p_players);
 if coalesce(n,0)<1 or nullif(btrim(p_name),'') is null or exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'full_name'),'') is null)
 then raise exception 'กรุณากรอกชื่อทีมและรายชื่อนักกีฬาให้ครบ'; end if;
 if n>e.max_athletes_per_entry then raise exception 'จำนวนนักกีฬาเกินที่รายการกำหนด'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'student_code'),'') is not null group by btrim(x->>'student_code') having count(*)>1)
 then raise exception 'รหัสนักเรียนซ้ำภายในทีม'; end if;
 if e.gender_rule in ('ชาย','หญิง') and exists(select 1 from jsonb_array_elements(p_players) x where x->>'gender' is distinct from e.gender_rule)
 then raise exception 'เพศนักกีฬาไม่ตรงกับรายการ'; end if;
 if e.event_code in ('GS3-ES-SM','GS3-ES-SF') then
   if n not between 6 and 7 then raise exception 'ต้องมีตัวจริง 5 คน และตัวสำรอง 1–2 คน'; end if;
   if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1 then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
   if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
     regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
   then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูทุกคนให้ครบ'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'ign'),'') is null or coalesce(a->>'team_role','') not in ('หัวหน้าทีม','ตัวจริง','ตัวสำรอง'))
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='หัวหน้าทีม')<>1
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวจริง')<>4
   then raise exception 'กรุณาระบุชื่อในเกมทุกคน พร้อมหัวหน้าทีม 1 คน ตัวจริงอีก 4 คน และตัวสำรอง 1–2 คน'; end if;
   p_coach:=p_coaches->0->>'name'; p_assistant:=p_coaches->1->>'name';
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
 select saved,nullif(btrim(x->>'student_code'),''),btrim(x->>'full_name'),nullif(x->>'grade_level',''),nullif(x->>'gender',''),pos,case when team is not null then x->>'ign' end,case when team is not null then x->>'team_role' end,case when team is not null then nullif(x->>'play_position','') end
 from jsonb_array_elements(p_players) with ordinality a(x,pos);
 if team is not null then
   insert into public.sports_roster_staff(entry_id,coaches) values(saved,(
     select jsonb_agg(jsonb_build_object('name',btrim(c->>'name'),'phone',btrim(c->>'phone')) order by pos)
     from jsonb_array_elements(p_coaches) with ordinality x(c,pos)
   )) on conflict(entry_id) do update set coaches=excluded.coaches;
 end if;
 return saved;
end $$;

revoke all on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) to authenticated;
create or replace function public.sports_roster_details(p_entry uuid,p_team uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.sports_entries%rowtype;
begin
 select * into e from public.sports_entries where
 (p_team is null and id=p_entry) or (p_entry is null and esports_team_id=p_team and status='approved');
 if not found then return null; end if;
 if not public.sports_stage3_admin(e.competition_id) and not exists(
 select 1 from public.sports_user_roles where user_id=auth.uid() and is_active and role='school_manager'
 and school_id=e.school_id and (competition_id is null or competition_id=e.competition_id)
 ) then return null; end if;
 return jsonb_build_object('coach',e.coach_name,'assistant',e.assistant_coach,'coaches',(select s.coaches from public.sports_roster_staff s where s.entry_id=e.id),'players',coalesce((
 select jsonb_agg(jsonb_build_object('student_code',a.student_code,'full_name',a.full_name,'grade_level',a.grade_level,'gender',a.gender,'ign',a.ign,'team_role',a.team_role,'play_position',a.play_position)
 order by a.roster_position nulls last,a.full_name) from public.sports_athletes a where a.entry_id=e.id),'[]'::jsonb));
end $$;
revoke all on function public.sports_roster_details(uuid,uuid) from public,anon;
grant execute on function public.sports_roster_details(uuid,uuid) to authenticated;
commit;
