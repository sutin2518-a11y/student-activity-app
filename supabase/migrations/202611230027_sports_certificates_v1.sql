-- PHULANGKA GAMES 2569 • Certificate V1 (separate manual results from central scores).
-- Prerequisites: existing sports_competitions, sports_events, sports_schools,
-- sports_entries, sports_athletes, sports_roster_staff, sports_user_roles and
-- public.sports_stage3_admin(uuid). No existing competition results are changed.
-- Apply once in Supabase SQL Editor AFTER the v32.2 migrations.
begin;

create table if not exists public.sports_certificate_officials (
  event_id uuid not null references public.sports_events(id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  email text not null check(email=lower(btrim(email)) and length(email) between 6 and 254),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key(event_id,email)
);
create table if not exists public.sports_certificate_results (
  event_id uuid primary key references public.sports_events(id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  status text not null default 'submitted' check(status in ('submitted','rejected','approved','published')),
  rejection_reason text not null default '',
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.sports_certificate_placements (
  event_id uuid not null references public.sports_certificate_results(event_id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  entry_id uuid not null references public.sports_entries(id) on delete restrict,
  rank smallint not null check(rank between 1 and 3),
  slot smallint not null check(slot between 1 and 2),
  primary key(event_id,rank,slot),
  unique(event_id,entry_id)
);
create table if not exists public.sports_certificate_event_settings (
  event_id uuid primary key references public.sports_events(id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  participation_released boolean not null default false,
  released_at timestamptz,
  released_by uuid references auth.users(id) on delete set null
);
create table if not exists public.sports_certificate_settings (
  competition_id uuid primary key references public.sports_competitions(id) on delete restrict,
  signer_name text not null default '' check(length(signer_name) <= 200),
  signer_position text not null default '' check(length(signer_position) <= 250),
  title text not null default 'เกียรติบัตร' check(length(title) between 1 and 120),
  updated_at timestamptz not null default now()
);
-- Each issued document has an immutable recipient/event/rank/signature snapshot.
-- The public verification token is random; the sequential certificate number is NOT a secret.
create table if not exists public.sports_certificates_issued (
  id bigint generated always as identity primary key,
  verify_token uuid not null unique default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  event_id uuid not null references public.sports_events(id) on delete restrict,
  entry_id uuid not null references public.sports_entries(id) on delete restrict,
  school_id uuid not null references public.sports_schools(id) on delete restrict,
  recipient_type text not null check(recipient_type in ('athlete','coach')),
  recipient_key text not null check(length(recipient_key) between 1 and 200),
  recipient_name text not null check(length(recipient_name) between 1 and 250),
  school_name text not null,
  event_name text not null,
  competition_name text not null,
  certificate_title text not null default 'เกียรติบัตร',
  award_rank smallint check(award_rank between 1 and 3),
  certificate_kind text not null check(certificate_kind in ('award','participation')),
  signer_name text not null default '',
  signer_position text not null default '',
  is_active boolean not null default true,
  issued_at timestamptz not null default now(),
  unique(event_id,entry_id,recipient_type,recipient_key,certificate_kind),
  check((certificate_kind='award' and award_rank is not null) or
        (certificate_kind='participation' and award_rank is null))
);
create index if not exists sports_cert_issued_school_idx
  on public.sports_certificates_issued(competition_id,school_id,event_id,certificate_kind);
create index if not exists sports_cert_placements_entry_idx on public.sports_certificate_placements(entry_id);

-- All direct table operations are disabled. All reads/writes pass permission-checked RPCs.
alter table public.sports_certificate_officials enable row level security;
alter table public.sports_certificate_results enable row level security;
alter table public.sports_certificate_placements enable row level security;
alter table public.sports_certificate_event_settings enable row level security;
alter table public.sports_certificate_settings enable row level security;
alter table public.sports_certificates_issued enable row level security;
revoke all on public.sports_certificate_officials, public.sports_certificate_results,
 public.sports_certificate_placements, public.sports_certificate_event_settings,
 public.sports_certificate_settings, public.sports_certificates_issued from public,anon,authenticated;

-- Assign a particular event to a verified Google user; no arbitrary school accounts
-- or self-declared email metadata can obtain permission to enter official results.
create or replace function public.sports_cert_can_record(p_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
   select 1 from public.sports_events e where e.id=p_event and
   (public.sports_stage3_admin(e.competition_id) or exists(
     select 1 from public.sports_certificate_officials o
     join auth.users u on u.id=auth.uid()
     where o.event_id=e.id and o.competition_id=e.competition_id
       and o.is_active and o.email=lower(btrim(u.email))
       and u.email_confirmed_at is not null and exists(
         select 1 from auth.identities ident where ident.user_id=u.id and ident.provider='google'
       )
   ))
 );
$$;
revoke all on function public.sports_cert_can_record(uuid) from public,anon;
grant execute on function public.sports_cert_can_record(uuid) to authenticated;

create or replace function public.sports_cert_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_comp uuid; v_role text; v_school uuid; v_events jsonb; v_settings jsonb;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อนใช้เกียรติบัตร' using errcode='42501'; end if;
 select id into v_comp from public.sports_competitions
  where slug='phayao-secondary-group-sports-2569';
 if v_comp is null then raise exception 'ไม่พบการแข่งขัน'; end if;
 if public.sports_stage3_admin(v_comp) then v_role:='admin';
 elsif exists(select 1 from public.sports_events e where e.competition_id=v_comp and public.sports_cert_can_record(e.id))
   then v_role:='official';
 else
   select r.school_id into v_school from public.sports_user_roles r
   where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
   and (r.competition_id is null or r.competition_id=v_comp) and r.school_id is not null
   and exists(select 1 from public.sports_school_accounts sa
     where sa.user_id=auth.uid() and sa.school_id=r.school_id and sa.competition_id=v_comp and sa.is_active)
   limit 1;
   if v_school is null then raise exception 'บัญชีนี้ยังไม่มีสิทธิ์ใช้ระบบเกียรติบัตร' using errcode='42501'; end if;
   v_role:='school';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'sport_name',e.sport_name,'event_code',e.event_code,'event_type',e.event_type,
   'result_status',coalesce(r.status,'not_submitted'), 'rejection_reason',coalesce(r.rejection_reason,''),
   'participation_released',coalesce(s.participation_released,false),
   'can_record',public.sports_cert_can_record(e.id)
 ) order by e.sport_name),'[]'::jsonb) into v_events
 from public.sports_events e
 left join public.sports_certificate_results r on r.event_id=e.id
 left join public.sports_certificate_event_settings s on s.event_id=e.id
 where e.competition_id=v_comp and (v_role='admin'
     or (v_role='official' and public.sports_cert_can_record(e.id))
     or (v_role='school' and exists(
       select 1 from public.sports_entries en where en.event_id=e.id
        and en.school_id=v_school and en.status='approved'
     )));
 select jsonb_build_object('title',coalesce(s.title,'เกียรติบัตร'),
   'signer_name',coalesce(s.signer_name,''),'signer_position',coalesce(s.signer_position,''))
 into v_settings from (select 1) x left join public.sports_certificate_settings s on s.competition_id=v_comp;
 return jsonb_build_object('competition_id',v_comp,'role',v_role,'school_id',v_school,
   'events',v_events,'settings',v_settings);
end; $$;
revoke all on function public.sports_cert_context() from public,anon;
grant execute on function public.sports_cert_context() to authenticated;

create or replace function public.sports_cert_event_entries(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์ดูรายชื่อทีมเพื่อส่งผล' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',en.id,'school_name',s.name,
   'entry_name',en.entry_name,'athlete_count',(
     select count(*) from public.sports_athletes a where a.entry_id=en.id
   )) order by s.name,en.entry_name),'[]'::jsonb) into v_result
 from public.sports_entries en join public.sports_schools s on s.id=en.school_id
 where en.event_id=p_event and en.status='approved';
 return v_result;
