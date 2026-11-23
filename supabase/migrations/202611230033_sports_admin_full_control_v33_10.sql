-- PHULANGKA GAMES 2569 | v33.10 | Admin Full Control: registrations
-- Install after migration 032. Installing does NOT change existing applications.
-- Edit existing registration only, never change its school/event or overwrite results.
begin;

create table if not exists public.sports_admin_registration_edits (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  event_id uuid not null references public.sports_events(id) on delete restrict,
  -- Keep audit history after a test registration is reset/deleted.
  entry_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null check(length(btrim(reason)) between 8 and 1000),
  before_data jsonb not null,
  after_data jsonb not null,
  revoked_certificates integer not null default 0,
  issued_certificates integer not null default 0,
  edited_at timestamptz not null default now()
);
create index if not exists sports_admin_registration_edits_entry_idx
  on public.sports_admin_registration_edits(entry_id,edited_at desc);
alter table public.sports_admin_registration_edits enable row level security;
revoke all on public.sports_admin_registration_edits from public,anon,authenticated;

-- Admin-only list for all schools. Avoids granting unrestricted reads of personal data.
create or replace function public.sports_admin_registration_list(p_comp uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb; v_events jsonb; v_schools jsonb;
begin
  if auth.uid() is null or not public.sports_stage3_admin(p_comp) then
    raise exception 'เฉพาะ Admin หลักเท่านั้นที่เข้าถึงทะเบียนทุกโรงเรียนได้' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',en.id,'event_id',en.event_id,
       'school_id',en.school_id,'entry_name',en.entry_name,'status',en.status,
       'updated_at',en.updated_at,'athletes',
         (select count(*) from public.sports_athletes a where a.entry_id=en.id))
       order by en.updated_at desc,en.id),'[]'::jsonb) into v_rows
  from public.sports_entries en where en.competition_id=p_comp and en.status<>'withdrawn';
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'sport_name',e.sport_name,
     'event_code',e.event_code,'event_type',e.event_type,
     'max_athletes_per_entry',e.max_athletes_per_entry) order by e.sport_name),'[]'::jsonb)
  into v_events from public.sports_events e where e.competition_id=p_comp;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name),'[]'::jsonb)
  into v_schools from public.sports_schools s where s.status is distinct from 'inactive';
  return jsonb_build_object('entries',v_rows,'events',v_events,'schools',v_schools);
end $$;
revoke all on function public.sports_admin_registration_list(uuid) from public,anon,authenticated;
grant execute on function public.sports_admin_registration_list(uuid) to authenticated;

create or replace function public.sports_admin_registration_detail(p_entry uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_entry public.sports_entries%rowtype; v_players jsonb; v_coaches jsonb; v_history jsonb;
begin
  select * into v_entry from public.sports_entries en where en.id=p_entry;
  if not found or auth.uid() is null or not public.sports_stage3_admin(v_entry.competition_id) then
    raise exception 'ไม่พบใบสมัครหรือไม่มีสิทธิ์ดูข้อมูลนี้' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('full_name',a.full_name,
       'student_code',a.student_code,'grade_level',a.grade_level,'gender',a.gender,
       'ign',a.ign,'team_role',a.team_role,'play_position',a.play_position,
       'birth_date',fd.birth_date,'jersey_number',fd.jersey_number,
       'player_role',fd.player_role,'player_note',fd.player_note)
       order by a.roster_position nulls last,a.full_name),'[]'::jsonb) into v_players
   from public.sports_athletes a left join public.sports_football_player_details fd
     on fd.entry_id=a.entry_id and fd.roster_position=a.roster_position
   where a.entry_id=p_entry;
  select coalesce(s.coaches,'[]'::jsonb) into v_coaches
    from public.sports_roster_staff s where s.entry_id=p_entry;
  if v_coaches is null or v_coaches='[]'::jsonb then
    v_coaches:=jsonb_build_array(jsonb_build_object('name',coalesce(v_entry.coach_name,''),'phone',''));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('edited_at',h.edited_at,'reason',h.reason,
    'actor',(select u.email from auth.users u where u.id=h.actor_id),
    'before_data',h.before_data,'after_data',h.after_data,
    'revoked',h.revoked_certificates,'issued',h.issued_certificates)
    order by h.edited_at desc),'[]'::jsonb) into v_history
  from (select * from public.sports_admin_registration_edits
        where entry_id=p_entry order by edited_at desc limit 15) h;
  return jsonb_build_object('id',v_entry.id,'competition_id',v_entry.competition_id,
    'event_id',v_entry.event_id,'school_id',v_entry.school_id,
    'entry_name',v_entry.entry_name,'status',v_entry.status,
    'updated_at',v_entry.updated_at,'players',v_players,
    'coaches',v_coaches,'history',v_history,
    'unrevoked_certificates',(select count(*) from public.sports_certificates_issued i
      where i.entry_id=p_entry and i.revoked_at is null));
