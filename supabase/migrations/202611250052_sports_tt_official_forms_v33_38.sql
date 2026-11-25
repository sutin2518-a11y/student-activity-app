begin;
-- Isolated table tennis fields, private access via RPC only.
create table if not exists public.sports_tt_player_forms (
 athlete_id uuid primary key references public.sports_athletes(id) on delete cascade,
 birth_date date not null
);
create table if not exists public.sports_tt_entry_forms (
 entry_id uuid primary key references public.sports_entries(id) on delete cascade,
 phone text not null default ''
);
alter table public.sports_tt_player_forms enable row level security;
alter table public.sports_tt_entry_forms enable row level security;
revoke all on public.sports_tt_player_forms,public.sports_tt_entry_forms from public,anon,authenticated;
create or replace function public.sports_tt_form_allowed(p_comp uuid,p_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.sports_competitions where id=p_comp and slug='phayao-secondary-group-sports-2569') and
 (public.sports_stage3_admin(p_comp) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=p_school and (r.competition_id=p_comp or r.competition_id is null)))
$$;
revoke all on function public.sports_tt_form_allowed(uuid,uuid) from public,anon,authenticated;
create or replace function public.sports_tt_save_form(p_entry uuid,p_event uuid,p_school uuid,p_players jsonb,p_staff jsonb,p_phone text)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.sports_events%rowtype; saved uuid; a jsonb; aid uuid; pos int:=0; school text; d date; old_players jsonb:='[]';
begin
 select * into strict e from public.sports_events where id=p_event for share;
 if not public.sports_is_tabletennis(e.id) or not public.sports_tt_form_allowed(e.competition_id,p_school) then raise exception 'ไม่มีสิทธิ์ลงทะเบียนเทเบิลเทนนิส'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262644);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if e.status<>'registration' or public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เทเบิลเทนนิสปิดลงทะเบียนหรือเริ่มแข่งแล้ว'; end if;
 select sc.name into school from public.sports_schools sc join public.sports_football_group_teams t on t.school_name=sc.name where sc.id=p_school and t.event_id=p_event limit 1;
 if school is null then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขัน'; end if;
 if jsonb_typeof(p_players) is distinct from 'array' or jsonb_typeof(p_staff) is distinct from 'array' then raise exception 'รูปแบบข้อมูลไม่ถูกต้อง'; end if;
 if jsonb_array_length(p_players)<>(case when e.event_code like '%-S' then 1 else 2 end) or jsonb_array_length(p_players)>e.max_athletes_per_entry or jsonb_array_length(p_staff)<>3 then raise exception 'ตรวจจำนวนผู้เล่นเดี่ยว/คู่และเจ้าหน้าที่'; end if;
 if nullif(btrim(p_staff->0->>'name'),'') is null or exists(select 1 from jsonb_array_elements(p_staff) x where length(coalesce(x->>'name',''))>160) then raise exception 'กรุณาระบุชื่อผู้ฝึกสอน'; end if;
 if coalesce(p_phone,'') !~ '^[0-9+ ()-]{0,30}$' then raise exception 'ตรวจเบอร์โทรศัพท์'; end if;
 for a in select value from jsonb_array_elements(p_players) loop
   if nullif(btrim(a->>'full_name'),'') is null or length(a->>'full_name')>160 or coalesce(a->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'ข้อมูลนักกีฬาไม่ครบ'; end if;
   d:=(a->>'birth_date')::date;
   if d<date '1900-01-01' or d>(now() at time zone 'Asia/Bangkok')::date then raise exception 'วันเกิดไม่ถูกต้อง'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อผู้เล่นซ้ำในคู่'; end if;
 if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรายการนี้แล้ว'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where (select count(distinct en.event_id) from public.sports_athletes sa join public.sports_entries en on en.id=sa.entry_id join public.sports_events oe on oe.id=en.event_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and en.status<>'withdrawn' and public.sports_is_tabletennis(en.event_id) and substring(oe.event_code from '^GS3-TT-(13|15|U)')=substring(e.event_code from '^GS3-TT-(13|15|U)') and regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g'))>=2) then raise exception 'นักกีฬาลงได้ไม่เกิน 2 รายการในรุ่นเดียวกัน'; end if;
 if p_entry is null then
   insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status) values(e.competition_id,e.id,p_school,case when e.event_type='team' then 'team' else 'individual' end,school,btrim(p_staff->0->>'name'),nullif(btrim(p_staff->1->>'name'),''),'submitted') returning id into saved;
 else
   update public.sports_entries set coach_name=btrim(p_staff->0->>'name'),assistant_coach=nullif(btrim(p_staff->1->>'name'),''),status='submitted',approved_by=null,return_reason=null,updated_at=now() where id=p_entry and competition_id=e.competition_id and school_id=p_school and event_id=e.id and (status='rejected' or (status in ('approved','submitted') and public.sports_stage3_admin(e.competition_id))) returning id into saved;
   if saved is null then raise exception 'แก้ไขได้เฉพาะใบสมัครที่ถูกส่งคืนหรือโดยผู้ดูแลระหว่างเปิดรับสมัคร'; end if;
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into old_players from public.sports_athletes x where entry_id=saved;
   delete from public.sports_athletes where entry_id=saved;
 end if;
 for a in select value from jsonb_array_elements(p_players) loop
   pos:=pos+1;
   insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position) values(saved,(select x->>'student_code' from jsonb_array_elements(old_players) x where x->>'full_name'=btrim(a->>'full_name') limit 1),btrim(a->>'full_name'),(select x->>'grade_level' from jsonb_array_elements(old_players) x where x->>'full_name'=btrim(a->>'full_name') limit 1),null,pos) returning id into aid;
   insert into public.sports_tt_player_forms values(aid,(a->>'birth_date')::date);
 end loop;
 insert into public.sports_tt_entry_forms values(saved,coalesce(btrim(p_phone),'')) on conflict(entry_id) do update set phone=excluded.phone;
 insert into public.sports_roster_staff(entry_id,coaches) values(saved,(select jsonb_agg(jsonb_build_object('name',coalesce(btrim(c->>'name'),''),'phone','','tt_role',ord) order by ord) from jsonb_array_elements(p_staff) with ordinality x(c,ord))) on conflict(entry_id) do update set coaches=excluded.coaches;
 return saved;
