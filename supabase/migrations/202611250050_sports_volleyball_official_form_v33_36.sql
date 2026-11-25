begin;
-- Sport-specific data, private to the authorized school and competition administrator.
create table if not exists public.sports_volleyball_forms (
 entry_id uuid primary key references public.sports_entries(id) on delete cascade,
 team_name text not null, shirt_color text not null, shorts_color text not null
);
create table if not exists public.sports_volleyball_player_forms (
 athlete_id uuid primary key references public.sports_athletes(id) on delete cascade,
 jersey_number text not null, birth_date date not null, weight_kg numeric not null, height_cm numeric not null, note text not null default ''
);
alter table public.sports_volleyball_forms enable row level security;
alter table public.sports_volleyball_player_forms enable row level security;
revoke all on public.sports_volleyball_forms, public.sports_volleyball_player_forms from public, anon, authenticated;
create or replace function public.sports_volleyball_save_form(p_entry uuid,p_event uuid,p_school uuid,p_team text,p_shirt text,p_shorts text,p_players jsonb,p_coaches jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; saved uuid; n int; a jsonb; aid uuid; pos int:=0; school text; d date;
begin
 select * into strict e from public.sports_events where id=p_event for share;
 if not public.sports_is_volleyball(e.id) or not exists(select 1 from public.sports_competitions c where c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569') then raise exception 'รายการนี้ไม่ใช่วอลเลย์บอลกีฬากลุ่ม 2569'; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=p_school and (r.competition_id=e.competition_id or r.competition_id is null))) then raise exception 'ไม่มีสิทธิ์ลงทะเบียนให้โรงเรียนนี้'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262642);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
 if e.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 select sc.name into school from public.sports_schools sc join public.sports_football_group_teams t on t.school_name=sc.name where sc.id=p_school and t.event_id=p_event limit 1;
 if school is null then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
 if jsonb_typeof(p_players) is distinct from 'array' or jsonb_typeof(p_coaches) is distinct from 'array' then raise exception 'รูปแบบข้อมูลไม่ถูกต้อง'; end if;
 n:=jsonb_array_length(p_players);
 if n not between 6 and 12 or n>e.max_athletes_per_entry or jsonb_array_length(p_coaches) not between 1 and 3 then raise exception 'นักกีฬา 6–12 คน เจ้าหน้าที่ 1–3 คน'; end if;
 if nullif(btrim(p_team),'') is null or nullif(btrim(p_shirt),'') is null or nullif(btrim(p_shorts),'') is null or greatest(length(p_team),length(p_shirt),length(p_shorts))>160 then raise exception 'กรุณากรอกชื่อทีม สีเสื้อ สีกางเกง'; end if;
 if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or length(c->>'name')>160) then raise exception 'กรุณากรอกชื่อผู้ฝึกสอน'; end if;
 for a in select value from jsonb_array_elements(p_players) loop
   if nullif(btrim(a->>'full_name'),'') is null or length(a->>'full_name')>160 or coalesce(a->>'jersey_number','') !~ '^[0-9]{1,3}$' or coalesce(a->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(a->>'weight_kg','') !~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' or coalesce(a->>'height_cm','') !~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' or length(coalesce(a->>'note',''))>200 then raise exception 'ข้อมูลนักกีฬาไม่ครบหรือไม่ถูกต้อง'; end if;
   d:=(a->>'birth_date')::date;
   if d> (now() at time zone 'Asia/Bangkok')::date or d<date '1900-01-01' or (a->>'weight_kg')::numeric<=0 or (a->>'height_cm')::numeric<=0 then raise exception 'วันเกิด น้ำหนัก หรือส่วนสูงไม่ถูกต้อง'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number')::int having count(*)>1) or exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อหรือหมายเลขเสื้อซ้ำ'; end if;
 if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_volleyball(en.event_id)) then raise exception 'นักกีฬาซ้ำในรุ่นวอลเลย์บอลอื่น'; end if;
 if p_entry is null then
   insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status) values(e.competition_id,e.id,p_school,'team',school,btrim(p_coaches->0->>'name'),nullif(btrim(p_coaches->1->>'name'),''),'submitted') returning id into saved;
 else
   update public.sports_entries set coach_name=btrim(p_coaches->0->>'name'),assistant_coach=nullif(btrim(p_coaches->1->>'name'),''),status='submitted',approved_by=null,return_reason=null,updated_at=now() where id=p_entry and competition_id=e.competition_id and school_id=p_school and event_id=e.id and (status='rejected' or (status in ('approved','submitted') and public.sports_stage3_admin(e.competition_id))) returning id into saved;
   if saved is null then raise exception 'แก้ไขได้เฉพาะใบสมัครที่ถูกส่งคืนหรือโดยผู้ดูแลระหว่างเปิดรับสมัคร'; end if;
   delete from public.sports_athletes where entry_id=saved;
 end if;
 for a in select value from jsonb_array_elements(p_players) loop
   pos:=pos+1;
   insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position) values(saved,null,btrim(a->>'full_name'),null,null,pos) returning id into aid;
   insert into public.sports_volleyball_player_forms(athlete_id,jersey_number,birth_date,weight_kg,height_cm,note) values(aid,a->>'jersey_number',(a->>'birth_date')::date,(a->>'weight_kg')::numeric,(a->>'height_cm')::numeric,coalesce(a->>'note',''));
 end loop;
 insert into public.sports_roster_staff(entry_id,coaches) values(saved,(select jsonb_agg(jsonb_build_object('name',btrim(c->>'name'),'phone',coalesce((select oldc->>'phone' from public.sports_roster_staff oldst cross join lateral jsonb_array_elements(oldst.coaches) oldc where oldst.entry_id=saved and btrim(oldc->>'name')=btrim(c->>'name') limit 1),'')) order by ord) from jsonb_array_elements(p_coaches) with ordinality x(c,ord))) on conflict(entry_id) do update set coaches=excluded.coaches;
 insert into public.sports_volleyball_forms(entry_id,team_name,shirt_color,shorts_color) values(saved,btrim(p_team),btrim(p_shirt),btrim(p_shorts)) on conflict(entry_id) do update set team_name=excluded.team_name,shirt_color=excluded.shirt_color,shorts_color=excluded.shorts_color;
 return saved;