end $$;
revoke all on function public.sports_admin_registration_detail(uuid) from public,anon,authenticated;
grant execute on function public.sports_admin_registration_detail(uuid) to authenticated;

-- Atomic admin registration edit; archived issued certificates must NEVER be overwritten.
-- Replaces the affected ENTRY's issued docs when recipients change; other schools and
-- untouched entries keep their current certificates. No Admin approvals are introduced.
create or replace function public.sports_admin_update_registration(
 p_entry uuid,p_name text,p_players jsonb,p_coaches jsonb,
 p_reason text,p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_entry public.sports_entries%rowtype;
 v_event public.sports_events%rowtype;
 v_comp public.sports_competitions%rowtype;
 v_school_name text;
 v_before_players jsonb;
 v_before_coaches jsonb;
 v_after_players jsonb;
 v_before jsonb;
 v_after jsonb;
 v_change uuid:=gen_random_uuid();
 v_reason text:=btrim(coalesce(p_reason,''));
 v_count int;
 v_role_count int;
 v_is_football boolean;
 v_kind text;
 v_rank int;
 v_affected_award boolean:=false;
 v_affected_participation boolean:=false;
 v_revoked int:=0;
 v_issued int:=0;
 v_now timestamptz:=clock_timestamp();
 v_settings record;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select * into v_entry from public.sports_entries where id=p_entry for update;
 if not found or not public.sports_stage3_admin(v_entry.competition_id) then
   raise exception 'เฉพาะ Admin หลักของการแข่งขันเท่านั้นที่แก้ไขใบสมัครได้' using errcode='42501';
 end if;
 if v_entry.status='withdrawn' then raise exception 'ใบสมัครถูกถอนแล้ว กรุณาใช้ระบบจัดการสถานะแยกต่างหาก'; end if;
 if p_expected_updated_at is null or v_entry.updated_at is distinct from p_expected_updated_at then
   raise exception 'ใบสมัครถูกเปลี่ยนจากอีกเครื่อง กรุณาโหลดข้อมูลใหม่ก่อนแก้ไข'; end if;
 if char_length(v_reason) not between 8 and 1000 then
   raise exception 'กรุณาระบุเหตุผลที่ได้รับแจ้งให้แก้ไขอย่างน้อย 8 ตัวอักษร ไม่เกิน 1,000 ตัว';
 end if;
 if nullif(btrim(coalesce(p_name,'')),'') is null or char_length(p_name)>250 then
   raise exception 'กรุณาระบุชื่อทีม/ชื่อใบสมัครไม่เกิน 250 ตัวอักษร'; end if;
 if p_players is null or jsonb_typeof(p_players)<>'array' or p_coaches is null or jsonb_typeof(p_coaches)<>'array' then
   raise exception 'ข้อมูลนักกีฬา/ครูผู้ควบคุมต้องเป็นรายการแบบ array'; end if;
 select * into strict v_event from public.sports_events where id=v_entry.event_id and competition_id=v_entry.competition_id for share;
 select * into strict v_comp from public.sports_competitions where id=v_entry.competition_id;
 select name into v_school_name from public.sports_schools where id=v_entry.school_id;
 v_is_football:=v_event.event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF');
 v_count:=jsonb_array_length(p_players);
 if v_count<1 or v_count>coalesce(v_event.max_athletes_per_entry,200) or v_count>200 then
   raise exception 'จำนวนนักกีฬาต้องอยู่ในขอบเขตที่รายการกำหนด'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) x
    where nullif(btrim(x->>'full_name'),'') is null or length(btrim(x->>'full_name'))>250)
 then raise exception 'กรุณากรอกชื่อ-สกุลนักกีฬาทุกคนให้ครบ'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) x
     where nullif(btrim(x->>'student_code'),'') is not null
     group by btrim(x->>'student_code') having count(*)>1)
 then raise exception 'รหัสนักเรียนซ้ำในใบสมัคร'; end if;
 if jsonb_array_length(p_coaches) not between 1 and 20 or exists (
    select 1 from jsonb_array_elements(p_coaches) c
    where nullif(btrim(c->>'name'),'') is null or length(btrim(c->>'name'))>250
       or regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
 then raise exception 'กรุณาระบุชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมอย่างน้อยหนึ่งคนให้ครบ'; end if;
 if v_is_football then
   if v_count>20 or exists(select 1 from jsonb_array_elements(p_players) x
      where coalesce(x->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or coalesce(x->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')
   then raise exception 'ฟุตบอลต้องมีวันเกิดและเบอร์เสื้อ 0–99 ของนักกีฬาทุกคน'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) x
      group by x->>'jersey_number' having count(*)>1)
   then raise exception 'หมายเลขเสื้อซ้ำภายในทีมฟุตบอล'; end if;
 end if;
 if v_event.event_code in ('GS3-ES-SM','GS3-ES-SF') then
   if v_count not between 5 and 7 then raise exception 'RoV ต้องมีตัวจริง 5 คน และสำรองไม่เกิน 2 คน'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) x
       where nullif(btrim(x->>'ign'),'') is null
          or coalesce(x->>'team_role','') not in ('หัวหน้าทีม','ตัวจริง','ตัวสำรอง'))
     then raise exception 'กรุณาระบุชื่อในเกมและตำแหน่งผู้เล่น RoV ให้ครบ'; end if;
   select count(*) into v_role_count from jsonb_array_elements(p_players) x where x->>'team_role'='หัวหน้าทีม';
   if v_role_count<>1 then raise exception 'RoV ต้องมีหัวหน้าทีม 1 คน'; end if;
   select count(*) into v_role_count from jsonb_array_elements(p_players) x where x->>'team_role'='ตัวจริง';
   if v_role_count<>4 then raise exception 'RoV ต้องมีตัวจริง 4 คน นอกเหนือจากหัวหน้าทีม'; end if;
 end if;
 -- Match both locks and their order used by the official publisher / result corrections.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_entry.event_id::text),94723);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_entry.event_id::text),94724);
 select coalesce(jsonb_agg(jsonb_build_object('full_name',a.full_name,
   'student_code',a.student_code,'grade_level',a.grade_level,'gender',a.gender,
   'ign',a.ign,'team_role',a.team_role,'play_position',a.play_position,
   'birth_date',fd.birth_date,'jersey_number',fd.jersey_number,
   'player_role',fd.player_role,'player_note',fd.player_note)
   order by a.roster_position nulls last,a.full_name),'[]'::jsonb) into v_before_players
 from public.sports_athletes a left join public.sports_football_player_details fd
   on fd.entry_id=a.entry_id and fd.roster_position=a.roster_position
 where a.entry_id=p_entry;
 select coalesce(coaches,'[]'::jsonb) into v_before_coaches
   from public.sports_roster_staff where entry_id=p_entry;
 v_before:=jsonb_build_object('entry_name',v_entry.entry_name,'status',v_entry.status,
   'players',v_before_players,'coaches',coalesce(v_before_coaches,'[]'::jsonb));
 select exists(select 1 from public.sports_certificates_issued i
   where i.entry_id=p_entry and i.certificate_kind='award' and i.revoked_at is null)
 into v_affected_award;
 select exists(select 1 from public.sports_certificates_issued i
   where i.entry_id=p_entry and i.certificate_kind='participation' and i.revoked_at is null)
 into v_affected_participation;
 if v_affected_award then
   select rank into v_rank from public.sports_certificate_placements
    where event_id=v_entry.event_id and entry_id=p_entry limit 1;
   if v_rank is null then
     raise exception 'มีเกียรติบัตรรางวัลแต่ไม่พบอันดับที่ประกาศ โปรดตรวจสอบผลก่อนแก้รายชื่อ'; end if;
 end if;
 -- Updating the registration never changes its school/event, award placement or match score.
 update public.sports_entries set entry_name=btrim(p_name),coach_name=btrim(p_coaches->0->>'name'),
   assistant_coach=nullif(btrim(p_coaches->1->>'name'),''),updated_at=v_now
 where id=p_entry;
 delete from public.sports_football_player_details where entry_id=p_entry;
 delete from public.sports_athletes where entry_id=p_entry;
 insert into public.sports_athletes(entry_id,student_code,full_name,grade_level,gender,
    roster_position,ign,team_role,play_position)
 select p_entry,nullif(btrim(x->>'student_code'),''),btrim(x->>'full_name'),
   nullif(btrim(x->>'grade_level'),''),nullif(btrim(x->>'gender'),''),pos,
   case when v_event.event_code in ('GS3-ES-SM','GS3-ES-SF') then nullif(btrim(x->>'ign'),'') end,
   case when v_event.event_code in ('GS3-ES-SM','GS3-ES-SF') then nullif(btrim(x->>'team_role'),'') end,
   case when v_event.event_code in ('GS3-ES-SM','GS3-ES-SF') then nullif(btrim(x->>'play_position'),'') end
 from jsonb_array_elements(p_players) with ordinality z(x,pos);
 if v_is_football then
   insert into public.sports_football_player_details(entry_id,roster_position,
       birth_date,jersey_number,player_role,player_note)
   select p_entry,pos,(x->>'birth_date')::date,(x->>'jersey_number')::int,
     left(coalesce(x->>'player_role',''),59),left(coalesce(x->>'player_note',''),299)
   from jsonb_array_elements(p_players) with ordinality z(x,pos);
 end if;
 insert into public.sports_roster_staff(entry_id,coaches) values(p_entry,p_coaches)
   on conflict(entry_id) do update set coaches=excluded.coaches;
 update public.sports_event_results set entry_name=btrim(p_name) where entry_id=p_entry;

 -- Keep old QR and immutable snapshots; issue replacement certificates atomically.
 if v_affected_award or v_affected_participation then
   update public.sports_certificates_issued set is_active=false,revoked_at=v_now,
      revoked_by=auth.uid(),revocation_reason='Admin แก้ไขใบสมัคร: '||v_reason
   where entry_id=p_entry and revoked_at is null;
   get diagnostics v_revoked=row_count;
   for v_kind in select kind from (values ('award'),('participation')) as k(kind)
     where (kind='award' and v_affected_award) or (kind='participation' and v_affected_participation)
   loop
     select i.certificate_title,i.signer_name,i.signer_position
     into v_settings from public.sports_certificates_issued i
     where i.entry_id=p_entry and i.certificate_kind=v_kind and i.revoked_at=v_now
     order by i.id desc limit 1;
     insert into public.sports_certificates_issued(competition_id,event_id,entry_id,school_id,
       recipient_type,recipient_key,recipient_name,school_name,event_name,competition_name,
       certificate_title,award_rank,certificate_kind,signer_name,signer_position)
     select v_entry.competition_id,v_entry.event_id,p_entry,v_entry.school_id,
       'athlete',left('admin-edit:'||v_change::text||':athlete:'||a.roster_position::text,200),
       a.full_name,v_school_name,v_event.sport_name,v_comp.name,
       coalesce(v_settings.certificate_title,'เกียรติบัตร'),
       case when v_kind='award' then v_rank else null end,v_kind,
       coalesce(v_settings.signer_name,''),coalesce(v_settings.signer_position,'')
     from public.sports_athletes a where a.entry_id=p_entry;
     get diagnostics v_count=row_count;
     v_issued:=v_issued+v_count;
     insert into public.sports_certificates_issued(competition_id,event_id,entry_id,school_id,
       recipient_type,recipient_key,recipient_name,school_name,event_name,competition_name,
       certificate_title,award_rank,certificate_kind,signer_name,signer_position)
     select v_entry.competition_id,v_entry.event_id,p_entry,v_entry.school_id,
       'coach',left('admin-edit:'||v_change::text||':coach:'||c.pos::text,200),
       btrim(c.person->>'name'),v_school_name,v_event.sport_name,v_comp.name,
       coalesce(v_settings.certificate_title,'เกียรติบัตร'),
       case when v_kind='award' then v_rank else null end,v_kind,
       coalesce(v_settings.signer_name,''),coalesce(v_settings.signer_position,'')
     from jsonb_array_elements(p_coaches) with ordinality c(person,pos);
     get diagnostics v_count=row_count;
     v_issued:=v_issued+v_count;
   end loop;
   -- Link only unambiguous same-name recipients; NEVER point a QR at a different person.
   with candidates as (
     select old.id old_id,new.id new_id,
       count(*) over(partition by old.id) n_old,
       count(*) over(partition by new.id) n_new
     from public.sports_certificates_issued old
     join public.sports_certificates_issued new
       on new.entry_id=old.entry_id and new.certificate_kind=old.certificate_kind
       and new.recipient_type=old.recipient_type and new.recipient_name=old.recipient_name
     where old.entry_id=p_entry and old.revoked_at=v_now
       and new.recipient_key like ('admin-edit:'||v_change::text||':%')
   ) update public.sports_certificates_issued old
     set replaced_by=c.new_id,replacement_reason=v_reason
     from candidates c where old.id=c.old_id and c.n_old=1 and c.n_new=1;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('full_name',a.full_name,
    'student_code',a.student_code,'grade_level',a.grade_level,'gender',a.gender,
    'ign',a.ign,'team_role',a.team_role,'play_position',a.play_position,
    'birth_date',fd.birth_date,'jersey_number',fd.jersey_number,
    'player_role',fd.player_role,'player_note',fd.player_note)
    order by a.roster_position nulls last,a.full_name),'[]'::jsonb) into v_after_players
 from public.sports_athletes a left join public.sports_football_player_details fd
   on fd.entry_id=a.entry_id and fd.roster_position=a.roster_position
 where a.entry_id=p_entry;
 v_after:=jsonb_build_object('entry_name',btrim(p_name),'status',v_entry.status,
   'players',v_after_players,'coaches',p_coaches);
 insert into public.sports_admin_registration_edits(id,competition_id,event_id,entry_id,
   actor_id,reason,before_data,after_data,revoked_certificates,issued_certificates)
 values(v_change,v_entry.competition_id,v_entry.event_id,p_entry,auth.uid(),v_reason,
   v_before,v_after,v_revoked,v_issued);
 insert into public.sports_audit_logs(actor_user_id,action,entity_table,details)
 values(auth.uid(),'ADMIN_EDIT_REGISTRATION','sports_entries',
    jsonb_build_object('edit_id',v_change,'entry_id',p_entry,'event_id',v_entry.event_id,
    'reason',v_reason,'revoked_certificates',v_revoked,'issued_certificates',v_issued));
 return jsonb_build_object('entry_id',p_entry,'edited_at',v_now,'edit_id',v_change,
   'revoked_certificates',v_revoked,'issued_certificates',v_issued);
end $$;
revoke all on function public.sports_admin_update_registration(uuid,text,jsonb,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.sports_admin_update_registration(uuid,text,jsonb,jsonb,text,timestamptz) to authenticated;

commit;
notify pgrst,'reload schema';
