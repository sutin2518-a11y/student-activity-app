begin;
-- New private sport-specific fields; existing roster, awards and photo bucket remain in use.
create table if not exists public.sports_takraw_player_forms (
 athlete_id uuid primary key references public.sports_athletes(id) on delete cascade,
 birth_date date not null, jersey_number integer not null check(jersey_number between 1 and 36)
);
alter table public.sports_takraw_player_forms enable row level security;
revoke all on public.sports_takraw_player_forms from public,anon,authenticated;
create or replace function public.sports_takraw_save_form(p_entry uuid,p_event uuid,p_school uuid,p_players jsonb,p_staff jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; saved uuid; a jsonb; aid uuid; pos int:=0; school text; d date; old_players jsonb:='[]'; old_staff jsonb:='[]';
begin
 select * into strict e from public.sports_events where id=p_event for share;
 if not public.sports_is_takraw(e.id) or not exists(select 1 from public.sports_competitions c where c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569') then raise exception 'รายการนี้ไม่ใช่เซปักตะกร้อกีฬากลุ่ม 2569'; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=p_school and (r.competition_id=e.competition_id or r.competition_id is null))) then raise exception 'ไม่มีสิทธิ์ลงทะเบียนให้โรงเรียนนี้'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262643);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
 if e.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 select sc.name into school from public.sports_schools sc join public.sports_football_group_teams t on t.school_name=sc.name where sc.id=p_school and t.event_id=p_event limit 1;
 if school is null then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
 if jsonb_typeof(p_players) is distinct from 'array' or jsonb_typeof(p_staff) is distinct from 'array' then raise exception 'รูปแบบข้อมูลไม่ถูกต้อง'; end if;
 if jsonb_array_length(p_players) not between 3 and 5 or jsonb_array_length(p_players)>e.max_athletes_per_entry or jsonb_array_length(p_staff)<>3 then raise exception 'นักกีฬา 3–5 คน เจ้าหน้าที่ 3 คน'; end if;
 for a in select value from jsonb_array_elements(p_players) loop
   if nullif(btrim(a->>'full_name'),'') is null or length(a->>'full_name')>160 or coalesce(a->>'jersey_number','') !~ '^[0-9]{1,2}$' or coalesce(a->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'ข้อมูลนักกีฬาไม่ครบ'; end if;
   d:=(a->>'birth_date')::date;
   if d<date '1900-01-01' or d>(now() at time zone 'Asia/Bangkok')::date or (e.event_code in ('GS3-ST-15M','GS3-ST-15F') and d<date '2011-01-01') or (a->>'jersey_number')::integer not between 1 and 36 then raise exception 'ตรวจวันเกิดหรือหมายเลขเสื้อ 1–36'; end if;
 end loop;
 for a in select value from jsonb_array_elements(p_staff) loop
   if nullif(btrim(a->>'name'),'') is null or length(a->>'name')>160 then raise exception 'กรอกชื่อเจ้าหน้าที่ทั้ง 3 ตำแหน่ง'; end if;
   if coalesce(a->>'birth_date','')<>'' then
     if a->>'birth_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'วันเกิดเจ้าหน้าที่ไม่ถูกต้อง'; end if;
     d:=(a->>'birth_date')::date;
     if d<date '1900-01-01' or d>(now() at time zone 'Asia/Bangkok')::date then raise exception 'วันเกิดเจ้าหน้าที่ไม่ถูกต้อง'; end if;
   end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number')::integer having count(*)>1) or exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อหรือหมายเลขเสื้อซ้ำ'; end if;
 if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_takraw(en.event_id)) then raise exception 'นักกีฬาซ้ำในรุ่นเซปักตะกร้ออื่น'; end if;
 if p_entry is null then
   insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status) values(e.competition_id,e.id,p_school,'team',school,btrim(p_staff->1->>'name'),btrim(p_staff->2->>'name'),'submitted') returning id into saved;
 else
   update public.sports_entries set coach_name=btrim(p_staff->1->>'name'),assistant_coach=btrim(p_staff->2->>'name'),status='submitted',approved_by=null,return_reason=null,updated_at=now() where id=p_entry and competition_id=e.competition_id and school_id=p_school and event_id=e.id and (status='rejected' or (status in ('approved','submitted') and public.sports_stage3_admin(e.competition_id))) returning id into saved;
   if saved is null then raise exception 'แก้ไขได้เฉพาะใบสมัครที่ถูกส่งคืนหรือโดยผู้ดูแลระหว่างเปิดรับสมัคร'; end if;
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into old_players from public.sports_athletes x where entry_id=saved;
   delete from public.sports_athletes where entry_id=saved;
 end if;
 select coalesce((select coaches from public.sports_roster_staff where entry_id=saved),'[]'::jsonb) into old_staff;
 for a in select value from jsonb_array_elements(p_players) loop
   pos:=pos+1;
   insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position)
   values(saved,(select x->>'student_code' from jsonb_array_elements(old_players) x where x->>'full_name'=btrim(a->>'full_name') limit 1),btrim(a->>'full_name'),(select x->>'grade_level' from jsonb_array_elements(old_players) x where x->>'full_name'=btrim(a->>'full_name') limit 1),null,pos) returning id into aid;
   insert into public.sports_takraw_player_forms values(aid,(a->>'birth_date')::date,(a->>'jersey_number')::integer);
 end loop;
 insert into public.sports_roster_staff(entry_id,coaches) values(saved,(select jsonb_agg(jsonb_build_object('name',btrim(c->>'name'),'phone',coalesce((select x->>'phone' from jsonb_array_elements(old_staff) x where btrim(x->>'name')=btrim(c->>'name') limit 1),''),'birth_date',coalesce(c->>'birth_date',''),'takraw_role',ord) order by ord) from jsonb_array_elements(p_staff) with ordinality x(c,ord))) on conflict(entry_id) do update set coaches=excluded.coaches;
 return saved;
end $$;
create or replace function public.sports_takraw_form_details(p_entry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare en public.sports_entries%rowtype;
begin
 select * into en from public.sports_entries where id=p_entry;
 if not found or not public.sports_is_takraw(en.event_id) or not exists(select 1 from public.sports_competitions c where c.id=en.competition_id and c.slug='phayao-secondary-group-sports-2569') then return null; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(en.competition_id) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=en.school_id and (r.competition_id=en.competition_id or r.competition_id is null))) then return null; end if;
 return (select jsonb_build_object('id',en.id,'school_id',en.school_id,'school_name',sc.name,'event_id',ev.id,'event_code',ev.event_code,'status',en.status,'staff',coalesce(st.coaches,'[]'::jsonb),'players',coalesce((select jsonb_agg(jsonb_build_object('full_name',a.full_name,'student_code',a.student_code,'jersey_number',coalesce(p.jersey_number::text,''),'birth_date',coalesce(p.birth_date::text,'')) order by a.roster_position nulls last,a.full_name) from public.sports_athletes a left join public.sports_takraw_player_forms p on p.athlete_id=a.id where a.entry_id=en.id),'[]'::jsonb),'complete',not exists(select 1 from public.sports_athletes a left join public.sports_takraw_player_forms p on p.athlete_id=a.id where a.entry_id=en.id and p.athlete_id is null)) from public.sports_schools sc join public.sports_events ev on ev.id=en.event_id left join public.sports_roster_staff st on st.entry_id=en.id where sc.id=en.school_id);
end $$;
revoke all on function public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb),public.sports_takraw_form_details(uuid) from public,anon;
grant execute on function public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb),public.sports_takraw_form_details(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
