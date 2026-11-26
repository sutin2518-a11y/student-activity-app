-- 054 v2: verified source from exported live RPC definitions (2026-11-26).
-- Supersedes the failed original 054. Run the WHOLE file, not individual statements.
-- No changes to data, tables, registration status, or grants during installation.
-- Do not use Pretty SQL before running. If STOP, do not deploy the frontend.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $install$
DECLARE
  v_takraw_hash text;
  v_basketball_hash text;
BEGIN
  v_takraw_hash := pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n'));
  IF v_takraw_hash NOT IN ('3799575f466ea592dce7a14f0f4ca488', 'f4a5f973aee4ee95b810aca615fa1881') THEN
    RAISE EXCEPTION 'STOP: sports_takraw_save_form differs from exported definition (hash %). No changes committed.', v_takraw_hash;
  END IF;
  v_basketball_hash := pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n'));
  IF v_basketball_hash NOT IN ('5862c0827b07370be9fc37b7bcb3c538', '0ef08c045d497f6e051de848c6f0032e') THEN
    RAISE EXCEPTION 'STOP: sports_basketball_register differs from exported definition (hash %). No changes committed.', v_basketball_hash;
  END IF;
  IF v_takraw_hash = '3799575f466ea592dce7a14f0f4ca488' THEN
    EXECUTE $ddl_takraw$CREATE OR REPLACE FUNCTION public.sports_takraw_save_form(p_entry uuid, p_event uuid, p_school uuid, p_players jsonb, p_staff jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if nullif(btrim(p_staff->1->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;
 for a in select value from jsonb_array_elements(p_staff) loop
   if jsonb_typeof(a) is distinct from 'object' or length(coalesce(a->>'name',''))>160 or (nullif(btrim(a->>'name'),'') is null and nullif(btrim(a->>'birth_date'),'') is not null) then raise exception 'ข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;
   if coalesce(a->>'birth_date','')<>'' then
     if a->>'birth_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'วันเกิดเจ้าหน้าที่ไม่ถูกต้อง'; end if;
     d:=(a->>'birth_date')::date;
     if d<date '1900-01-01' or d>(now() at time zone 'Asia/Bangkok')::date then raise exception 'วันเกิดเจ้าหน้าที่ไม่ถูกต้อง'; end if;
   end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_players) AS roster(player) group by (roster.player->>'jersey_number')::integer having count(*)>1) or exists(select 1 from jsonb_array_elements(p_players) AS roster(player) group by regexp_replace(btrim(roster.player->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อหรือหมายเลขเสื้อซ้ำ'; end if;
 if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) AS roster(player) join public.sports_athletes sa on regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(roster.player->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_takraw(en.event_id)) then raise exception 'นักกีฬาซ้ำในรุ่นเซปักตะกร้ออื่น'; end if;
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
 insert into public.sports_roster_staff(entry_id,coaches) values(saved,(select jsonb_agg(jsonb_build_object('name',coalesce(btrim(c->>'name'),''),'phone',coalesce((select x->>'phone' from jsonb_array_elements(old_staff) x where btrim(x->>'name')=btrim(c->>'name') limit 1),''),'birth_date',coalesce(c->>'birth_date',''),'takraw_role',ord) order by ord) from jsonb_array_elements(p_staff) with ordinality x(c,ord))) on conflict(entry_id) do update set coaches=excluded.coaches;
 return saved;
end $function$$ddl_takraw$;
    RAISE NOTICE 'Updated: sports_takraw_save_form';
  ELSE
    RAISE NOTICE 'Already updated: sports_takraw_save_form';
  END IF;
  IF v_basketball_hash = '5862c0827b07370be9fc37b7bcb3c538' THEN
    EXECUTE $ddl_basketball$CREATE OR REPLACE FUNCTION public.sports_basketball_register(p_event uuid, p_school uuid, p_players jsonb, p_coaches jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_event public.sports_events%rowtype;
 v_id uuid;
 v_admin boolean;
 v_count int;
 v_name text;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 if v_event.event_code not in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF') then raise exception 'ไม่ใช่รายการบาสเกตบอล'; end if;
 if not public.sports_is_basketball(p_event) then raise exception 'ไม่ใช่รายการบาสเกตบอล 2569'; end if;
 v_admin := public.sports_stage3_admin(v_event.competition_id);
 if not v_admin and not exists(select 1 from public.sports_user_roles r
    where r.user_id=auth.uid() and r.role='school_manager' and r.is_active and r.school_id=p_school
    and (r.competition_id is null or r.competition_id=v_event.competition_id))
  then raise exception 'ไม่มีสิทธิ์จัดการทีมโรงเรียนนี้' using errcode='42501'; end if;
 if v_event.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 if p_players is null or jsonb_typeof(p_players)<>'array' then raise exception 'รูปแบบข้อมูลนักกีฬาไม่ถูกต้อง'; end if;
 v_count := jsonb_array_length(p_players);
 if v_count<7 or v_count>12 then raise exception 'ลงทะเบียนนักกีฬาได้ 7–12 คนต่อทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'full_name'),'') is null
    or (nullif(a->>'grade_level','') is not null and a->>'grade_level' !~ '^ม\.[1-6]$') or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')
  then raise exception 'กรุณากรอกชื่อและเบอร์เสื้อทุกคน'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by (a->>'jersey_number') having count(*)>1)
  then raise exception 'มีหมายเลขเสื้อซ้ำในทีม'; end if;
 if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<>2 then raise exception 'รูปแบบข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;
 if nullif(btrim(p_coaches->0->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;
 if exists(select 1 from jsonb_array_elements(p_coaches) c where jsonb_typeof(c) is distinct from 'object' or ((nullif(btrim(c->>'name'),'') is not null or nullif(btrim(c->>'phone'),'') is not null) and (nullif(btrim(c->>'name'),'') is null or regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')))
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์เจ้าหน้าที่ที่ระบุให้ครบ'; end if;
 if (nullif(btrim(p_coaches->0->>'manager_name'),'') is not null or nullif(btrim(p_coaches->0->>'manager_phone'),'') is not null) and (nullif(btrim(p_coaches->0->>'manager_name'),'') is null or regexp_replace(coalesce(p_coaches->0->>'manager_phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$') then raise exception 'หากระบุผู้จัดการทีม กรุณากรอกชื่อและเบอร์โทรให้ครบ'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(a->>'birth_date','')::date>current_date or nullif(a->>'birth_date','')::date<'1900-01-01' or (v_event.event_code in ('GS3-BB-15M','GS3-BB-15F') and nullif(a->>'birth_date','')::date<'2011-01-01')) then raise exception 'วันเกิดไม่ถูกต้อง หรือไม่ผ่านเกณฑ์รุ่น 15 ปี'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'รายชื่อนักกีฬาซ้ำในทีม'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'student_code'),'') is not null group by btrim(a->>'student_code') having count(*)>1) then raise exception 'รหัสนักเรียนซ้ำในทีม'; end if;
 -- Serialize same school registrations across male age categories.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event.competition_id::text),pg_catalog.hashtext(p_school::text));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศอันดับแล้ว ไม่อนุญาตแก้ทะเบียน'; end if;
 if exists(select 1 from public.sports_entries en join public.sports_events ev on ev.id=en.event_id join public.sports_athletes a on a.entry_id=en.id cross join jsonb_array_elements(p_players) p where en.competition_id=v_event.competition_id and en.school_id=p_school and en.event_id<>p_event and en.status<>'withdrawn' and ((nullif(btrim(p->>'student_code'),'') is not null and btrim(p->>'student_code')=a.student_code) or regexp_replace(btrim(p->>'full_name'),'[[:space:]]+','','g')=regexp_replace(btrim(a.full_name),'[[:space:]]+','','g'))) then raise exception 'นักกีฬาลงทะเบียนซ้ำในกีฬา/รุ่นอื่นของโรงเรียนนี้'; end if;
 -- Avoid duplicate registrations from concurrent browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),pg_catalog.hashtext(p_school::text));
 if (select count(*) from public.sports_entries e where e.event_id=p_event and e.school_id=p_school and e.status<>'withdrawn')>1 then raise exception 'มีใบสมัครเดิมซ้ำ กรุณาให้ผู้ดูแลตรวจสอบก่อนแก้ไข'; end if;
 select e.id into v_id from public.sports_entries e where e.event_id=p_event and e.school_id=p_school
  and e.status<>'withdrawn' order by e.created_at limit 1 for update;
 select name into v_name from public.sports_schools where id=p_school;
 if v_name is null or not exists(select 1 from public.sports_football_group_teams t where t.event_id=p_event and t.school_name=v_name) then raise exception 'ไม่พบโรงเรียนในสายการแข่งขัน'; end if;
 if v_id is null then
  insert into public.sports_entries(competition_id,event_id,school_id,entry_type,entry_name,coach_name,assistant_coach,status)
    values(v_event.competition_id,p_event,p_school,'team',v_name,p_coaches->0->>'name',p_coaches->1->>'name','submitted') returning id into v_id;
  insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,roster_position)
    select v_id,nullif(btrim(a->>'student_code'),''),btrim(a->>'full_name'),a->>'grade_level',null,pos
    from jsonb_array_elements(p_players) with ordinality x(a,pos);
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
 update public.sports_athletes a set grade_level=p.value->>'grade_level' from jsonb_array_elements(p_players) with ordinality p(value,pos) where a.entry_id=v_id and a.roster_position=p.pos;
 insert into public.sports_roster_staff(entry_id,coaches) values(v_id,p_coaches) on conflict(entry_id) do update set coaches=excluded.coaches;
 delete from public.sports_football_player_details where entry_id=v_id;
 insert into public.sports_football_player_details(entry_id,roster_position,birth_date,jersey_number,player_role,player_note)
 select v_id,pos,nullif(a->>'birth_date','')::date,(a->>'jersey_number')::int,
   left(coalesce(a->>'player_role',''),59),left(coalesce(a->>'player_note',''),299)
 from jsonb_array_elements(p_players) with ordinality x(a,pos);
 return v_id;
end $function$$ddl_basketball$;
    RAISE NOTICE 'Updated: sports_basketball_register';
  ELSE
    RAISE NOTICE 'Already updated: sports_basketball_register';
  END IF;
  IF pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n')) IS DISTINCT FROM 'f4a5f973aee4ee95b810aca615fa1881' THEN
    RAISE EXCEPTION 'STOP: verification failed for sports_takraw_save_form. No changes committed.';
  END IF;
  IF pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n')) IS DISTINCT FROM '0ef08c045d497f6e051de848c6f0032e' THEN
    RAISE EXCEPTION 'STOP: verification failed for sports_basketball_register. No changes committed.';
  END IF;
END;
$install$;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Read-only post-install verification; both columns should show READY.
SELECT
  CASE WHEN pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n')) = 'f4a5f973aee4ee95b810aca615fa1881' THEN 'READY' ELSE 'CHECK' END AS takraw_optional_staff,
  CASE WHEN pg_catalog.md5(pg_catalog.rtrim(pg_catalog.replace(pg_catalog.pg_get_functiondef('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n'), E' \t\r\n')) = '0ef08c045d497f6e051de848c6f0032e' THEN 'READY' ELSE 'CHECK' END AS basketball_optional_staff;