end $$;
create or replace function public.sports_tt_school_forms(p_entry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare en public.sports_entries%rowtype;
begin
 select * into en from public.sports_entries where id=p_entry;
 if not found or not public.sports_is_tabletennis(en.event_id) or not public.sports_tt_form_allowed(en.competition_id,en.school_id) then return null; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'school_id',r.school_id,'school_name',sc.name,'event_id',r.event_id,'event_code',ev.event_code,'status',r.status,'phone',coalesce(f.phone,''),'staff',coalesce(st.coaches,jsonb_build_array(jsonb_build_object('name',coalesce(r.coach_name,'')),jsonb_build_object('name',coalesce(r.assistant_coach,'')),jsonb_build_object('name',''))),'players',coalesce((select jsonb_agg(jsonb_build_object('full_name',a.full_name,'student_code',a.student_code,'birth_date',coalesce(p.birth_date::text,'')) order by a.roster_position nulls last,a.full_name,a.id) from public.sports_athletes a left join public.sports_tt_player_forms p on p.athlete_id=a.id where a.entry_id=r.id),'[]'::jsonb)) order by ev.event_code,r.id),'[]'::jsonb) from public.sports_entries r join public.sports_schools sc on sc.id=r.school_id join public.sports_events ev on ev.id=r.event_id left join public.sports_tt_entry_forms f on f.entry_id=r.id left join public.sports_roster_staff st on st.entry_id=r.id where r.competition_id=en.competition_id and r.school_id=en.school_id and public.sports_is_tabletennis(r.event_id));
end $$;
revoke all on function public.sports_tt_save_form(uuid,uuid,uuid,jsonb,jsonb,text),public.sports_tt_school_forms(uuid) from public,anon;
grant execute on function public.sports_tt_save_form(uuid,uuid,uuid,jsonb,jsonb,text),public.sports_tt_school_forms(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