end $$;
create or replace function public.sports_volleyball_form_details(p_entry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare en public.sports_entries%rowtype;
begin
 select * into en from public.sports_entries where id=p_entry;
 if not found or not public.sports_is_volleyball(en.event_id) then return null; end if;
 if auth.uid() is null or not (public.sports_stage3_admin(en.competition_id) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=en.school_id and (r.competition_id=en.competition_id or r.competition_id is null))) then return null; end if;
 return (select jsonb_build_object('id',en.id,'school_id',en.school_id,'school_name',sc.name,'event_code',ev.event_code,'status',en.status,'team_name',coalesce(f.team_name,''),'shirt_color',coalesce(f.shirt_color,''),'shorts_color',coalesce(f.shorts_color,''),'complete',f.entry_id is not null and not exists(select 1 from public.sports_athletes a left join public.sports_volleyball_player_forms p on p.athlete_id=a.id where a.entry_id=en.id and p.athlete_id is null),'coaches',coalesce(st.coaches,'[]'::jsonb),'players',coalesce((select jsonb_agg(jsonb_build_object('full_name',a.full_name,'jersey_number',coalesce(p.jersey_number,''),'birth_date',coalesce(p.birth_date::text,''),'weight_kg',coalesce(p.weight_kg::text,''),'height_cm',coalesce(p.height_cm::text,''),'note',coalesce(p.note,'')) order by a.roster_position nulls last,a.full_name) from public.sports_athletes a left join public.sports_volleyball_player_forms p on p.athlete_id=a.id where a.entry_id=en.id),'[]'::jsonb)) from public.sports_schools sc join public.sports_events ev on ev.id=en.event_id left join public.sports_volleyball_forms f on f.entry_id=en.id left join public.sports_roster_staff st on st.entry_id=en.id where sc.id=en.school_id);
end $$;
revoke all on function public.sports_volleyball_save_form(uuid,uuid,uuid,text,text,text,jsonb,jsonb),public.sports_volleyball_form_details(uuid) from public,anon;
grant execute on function public.sports_volleyball_save_form(uuid,uuid,uuid,text,text,text,jsonb,jsonb),public.sports_volleyball_form_details(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
