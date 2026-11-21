begin;

-- All sports now register athletes without grade and gender fields.
-- The event's category/rule still exists; schools must check eligibility.
-- RoV continues to require five starters and allows zero to two reserves.
-- Historical grade/gender data in existing registrations is preserved.
alter table public.sports_athletes
  alter column grade_level drop not null,
  alter column gender drop not null;

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
 if e.event_code in ('GS3-ES-SM','GS3-ES-SF') then
   if n not between 5 and 7 then raise exception 'ต้องมีผู้เล่นหลัก 5 คน และตัวสำรองเพิ่มได้ไม่เกิน 2 คน (ไม่บังคับ)'; end if;
   if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1 then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
   if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
     regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
   then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูทุกคนให้ครบ'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'ign'),'') is null or coalesce(a->>'team_role','') not in ('หัวหน้าทีม','ตัวจริง','ตัวสำรอง'))
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='หัวหน้าทีม')<>1
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวจริง')<>4
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวสำรอง')>2
   then raise exception 'กรุณาระบุชื่อในเกมทุกคน พร้อมหัวหน้าทีม 1 คน ตัวจริงอีก 4 คน และตัวสำรองไม่เกิน 2 คน (ไม่บังคับ)'; end if;
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
 select saved,nullif(btrim(x->>'student_code'),''),btrim(x->>'full_name'),null,null,pos,case when team is not null then x->>'ign' end,case when team is not null then x->>'team_role' end,case when team is not null then nullif(x->>'play_position','') end
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


-- One file can register multiple individuals in an event with exactly one athlete
-- per entry. The complete operation runs in one transaction: no partial imports.
create or replace function public.sports_register_individual_batch(
  p_event uuid, p_school uuid, p_coach text, p_players jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  e public.sports_events%rowtype;
  item jsonb;
  created uuid;
  saved jsonb := '[]'::jsonb;
  n integer;
  athlete_name text;
  athlete_code text;
begin
  select * into strict e from public.sports_events where id=p_event for share;
  if auth.uid() is null or not (public.sports_stage3_admin(e.competition_id) or exists(
    select 1 from public.sports_user_roles where user_id=auth.uid() and is_active and role='school_manager'
    and school_id=p_school and (competition_id=e.competition_id or competition_id is null)
  )) then raise exception 'ไม่มีสิทธิ์ลงทะเบียนให้โรงเรียนนี้'; end if;
  if e.event_type = 'team' or e.max_athletes_per_entry is distinct from 1 then
    raise exception 'นำเข้าหลายใบสมัครได้เฉพาะกีฬาเดี่ยวหรือกรีฑาที่รับนักกีฬาหนึ่งคนต่อใบสมัคร';
  end if;
  if e.stage3_source is not null and e.status <> 'registration' then
    raise exception 'รายการนี้ยังไม่เปิดรับสมัคร';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'รูปแบบรายชื่อไม่ถูกต้อง';
  end if;
  n := jsonb_array_length(p_players);
  if n < 2 or n > 100 then raise exception 'นำเข้าได้ครั้งละ 2–100 คน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'full_name'),'') is null)
  then raise exception 'กรุณากรอกชื่อ-สกุลของนักกีฬาทุกคน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) x
    where nullif(btrim(x->>'student_code'),'') is not null
    group by btrim(x->>'student_code') having count(*)>1)
  then raise exception 'รหัสนักเรียนซ้ำภายในไฟล์'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) x
    group by btrim(x->>'full_name') having count(*)>1)
  then raise exception 'พบชื่อนักกีฬาซ้ำภายในไฟล์ กรุณาตรวจสอบ'; end if;

  -- Serialize registrations for the same event/school to avoid duplicate parallel imports.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text), pg_catalog.hashtext(p_school::text));
  for item in select value from jsonb_array_elements(p_players) loop
    athlete_name := btrim(item->>'full_name');
    athlete_code := nullif(btrim(item->>'student_code'),'');
    if exists (
      select 1 from public.sports_entries existing_entry
      join public.sports_athletes existing_player on existing_player.entry_id=existing_entry.id
      where existing_entry.event_id=p_event and existing_entry.school_id=p_school
        and existing_entry.status <> 'withdrawn'
        and ((athlete_code is not null and existing_player.student_code=athlete_code)
             or btrim(existing_player.full_name)=athlete_name)
    ) then raise exception 'นักกีฬา % มีใบสมัครในรายการนี้แล้ว', athlete_name; end if;
    created := public.sports_register_roster(
      null::uuid,p_event,p_school,athlete_name,p_coach,null::text,jsonb_build_array(item),null::jsonb
    );
    saved := saved || jsonb_build_array(jsonb_build_object('id',created,'entry_name',athlete_name));
  end loop;
  return saved;
end $$;

revoke all on function public.sports_register_individual_batch(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.sports_register_individual_batch(uuid,uuid,text,jsonb) to authenticated;

commit;