end; $$;
revoke all on function public.sports_cert_event_entries(uuid) from public,anon;
grant execute on function public.sports_cert_event_entries(uuid) to authenticated;

create or replace function public.sports_cert_result_details(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์ดูผลที่ยังไม่เผยแพร่' using errcode='42501'; end if;
 select jsonb_build_object('status',r.status,'reason',r.rejection_reason,'placements',
   coalesce((select jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
     order by p.rank,p.slot) from public.sports_certificate_placements p where p.event_id=p_event),'[]'::jsonb))
 into v_result from public.sports_certificate_results r where r.event_id=p_event;
 return coalesce(v_result,'null'::jsonb);
end; $$;
revoke all on function public.sports_cert_result_details(uuid) from public,anon;
grant execute on function public.sports_cert_result_details(uuid) to authenticated;

create or replace function public.sports_cert_submit(p_event uuid,p_awards jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.sports_events%rowtype; v_expected int; v_num int; v_status text;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์ส่งผลการแข่งขัน' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 v_expected:=case when v_event.event_type='athletics' then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected
 then raise exception 'จำนวนอันดับไม่ครบตามประเภทการแข่งขัน'; end if;
 if exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)
    where x.rank is null or x.slot is null or x.entry_id is null or x.rank not between 1 and 3
       or x.slot not between 1 and 2 or (x.rank<>3 and x.slot<>1)
       or (v_event.event_type='athletics' and x.slot<>1))
 then raise exception 'ข้อมูลอันดับไม่ถูกต้อง'; end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
   or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=2))
 then raise exception 'อันดับซ้ำหรือผู้ได้รับรางวัลซ้ำ กรุณาตรวจสอบ'; end if;
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved'
 and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num <> v_expected then raise exception 'ต้องเลือกใบสมัครที่ได้รับแล้วจากรายการนี้เท่านั้น'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select status into v_status from public.sports_certificate_results where event_id=p_event for update;
 if v_status is not null and v_status not in ('submitted','rejected') then
   raise exception 'ผลรายการนี้ผ่านการอนุมัติหรือเผยแพร่แล้ว ไม่สามารถเขียนทับได้'; end if;
 insert into public.sports_certificate_results(event_id,competition_id,status,rejection_reason,submitted_by,submitted_at,approved_by,approved_at,published_at,updated_at)
 values(p_event,v_event.competition_id,'submitted','',auth.uid(),now(),null,null,null,now())
 on conflict(event_id) do update set status='submitted',rejection_reason='',submitted_by=auth.uid(),
    submitted_at=now(),approved_by=null,approved_at=null,published_at=null,updated_at=now();
 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_event.competition_id,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);
 return jsonb_build_object('status','submitted','count',v_expected);
end; $$;
revoke all on function public.sports_cert_submit(uuid,jsonb) from public,anon;
grant execute on function public.sports_cert_submit(uuid,jsonb) to authenticated;

create or replace function public.sports_cert_officials(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_data jsonb;
begin
 select competition_id into v_comp from public.sports_events where id=p_event;
 if not public.sports_stage3_admin(v_comp) then raise exception 'ไม่มีสิทธิ์จัดการผู้บันทึกผล' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('email',email,'is_active',is_active) order by email),'[]'::jsonb)
 into v_data from public.sports_certificate_officials where event_id=p_event;
 return v_data;
end; $$;
revoke all on function public.sports_cert_officials(uuid) from public,anon;
grant execute on function public.sports_cert_officials(uuid) to authenticated;

create or replace function public.sports_cert_set_official(p_event uuid,p_email text,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_comp uuid; v_email text:=lower(btrim(coalesce(p_email,'')));
begin
 select competition_id into v_comp from public.sports_events where id=p_event;
 if not public.sports_stage3_admin(v_comp) then raise exception 'ไม่มีสิทธิ์มอบหมายกรรมการ' using errcode='42501'; end if;
 if v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' or length(v_email)>254 or p_active is null
 then raise exception 'กรุณากรอกอีเมลและสถานะให้ถูกต้อง'; end if;
 insert into public.sports_certificate_officials(event_id,competition_id,email,is_active,updated_by)
 values(p_event,v_comp,v_email,p_active,auth.uid())
 on conflict(event_id,email) do update set is_active=excluded.is_active,updated_by=auth.uid(),updated_at=now();
end; $$;
revoke all on function public.sports_cert_set_official(uuid,text,boolean) from public,anon;
grant execute on function public.sports_cert_set_official(uuid,text,boolean) to authenticated;

create or replace function public.sports_cert_save_settings(p_comp uuid,p_signer text,p_position text,p_title text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.sports_stage3_admin(p_comp) then raise exception 'ไม่มีสิทธิ์แก้ไขแม่แบบ' using errcode='42501'; end if;
 if length(btrim(coalesce(p_signer,'')))>200 or length(btrim(coalesce(p_position,'')))>250
    or length(btrim(coalesce(p_title,''))) not between 1 and 120
 then raise exception 'ข้อความในแม่แบบไม่ถูกต้อง'; end if;
 insert into public.sports_certificate_settings(competition_id,signer_name,signer_position,title)
 values(p_comp,btrim(coalesce(p_signer,'')),btrim(coalesce(p_position,'')),btrim(p_title))
 on conflict(competition_id) do update set signer_name=excluded.signer_name,
 signer_position=excluded.signer_position,title=excluded.title,updated_at=now();
end; $$;
revoke all on function public.sports_cert_save_settings(uuid,text,text,text) from public,anon;
grant execute on function public.sports_cert_save_settings(uuid,text,text,text) to authenticated;

-- Internal issuance procedure is not callable from browser accounts.
create or replace function public.sports_cert_issue_internal(p_event uuid,p_kind text)
returns integer language plpgsql security definer set search_path='' as $$
declare v_event public.sports_events%rowtype; v_count int:=0;
begin
 select * into strict v_event from public.sports_events where id=p_event;
 if p_kind='award' and not exists(select 1 from public.sports_certificate_results r where r.event_id=p_event and r.status='published') then
   raise exception 'ยังไม่เผยแพร่ผลอย่างเป็นทางการ'; end if;
 if p_kind='participation' and not exists(select 1 from public.sports_certificate_event_settings s
   where s.event_id=p_event and s.participation_released) then raise exception 'ยังไม่เปิดเกียรติบัตรเข้าร่วม'; end if;
 if p_kind not in ('award','participation') then raise exception 'ประเภทเกียรติบัตรไม่ถูกต้อง'; end if;
 -- Athletes: stable roster-position identity; snapshots cannot be overwritten.
 with eligible as (
  select en.id entry_id,en.school_id,s.name school_name,
   a.full_name recipient_name,
   'athlete:'||coalesce(a.roster_position::text,
     row_number() over(partition by en.id order by a.roster_position nulls last,a.full_name)::text) recipient_key,
   p.rank award_rank
  from public.sports_entries en
  join public.sports_schools s on s.id=en.school_id
  join public.sports_athletes a on a.entry_id=en.id
  left join public.sports_certificate_placements p on p.entry_id=en.id and p.event_id=p_event
  where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved'
    and (p_kind='participation' or p.rank is not null)
 )
 insert into public.sports_certificates_issued(competition_id,event_id,entry_id,school_id,
  recipient_type,recipient_key,recipient_name,school_name,event_name,competition_name,certificate_title,
  award_rank,certificate_kind,signer_name,signer_position)
 select v_event.competition_id,p_event,a.entry_id,a.school_id,'athlete',a.recipient_key,
  a.recipient_name,a.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
  case when p_kind='award' then a.award_rank else null end,p_kind,
  coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from eligible a join public.sports_competitions c on c.id=v_event.competition_id
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_event.competition_id
 on conflict(event_id,entry_id,recipient_type,recipient_key,certificate_kind) do nothing;
 get diagnostics v_count = row_count;
 -- Coaching staff of ALL registered/received teams also receive participation
 -- certificates; award-winning teams' staff additionally receive ranked ones.
 -- Deduplicate participation coaches across multiple individual entries from
 -- the same school and event (e.g. a track coach with ten athletes).
 with ranked as (
  select en.id entry_id,en.school_id,s.name school_name,p.rank award_rank,
    coalesce(nullif(st.coaches,'[]'::jsonb),
      case when nullif(btrim(coalesce(en.coach_name,'')),'') is not null
        then jsonb_build_array(jsonb_build_object('name',en.coach_name)) else '[]'::jsonb end) staff
  from public.sports_entries en
  join public.sports_schools s on s.id=en.school_id
  left join public.sports_certificate_placements p on p.entry_id=en.id and p.event_id=p_event
  left join public.sports_roster_staff st on st.entry_id=en.id
  where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved'
    and (p_kind='participation' or p.rank is not null)
 ),expanded as (
  select en.*,staff.pos,btrim(coalesce(staff.person->>'name','')) coach_name,
    row_number() over(partition by en.school_id,lower(btrim(coalesce(staff.person->>'name','')))
                     order by en.entry_id,staff.pos) coach_repeat
  from ranked en cross join lateral jsonb_array_elements(en.staff) with ordinality staff(person,pos)
 )
 insert into public.sports_certificates_issued(competition_id,event_id,entry_id,school_id,
   recipient_type,recipient_key,recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position)
 select v_event.competition_id,p_event,en.entry_id,en.school_id,'coach',
   'coach:'||en.pos::text,en.coach_name,en.school_name,v_event.sport_name,c.name,
   coalesce(cfg.title,'เกียรติบัตร'),case when p_kind='award' then en.award_rank else null end,p_kind,
   coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from expanded en join public.sports_competitions c on c.id=v_event.competition_id
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_event.competition_id
 where en.coach_name<>'' and (p_kind='award' or en.coach_repeat=1)
 on conflict(event_id,entry_id,recipient_type,recipient_key,certificate_kind) do nothing;
 return v_count;
end; $$;
revoke all on function public.sports_cert_issue_internal(uuid,text) from public,anon,authenticated;

create or replace function public.sports_cert_review(p_event uuid,p_action text,p_reason text default '')
returns text language plpgsql security definer set search_path='' as $$
declare v_comp uuid; v_status text;
begin
 select competition_id into v_comp from public.sports_events where id=p_event;
 if not public.sports_stage3_admin(v_comp) then raise exception 'เฉพาะผู้ดูแลการแข่งขันอนุมัติผลได้' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select status into v_status from public.sports_certificate_results where event_id=p_event for update;
 if v_status is null then raise exception 'รายการนี้ยังไม่มีผลที่ส่งมา'; end if;
 if p_action='approve' and v_status='submitted' then
   update public.sports_certificate_results set status='approved',approved_by=auth.uid(),
    approved_at=now(),rejection_reason='',updated_at=now() where event_id=p_event;
 elsif p_action='reject' and v_status in ('submitted','approved')
       and nullif(btrim(coalesce(p_reason,'')),'') is not null then
   update public.sports_certificate_results set status='rejected',approved_by=null,approved_at=null,
    rejection_reason=left(btrim(p_reason),2000),updated_at=now() where event_id=p_event;
 elsif p_action='publish' and v_status='approved' then
   update public.sports_certificate_results set status='published',published_at=now(),updated_at=now() where event_id=p_event;
   perform public.sports_cert_issue_internal(p_event,'award');
 else raise exception 'เปลี่ยนสถานะไม่ได้ กรุณาตรวจสอบขั้นตอนอนุมัติและเหตุผล'; end if;
 return case when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'published' end;
end; $$;
revoke all on function public.sports_cert_review(uuid,text,text) from public,anon;
grant execute on function public.sports_cert_review(uuid,text,text) to authenticated;

create or replace function public.sports_cert_participation(p_event uuid,p_enable boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_comp uuid;
begin
 select competition_id into v_comp from public.sports_events where id=p_event;
 if not public.sports_stage3_admin(v_comp) then raise exception 'ไม่มีสิทธิ์เปิดเกียรติบัตรเข้าร่วม' using errcode='42501'; end if;
 if p_enable is null then raise exception 'กรุณาระบุสถานะ'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 insert into public.sports_certificate_event_settings(event_id,competition_id,participation_released,released_at,released_by)
 values(p_event,v_comp,p_enable,case when p_enable then now() end,auth.uid())
 on conflict(event_id) do update set participation_released=excluded.participation_released,
 released_at=excluded.released_at,released_by=auth.uid();
 update public.sports_certificates_issued set is_active=p_enable
 where event_id=p_event and certificate_kind='participation';
 if p_enable then perform public.sports_cert_issue_internal(p_event,'participation'); end if;
end; $$;
revoke all on function public.sports_cert_participation(uuid,boolean) from public,anon;
grant execute on function public.sports_cert_participation(uuid,boolean) to authenticated;

-- Re-run after a late roster is approved. Existing certificate snapshots remain unchanged.
create or replace function public.sports_cert_sync(p_event uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_comp uuid;
begin
 select competition_id into v_comp from public.sports_events where id=p_event;
 if not public.sports_stage3_admin(v_comp) then raise exception 'ไม่มีสิทธิ์ซิงค์เกียรติบัตร' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if exists(select 1 from public.sports_certificate_results where event_id=p_event and status='published')
 then perform public.sports_cert_issue_internal(p_event,'award'); end if;
 if exists(select 1 from public.sports_certificate_event_settings where event_id=p_event and participation_released)
 then perform public.sports_cert_issue_internal(p_event,'participation'); end if;
end; $$;
revoke all on function public.sports_cert_sync(uuid) from public,anon;
grant execute on function public.sports_cert_sync(uuid) to authenticated;

create or replace function public.sports_cert_my_documents(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_school uuid; v_admin boolean; v_data jsonb;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อนพิมพ์เกียรติบัตร' using errcode='42501'; end if;
 select competition_id into v_comp from public.sports_events where id=p_event;
 if v_comp is null then raise exception 'ไม่พบรายการ'; end if;
 v_admin:=public.sports_stage3_admin(v_comp);
 if not v_admin then
  select r.school_id into v_school from public.sports_user_roles r
  where r.user_id=auth.uid() and r.role='school_manager' and r.is_active
    and (r.competition_id=v_comp or r.competition_id is null) and r.school_id is not null
    and exists(select 1 from public.sports_school_accounts sa
      where sa.user_id=auth.uid() and sa.school_id=r.school_id and sa.competition_id=v_comp and sa.is_active)
  limit 1;
  if v_school is null then raise exception 'ไม่มีสิทธิ์พิมพ์เกียรติบัตรรายการนี้' using errcode='42501'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'token',i.verify_token,
   'recipient_name',i.recipient_name,'recipient_type',i.recipient_type,'school_name',i.school_name,
   'event_name',i.event_name,'competition_name',i.competition_name,'certificate_title',i.certificate_title,
   'rank',i.award_rank,'kind',i.certificate_kind,'signer_name',i.signer_name,
   'signer_position',i.signer_position,'issued_at',i.issued_at)
   order by i.school_name,i.certificate_kind,i.award_rank nulls last,i.recipient_name),'[]'::jsonb)
 into v_data from public.sports_certificates_issued i where i.event_id=p_event and i.is_active
   and (v_admin or i.school_id=v_school);
 return v_data;
end; $$;
revoke all on function public.sports_cert_my_documents(uuid) from public,anon;
grant execute on function public.sports_cert_my_documents(uuid) to authenticated;

-- Public read exposes only the exact record addressed by a 128-bit unguessable token.
-- Never permit lookup by sequential certificate ID, email, school or student code.
create or replace function public.sports_cert_verify(p_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('valid',true,'id',id,'recipient_name',recipient_name,
   'recipient_type',recipient_type,'school_name',school_name,'event_name',event_name,
   'competition_name',competition_name,'kind',certificate_kind,'rank',award_rank,'issued_at',issued_at)
   from public.sports_certificates_issued where verify_token=p_token and is_active),
   jsonb_build_object('valid',false));
$$;
revoke all on function public.sports_cert_verify(uuid) from public;
grant execute on function public.sports_cert_verify(uuid) to anon,authenticated;

commit;
notify pgrst, 'reload schema';
