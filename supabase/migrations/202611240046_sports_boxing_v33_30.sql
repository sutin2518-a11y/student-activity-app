-- v33.30 Boxing; no seeded fighters, no fabricated fixtures. Run after 045.
begin;
do $$ begin
 if to_regprocedure('public.sports_is_tabletennis(uuid)') is null then raise exception 'ติดตั้ง Migration 045 ก่อน'; end if;
 if (select count(*) from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code ~ '^GS3-BX-(36|39|42|45|48|51|54|57|60|64|67|71|75)[MF]$')<>26 then raise exception 'ไม่พบรายการมวยครบ 26 รายการ'; end if;
 if exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code like 'GS3-BX-%' and (exists(select 1 from public.sports_matches m where m.event_id=e.id) or exists(select 1 from public.sports_football_matches m where m.event_id=e.id) or exists(select 1 from public.sports_schedule_sessions ss where ss.event_id=e.id and ss.status in ('published','postponed')))) then raise exception 'พบโปรแกรมมวยเดิม กรุณาตรวจสอบก่อนย้าย';end if;
end $$;
create or replace function public.sports_is_boxing(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and c.slug='phayao-secondary-group-sports-2569' and e.event_code ~ '^GS3-BX-(36|39|42|45|48|51|54|57|60|64|67|71|75)[MF]$');
$$;
revoke all on function public.sports_is_boxing(uuid) from public,anon; grant execute on function public.sports_is_boxing(uuid) to authenticated;
create or replace function public.sports_boxing_can_score(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.sports_is_boxing(p_event) and exists(select 1 from public.sports_events e where e.id=p_event and (public.sports_stage3_admin(e.competition_id) or exists(select 1 from public.sports_event_referees r join auth.users u on lower(btrim(u.email))=r.email where r.event_id=e.id and r.competition_id=e.competition_id and r.is_active and u.id=auth.uid() and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'))));
$$;
revoke all on function public.sports_boxing_can_score(uuid) from public,anon; grant execute on function public.sports_boxing_can_score(uuid) to authenticated;
-- Sensitive information remains private, including actual weight and clearance status. No clinical notes/signatures stored.
create table if not exists public.sports_boxing_checks (
 entry_id uuid primary key references public.sports_entries(id) on delete cascade,
 event_id uuid not null references public.sports_events(id),
 weight_kg numeric(6,3) not null check(weight_kg>0 and weight_kg<=300),
 cleared boolean not null,
 athlete_snapshot jsonb not null,
 checked_at timestamptz not null default now(),
 checked_by uuid references auth.users(id) on delete set null
);
create table if not exists public.sports_boxing_draws (
 event_id uuid primary key references public.sports_events(id),
 seed_entries uuid[] not null,
 published boolean not null default false,
 award_rule_confirmed boolean not null default false,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null
);
create table if not exists public.sports_boxing_bouts (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.sports_boxing_draws(event_id) on delete cascade,
 match_no integer not null,
 round_no integer not null,
 round_name text not null,
 red_entry uuid references public.sports_entries(id), blue_entry uuid references public.sports_entries(id),
 source_red integer, source_blue integer,
 winner_entry uuid references public.sports_entries(id),
 status text not null default 'draft' check(status in ('draft','bye','published','completed')),
 scheduled_date date, start_time time, end_time time,
 decision text, ended_round integer check(ended_round between 1 and 3),
 updated_at timestamptz not null default clock_timestamp(), updated_by uuid references auth.users(id) on delete set null,
 unique(event_id,match_no),
 check(red_entry is null or blue_entry is null or red_entry<>blue_entry),
 check(winner_entry is null or winner_entry=red_entry or winner_entry=blue_entry)
);
create table if not exists public.sports_boxing_audit (
 id bigint generated always as identity primary key, event_id uuid not null references public.sports_events(id),
 action text not null, actor uuid references auth.users(id) on delete set null, at timestamptz not null default now(), detail jsonb not null default '{}'::jsonb
);
alter table public.sports_boxing_checks enable row level security;
alter table public.sports_boxing_draws enable row level security;
alter table public.sports_boxing_bouts enable row level security;
alter table public.sports_boxing_audit enable row level security;
revoke all on public.sports_boxing_checks,public.sports_boxing_draws,public.sports_boxing_bouts,public.sports_boxing_audit from public,anon,authenticated;
-- Only RPCs read/write; the public RPC exposes school names, not student names or health data.
create or replace function public.sports_boxing_snapshot(p_entry uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then jsonb_agg(jsonb_build_object('name',a.full_name,'student_code',a.student_code,'gender',a.gender,'school',en.school_id)) end
 from public.sports_athletes a join public.sports_entries en on en.id=a.entry_id where en.id=p_entry and en.status='approved';
$$;
revoke all on function public.sports_boxing_snapshot(uuid) from public,anon,authenticated;
create or replace function public.sports_boxing_eligible(p_event uuid,p_entry uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_boxing_checks ch join public.sports_entries en on en.id=ch.entry_id join public.sports_events e on e.id=en.event_id
 where ch.entry_id=p_entry and ch.event_id=p_event and en.event_id=p_event and ch.cleared and en.status='approved'
 and ch.athlete_snapshot=public.sports_boxing_snapshot(en.id)
 and ch.weight_kg>substring(e.event_code from 'BX-([0-9]+)')::numeric
 and (substring(e.event_code from 'BX-([0-9]+)')::int=75 or ch.weight_kg<=case substring(e.event_code from 'BX-([0-9]+)')::int when 60 then 64 when 67 then 71 when 71 then 75 else substring(e.event_code from 'BX-([0-9]+)')::int+3 end));
$$;
revoke all on function public.sports_boxing_eligible(uuid,uuid) from public,anon,authenticated;
create or replace function public.sports_boxing_private(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare adm boolean; result jsonb;
begin
 if not public.sports_boxing_can_score(p_event) then raise exception 'ไม่มีสิทธิ์รายการนี้' using errcode='42501'; end if;
 select public.sports_stage3_admin(competition_id) into adm from public.sports_events where id=p_event;
 select jsonb_build_object('admin',adm,'draw',(select to_jsonb(d) - 'created_by' from public.sports_boxing_draws d where d.event_id=p_event),
 'entries',coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'school',s.name,'name',(select string_agg(a.full_name,' / ') from public.sports_athletes a where a.entry_id=en.id),'eligible',public.sports_boxing_eligible(p_event,en.id),'weight',case when adm then ch.weight_kg end) order by s.name,en.id) from public.sports_entries en join public.sports_schools s on s.id=en.school_id left join public.sports_boxing_checks ch on ch.entry_id=en.id where en.event_id=p_event and en.status='approved'),'[]'::jsonb),
 'bouts',coalesce((select jsonb_agg(to_jsonb(b) - 'updated_by' order by match_no) from public.sports_boxing_bouts b where b.event_id=p_event),'[]'::jsonb),
 'awarded',public.sports_award_is_published(p_event)) into result;
 return result;
end $$;
revoke all on function public.sports_boxing_private(uuid) from public,anon; grant execute on function public.sports_boxing_private(uuid) to authenticated;
create or replace function public.sports_boxing_check(p_event uuid,p_entry uuid,p_weight numeric,p_clear boolean) returns void language plpgsql security definer set search_path='' as $$
declare snap jsonb; ev public.sports_events%rowtype; lo int; hi int;
begin
 select * into strict ev from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_boxing(p_event) or not public.sports_stage3_admin(ev.competition_id) then raise exception 'เฉพาะผู้ดูแลที่ได้รับมอบหมายตรวจหลักฐาน' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if exists(select 1 from public.sports_boxing_draws where event_id=p_event) or public.sports_award_is_published(p_event) then raise exception 'จับสายหรือประกาศผลแล้ว ไม่สามารถเปลี่ยนผลตรวจได้';end if;
 if not exists(select 1 from public.sports_entries where id=p_entry and event_id=p_event and competition_id=ev.competition_id and status='approved') then raise exception 'ไม่พบใบสมัครที่ส่งแล้ว';end if;
 snap:=public.sports_boxing_snapshot(p_entry); if snap is null then raise exception 'ต้องมีนักกีฬา 1 คนต่อใบสมัคร';end if;
 lo:=substring(ev.event_code from 'BX-([0-9]+)')::int;hi:=case lo when 60 then 64 when 67 then 71 when 71 then 75 when 75 then null else lo+3 end;
 if p_clear is null or p_weight is null or p_weight::text='NaN' or p_weight<=0 or p_weight>300 or round(p_weight,3)<>p_weight then raise exception 'น้ำหนักไม่ถูกต้อง';end if;
 if p_clear and (p_weight<=lo or (hi is not null and p_weight>hi)) then raise exception 'น้ำหนักไม่ตรงรุ่น ห้ามรับรอง';end if;
 -- p_clear is an attestation of the signed medical/weigh-in document, NOT a medical decision.
 insert into public.sports_boxing_checks(entry_id,event_id,weight_kg,cleared,athlete_snapshot,checked_by) values(p_entry,p_event,p_weight,p_clear,snap,auth.uid()) on conflict(entry_id) do update set weight_kg=excluded.weight_kg,cleared=excluded.cleared,athlete_snapshot=excluded.athlete_snapshot,checked_at=now(),checked_by=auth.uid();
 insert into public.sports_boxing_audit(event_id,action,actor,detail) values(p_event,'check',auth.uid(),jsonb_build_object('entry_id',p_entry));
end $$;
revoke all on function public.sports_boxing_check(uuid,uuid,numeric,boolean) from public,anon; grant execute on function public.sports_boxing_check(uuid,uuid,numeric,boolean) to authenticated;
-- Draw order is supplied by administrator after the actual draw, not randomly invented.
create or replace function public.sports_boxing_make_draw(p_event uuid,p_seeds uuid[],p_award_rule boolean) returns void language plpgsql security definer set search_path='' as $$
declare ev public.sports_events%rowtype;n int;size int:=2;pairs int;depth int:=1;r int;i int;k int:=0;prev_start int:=1;curr_start int;red uuid;blue uuid;sr int;sb int;name text;
begin
 select * into strict ev from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_boxing(p_event) or not public.sports_stage3_admin(ev.competition_id) then raise exception 'เฉพาะผู้ดูแล' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if exists(select 1 from public.sports_boxing_draws where event_id=p_event) or public.sports_award_is_published(p_event) then raise exception 'มีสายหรือผลเดิมแล้ว';end if;
 if ev.status='registration' then raise exception 'ปิดรับสมัครก่อนจับสาย';end if;
 if exists(select 1 from public.sports_matches where event_id=p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event) or exists(select 1 from public.sports_schedule_sessions where event_id=p_event and status in ('published','postponed')) then raise exception 'พบคู่หรือโปรแกรมส่วนกลางเดิม กรุณาตรวจสอบก่อนจับสาย';end if;
 n:=coalesce(cardinality(p_seeds),0);
 if n not between 2 and 64 or (select count(distinct x) from unnest(p_seeds) x)<>n then raise exception 'ต้องมี 2–64 ใบสมัครไม่ซ้ำ';end if;
 if exists(select 1 from unnest(p_seeds) x where not public.sports_boxing_eligible(p_event,x)) then raise exception 'มีนักกีฬายังไม่ผ่านการตรวจหรือใบสมัครเปลี่ยนแปลง';end if;
 if (select count(*) from public.sports_entries en where en.event_id=p_event and public.sports_boxing_eligible(p_event,en.id))<>n then raise exception 'ต้องจัดนักกีฬาที่ผ่านตรวจครบทุกคน';end if;
 -- Duplicate students in a draw are rejected even if they have duplicate applications.
 if exists(select 1 from public.sports_entries en join public.sports_athletes a on a.entry_id=en.id where en.id=any(p_seeds) group by en.school_id,coalesce(nullif(btrim(a.student_code),''),regexp_replace(btrim(a.full_name),'[[:space:]]+','','g')) having count(*)>1) then raise exception 'พบรายชื่อนักกีฬาซ้ำ';end if;
 while size<n loop size:=size*2;depth:=depth+1;end loop;
 insert into public.sports_boxing_draws(event_id,seed_entries,award_rule_confirmed,created_by) values(p_event,p_seeds,coalesce(p_award_rule,false),auth.uid());
 for r in 1..depth loop
  pairs:=size/(2^r)::int;curr_start:=k+1;
  name:=case when pairs=1 then 'รอบชิงชนะเลิศ' when pairs=2 then 'รอบรองชนะเลิศ' when pairs=4 then 'รอบ 8 คน' else 'รอบคัดเลือก' end;
  for i in 1..pairs loop
   k:=k+1;red:=null;blue:=null;sr:=null;sb:=null;
   if r=1 then red:=p_seeds[i];blue:=p_seeds[i+pairs];
   else sr:=prev_start+2*(i-1);sb:=sr+1;
    select winner_entry into red from public.sports_boxing_bouts where event_id=p_event and match_no=sr;
    select winner_entry into blue from public.sports_boxing_bouts where event_id=p_event and match_no=sb;
   end if;
   insert into public.sports_boxing_bouts(event_id,match_no,round_no,round_name,red_entry,blue_entry,source_red,source_blue,status,winner_entry,updated_by) values(p_event,k,r,name,red,blue,sr,sb,case when r=1 and blue is null then 'bye' else 'draft' end,case when r=1 and blue is null then red end,auth.uid());
  end loop;
  prev_start:=curr_start;
 end loop;
 insert into public.sports_boxing_audit(event_id,action,actor,detail) values(p_event,'draw',auth.uid(),jsonb_build_object('entries',n));
end $$;
revoke all on function public.sports_boxing_make_draw(uuid,uuid[],boolean) from public,anon; grant execute on function public.sports_boxing_make_draw(uuid,uuid[],boolean) to authenticated;
create or replace function public.sports_boxing_plan(p_event uuid,p_match uuid,p_expected timestamptz,p_day date,p_start time,p_end time) returns void language plpgsql security definer set search_path='' as $$
declare ev public.sports_events%rowtype;b public.sports_boxing_bouts%rowtype;
begin
 select * into strict ev from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_boxing(p_event) or not public.sports_stage3_admin(ev.competition_id) then raise exception 'เฉพาะผู้ดูแล' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev.competition_id::text),300046);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select * into strict b from public.sports_boxing_bouts where id=p_match and event_id=p_event for update;
 if b.status<>'draft' or b.updated_at is distinct from p_expected then raise exception 'คู่แข่งขันถูกแก้ไขแล้วหรือไม่ใช่ฉบับร่าง';end if;
 if p_day is null or p_start is null or p_end is null or p_end<=p_start or p_day not between date '2026-12-03' and date '2026-12-06' then raise exception 'วันเวลาผิด';end if;
 if (b.round_name='รอบชิงชนะเลิศ' and p_day<>date '2026-12-06') or (b.round_name='รอบรองชนะเลิศ' and p_day<>date '2026-12-05') or (b.round_name not in ('รอบชิงชนะเลิศ','รอบรองชนะเลิศ') and (p_day>date '2026-12-04' or (p_day=date '2026-12-03' and p_start<time '13:00'))) then raise exception 'วันเวลาไม่ตรงรอบตามระเบียบ';end if;
 if exists(select 1 from public.sports_boxing_bouts x join public.sports_events e on e.id=x.event_id where e.competition_id=ev.competition_id and x.id<>p_match and x.status<>'bye' and x.scheduled_date=p_day and x.start_time<p_end and x.end_time>p_start) then raise exception 'เวทีมีคู่อื่นในช่วงเวลานี้';end if;
 update public.sports_boxing_bouts set scheduled_date=p_day,start_time=p_start,end_time=p_end,updated_at=clock_timestamp(),updated_by=auth.uid() where id=p_match;
end $$;
revoke all on function public.sports_boxing_plan(uuid,uuid,timestamptz,date,time,time) from public,anon; grant execute on function public.sports_boxing_plan(uuid,uuid,timestamptz,date,time,time) to authenticated;
create or replace function public.sports_boxing_publish(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare ev public.sports_events%rowtype;
begin
 select * into strict ev from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_boxing(p_event) or not public.sports_stage3_admin(ev.competition_id) then raise exception 'เฉพาะผู้ดูแล' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev.competition_id::text),300046);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if not exists(select 1 from public.sports_boxing_draws where event_id=p_event and not published) then raise exception 'ไม่พบสายฉบับร่าง';end if;
 if ev.status='registration' then raise exception 'ปิดรับสมัครก่อนเผยแพร่';end if;
 if exists(select 1 from public.sports_boxing_draws d,unnest(d.seed_entries) x where d.event_id=p_event and not public.sports_boxing_eligible(p_event,x)) then raise exception 'ข้อมูลนักกีฬาเปลี่ยนแปลง';end if;
 if exists(select 1 from public.sports_boxing_bouts where event_id=p_event and status<>'bye' and (scheduled_date is null or start_time is null or end_time is null)) then raise exception 'กำหนดเวลาทุกคู่ก่อน';end if;
 if exists(select 1 from public.sports_boxing_bouts a join public.sports_boxing_bouts b on a.event_id=b.event_id and a.match_no in(b.source_red,b.source_blue) where a.event_id=p_event and a.status<>'bye' and (a.scheduled_date,a.end_time)>(b.scheduled_date,b.start_time)) then raise exception 'คู่ก่อนหน้าต้องจบก่อนคู่ถัดไป';end if;
 update public.sports_boxing_draws set published=true where event_id=p_event;
 update public.sports_boxing_bouts set status='published',updated_at=clock_timestamp(),updated_by=auth.uid() where event_id=p_event and status='draft';
 update public.sports_events set status='scheduled' where id=p_event and status='draft';
 insert into public.sports_boxing_audit(event_id,action,actor) values(p_event,'publish',auth.uid());
end $$;
revoke all on function public.sports_boxing_publish(uuid) from public,anon; grant execute on function public.sports_boxing_publish(uuid) to authenticated;
create or replace function public.sports_boxing_score(p_event uuid,p_match uuid,p_expected timestamptz,p_winner uuid,p_decision text,p_round integer) returns void language plpgsql security definer set search_path='' as $$
declare b public.sports_boxing_bouts%rowtype;
begin
 if not public.sports_boxing_can_score(p_event) then raise exception 'ไม่มีสิทธิ์บันทึก' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select * into strict b from public.sports_boxing_bouts where id=p_match and event_id=p_event for update;
 if b.status<>'published' or b.updated_at is distinct from p_expected or public.sports_award_is_published(p_event) then raise exception 'ผลถูกบันทึกแล้วหรือข้อมูลเปลี่ยนแปลง';end if;
 if b.red_entry is null or b.blue_entry is null or p_winner is null or p_winner not in (b.red_entry,b.blue_entry) then raise exception 'คู่แข่งขันยังไม่ครบหรือผู้ชนะไม่ถูกต้อง';end if;
 if not public.sports_boxing_eligible(p_event,b.red_entry) or not public.sports_boxing_eligible(p_event,b.blue_entry) then raise exception 'ใบสมัครหรือผลตรวจไม่ตรงกับตอนจับสาย';end if;
 if p_decision is null or length(btrim(p_decision)) not between 1 and 120 or (p_round is not null and p_round not between 1 and 3) then raise exception 'ระบุคำตัดสินของกรรมการและยกที่จบ (ถ้ามี)';end if;
 update public.sports_boxing_bouts set winner_entry=p_winner,decision=btrim(p_decision),ended_round=p_round,status='completed',updated_at=clock_timestamp(),updated_by=auth.uid() where id=p_match;
 update public.sports_boxing_bouts set red_entry=case when source_red=b.match_no then p_winner else red_entry end,blue_entry=case when source_blue=b.match_no then p_winner else blue_entry end,updated_at=clock_timestamp(),updated_by=auth.uid() where event_id=p_event and status='published' and (source_red=b.match_no or source_blue=b.match_no);
 insert into public.sports_boxing_audit(event_id,action,actor,detail) values(p_event,'score',auth.uid(),jsonb_build_object('match',p_match,'winner',p_winner,'decision',btrim(p_decision),'round',p_round));
end $$;
revoke all on function public.sports_boxing_score(uuid,uuid,timestamptz,uuid,text,integer) from public,anon; grant execute on function public.sports_boxing_score(uuid,uuid,timestamptz,uuid,text,integer) to authenticated;
-- Public RPC: school names only; BYE and private clearance details excluded.
create or replace function public.sports_boxing_public(p_comp uuid) returns table(id uuid,event_id uuid,match_no integer,round_name text,scheduled_date date,start_time time,end_time time,venue_name text,status text,red_school text,blue_school text,winner_school text) language sql stable security definer set search_path='' as $$
 select b.id,b.event_id,b.match_no,b.round_name,b.scheduled_date,b.start_time,b.end_time,'โรงเรียนราชประชานุเคราะห์ 24'::text,b.status,coalesce(sr.name,'รอผู้ชนะ'),coalesce(sb.name,'รอผู้ชนะ'),sw.name
 from public.sports_boxing_bouts b join public.sports_boxing_draws d on d.event_id=b.event_id join public.sports_events e on e.id=b.event_id join public.sports_competitions c on c.id=e.competition_id
 left join public.sports_entries er on er.id=b.red_entry left join public.sports_schools sr on sr.id=er.school_id
 left join public.sports_entries eb on eb.id=b.blue_entry left join public.sports_schools sb on sb.id=eb.school_id
 left join public.sports_entries ew on ew.id=b.winner_entry left join public.sports_schools sw on sw.id=ew.school_id
 where c.id=p_comp and c.slug='phayao-secondary-group-sports-2569' and d.published and e.status<>'draft' and b.status in ('published','completed') order by b.scheduled_date,b.start_time,b.match_no;
$$;
revoke all on function public.sports_boxing_public(uuid) from public; grant execute on function public.sports_boxing_public(uuid) to anon,authenticated;
-- Proposed medals: rank 1/2 from final, bronze from each actually contested semifinal. Requires organizer confirmation.
create or replace function public.sports_boxing_awards(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f public.sports_boxing_bouts%rowtype; placements jsonb; b record; slot_no int:=0;
begin
 if not public.sports_cert_can_record(p_event) or not public.sports_is_boxing(p_event) then raise exception 'ไม่มีสิทธิ์' using errcode='42501';end if;
 if not exists(select 1 from public.sports_boxing_draws where event_id=p_event and published and award_rule_confirmed) or exists(select 1 from public.sports_boxing_bouts where event_id=p_event and status not in ('completed','bye')) or exists(select 1 from public.sports_boxing_draws d,unnest(d.seed_entries) x where d.event_id=p_event and not public.sports_boxing_eligible(p_event,x)) then return jsonb_build_object('status','incomplete','placements','[]'::jsonb);end if;
 select * into f from public.sports_boxing_bouts where event_id=p_event and round_name='รอบชิงชนะเลิศ' and status='completed'; if not found then return jsonb_build_object('status','incomplete','placements','[]'::jsonb);end if;
 placements:=jsonb_build_array(jsonb_build_object('rank',1,'slot',1,'entry_id',f.winner_entry),jsonb_build_object('rank',2,'slot',1,'entry_id',case when f.winner_entry=f.red_entry then f.blue_entry else f.red_entry end));
 for b in select * from public.sports_boxing_bouts where event_id=p_event and round_name='รอบรองชนะเลิศ' and status='completed' order by match_no loop
  slot_no:=slot_no+1;placements:=placements||jsonb_build_array(jsonb_build_object('rank',3,'slot',slot_no,'entry_id',case when b.winner_entry=b.red_entry then b.blue_entry else b.red_entry end));
 end loop;
 -- Existing medal ledger assumes one medal of each type per school/event. Stop rather than silently collapse two bronzes.
 if exists(select 1 from jsonb_to_recordset(placements) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id group by x.rank,en.school_id having count(*)>1) then return jsonb_build_object('status','ambiguous','placements','[]'::jsonb);end if;
 return jsonb_build_object('status','ready','placements',placements);
end $$;
revoke all on function public.sports_boxing_awards(uuid) from public,anon; grant execute on function public.sports_boxing_awards(uuid) to authenticated;
-- Restrict generic direct result/medal writes and generic match edits for boxing; existing other sports unaffected.
drop policy if exists "boxing insert guard" on public.sports_matches;
create policy "boxing insert guard" on public.sports_matches as restrictive for insert to authenticated with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing update guard" on public.sports_matches;
create policy "boxing update guard" on public.sports_matches as restrictive for update to authenticated using(not public.sports_is_boxing(event_id)) with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing delete guard" on public.sports_matches;
create policy "boxing delete guard" on public.sports_matches as restrictive for delete to authenticated using(not public.sports_is_boxing(event_id)) ;
drop policy if exists "boxing insert guard" on public.sports_football_matches;
create policy "boxing insert guard" on public.sports_football_matches as restrictive for insert to authenticated with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing update guard" on public.sports_football_matches;
create policy "boxing update guard" on public.sports_football_matches as restrictive for update to authenticated using(not public.sports_is_boxing(event_id)) with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing delete guard" on public.sports_football_matches;
create policy "boxing delete guard" on public.sports_football_matches as restrictive for delete to authenticated using(not public.sports_is_boxing(event_id)) ;
drop policy if exists "boxing insert guard" on public.sports_event_results;
create policy "boxing insert guard" on public.sports_event_results as restrictive for insert to authenticated with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing update guard" on public.sports_event_results;
create policy "boxing update guard" on public.sports_event_results as restrictive for update to authenticated using(not public.sports_is_boxing(event_id)) with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing delete guard" on public.sports_event_results;
create policy "boxing delete guard" on public.sports_event_results as restrictive for delete to authenticated using(not public.sports_is_boxing(event_id)) ;
drop policy if exists "boxing insert guard" on public.sports_medals;
create policy "boxing insert guard" on public.sports_medals as restrictive for insert to authenticated with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing update guard" on public.sports_medals;
create policy "boxing update guard" on public.sports_medals as restrictive for update to authenticated using(not public.sports_is_boxing(event_id)) with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing delete guard" on public.sports_medals;
create policy "boxing delete guard" on public.sports_medals as restrictive for delete to authenticated using(not public.sports_is_boxing(event_id)) ;

drop policy if exists "boxing schedule insert guard" on public.sports_schedule_sessions;
create policy "boxing schedule insert guard" on public.sports_schedule_sessions as restrictive for insert to authenticated with check(not public.sports_is_boxing(event_id));
drop policy if exists "boxing schedule update guard" on public.sports_schedule_sessions;
create policy "boxing schedule update guard" on public.sports_schedule_sessions as restrictive for update to authenticated using(not public.sports_is_boxing(event_id)) with check(not public.sports_is_boxing(event_id));

create or replace function public.sports_cert_submit(p_event uuid,p_awards jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_expected int;
 v_num int;
 v_status text;
 v_box jsonb;
begin
 if not public.sports_cert_can_record(p_event) then
   raise exception 'ไม่มีสิทธิ์ประกาศผลรายการนี้' using errcode='42501';
 end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 if public.sports_is_boxing(p_event) then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
   v_box:=public.sports_boxing_awards(p_event);
   if v_box->>'status'<>'ready' then raise exception 'ยังไม่พร้อมประกาศผลมวยหรือกติการางวัลยังไม่ได้รับการยืนยัน';end if;
   v_expected:=jsonb_array_length(v_box->'placements');
   if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected or not (p_awards @> (v_box->'placements') and (v_box->'placements') @> p_awards) then raise exception 'อันดับมวยต้องตรงกับผลที่ยืนยัน';end if;
 else
 v_expected:=case when (v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'จำนวนอันดับไม่ครบตามประเภทการแข่งขัน';
 end if;
 if exists(
   select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
      or x.rank not between 1 and 3 or x.slot not between 1 and 2
      or (x.rank<>3 and x.slot<>1)
      or ((v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) and x.slot<>1)
 ) then raise exception 'ข้อมูลอันดับไม่ถูกต้อง'; end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
   or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=2))
 then raise exception 'อันดับซ้ำหรือผู้ได้รับรางวัลซ้ำ กรุณาตรวจสอบ'; end if;

 end if;

 -- Registration is considered received when the school submits it. The existing
 -- auto-receive trigger normalizes new sports_entries to status='approved'.
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_event.competition_id
   and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then
   raise exception 'ต้องเลือกใบสมัครที่โรงเรียนส่งข้อมูลแล้วจากรายการนี้เท่านั้น';
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_is_volleyball(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and volleyball_reviewed)<>public.sports_volleyball_expected(p_event) then raise exception 'วอลเลย์บอลยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงวอลเลย์บอล'; end if;
 end if;
 if public.sports_is_petanque(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye and status='completed' and petanque_reviewed)<>public.sports_petanque_expected(p_event) then raise exception 'เปตองยังแข่งขันไม่ครบ'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเปตอง'; end if;
 end if;
 if public.sports_is_tabletennis(p_event) then
  if (select count(distinct en.school_id) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id)<>4 then raise exception 'อันดับเทเบิลเทนนิสต้องเป็นผู้เข้าแข่งขัน 4 รายที่แตกต่างกันตามสาย'; end if;
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and tt_reviewed)<>public.sports_tt_expected(p_event) then raise exception 'เทเบิลเทนนิสยังแข่งขันไม่ครบ'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเทเบิลเทนนิส'; end if;
 end if;
 if public.sports_is_takraw(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and takraw_reviewed)<>public.sports_takraw_expected(p_event) then raise exception 'เซปักตะกร้อยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if (select count(*) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where exists(select 1 from public.sports_football_matches m where m.event_id=p_event and m.status='completed' and ((x.rank=1 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or (x.rank=2 and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) or (x.rank=3 and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end))))<>4 then raise exception 'อันดับรางวัลไม่ตรงผลรอบรอง/ชิงเซปักตะกร้อ'; end if;
 end if;
 if public.sports_is_basketball(p_event) then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>(case v_event.event_code when 'GS3-BB-15M' then 7 when 'GS3-BB-UM' then 25 else 11 end) then raise exception 'บาสเกตบอลยังแข่งขันไม่ครบหรือโปรแกรมยังไม่ได้ยืนยัน'; end if;
  if not exists(select 1 from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=1 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) or not exists(select 1 from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=2 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='final' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end) then raise exception 'อันดับ 1–2 ไม่ตรงกับผลรอบชิง'; end if;
  if v_event.event_code='GS3-BB-UM' and (select count(*) from public.sports_football_matches m join jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) on x.rank=3 join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id where m.event_id=p_event and m.stage='semifinal' and sc.name=case when m.score1>m.score2 then m.team2_name else m.team1_name end)<>2 then raise exception 'อันดับ 3 ร่วมต้องตรงกับผู้แพ้รอบรอง'; end if;
  if v_event.event_code<>'GS3-BB-UM' and exists(
    with points as (select t.school_name,2*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.status='completed' and t.school_name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) points from public.sports_football_group_teams t where t.event_id=p_event),
    picked as (select x.rank,sc.name from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) join public.sports_entries en on en.id=x.entry_id join public.sports_schools sc on sc.id=en.school_id)
    select 1 from points other where other.school_name not in(select name from picked where rank in (1,2)) and other.points>coalesce((select points.points from points join picked on picked.name=points.school_name and picked.rank=3),-1)
  ) then raise exception 'อันดับ 3 ต้องมาจากทีมที่มีคะแนนสะสมสูงสุดในทีมที่ไม่ได้ชิงอันดับ 1–2'; end if;
 end if;
 select status into v_status from public.sports_certificate_results where event_id=p_event for update;
 if v_status='published' then
   raise exception 'รายการนี้ประกาศผลแล้ว หากต้องแก้ไขให้ใช้กระบวนการยกเลิก/ออกเกียรติบัตรฉบับใหม่';
 end if;
 if v_status is not null and v_status not in ('submitted','rejected','approved') then
   raise exception 'ไม่สามารถประกาศผลจากสถานะปัจจุบันได้';
 end if;

 -- Publish immediately in the same transaction as the placements.
 insert into public.sports_certificate_results(
   event_id,competition_id,status,rejection_reason,submitted_by,submitted_at,
   approved_by,approved_at,published_at,updated_at
 ) values(p_event,v_event.competition_id,'published','',auth.uid(),now(),null,null,now(),now())
 on conflict(event_id) do update set
   status='published',rejection_reason='',submitted_by=auth.uid(),submitted_at=now(),
   approved_by=null,approved_at=null,published_at=now(),updated_at=now();

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_event.competition_id,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 -- Sync the central individual/athletics results shown on the public results page.
 -- Clear only the previous rank, retaining any previously recorded performance data.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,now()
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set
   school_id=excluded.school_id,
   entry_name=excluded.entry_name,
   rank=excluded.rank,
   recorded_at=now();

 -- Replace the medal rows for this event from the committee's submitted placements.
 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_event.competition_id,p_event,en.school_id,
   case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Awards become available to each school's certificate-print page immediately.
 perform public.sports_cert_issue_internal(p_event,'award');
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลอันดับ เหรียญ หรือเกียรติบัตรไม่ครบ ระบบยกเลิกการบันทึกทั้งหมด กรุณาตรวจใบสมัครและติดต่อผู้ดูแล';
 end if;
 return jsonb_build_object('status','published','count',v_expected,'published_at',now());
end; $$;
revoke all on function public.sports_cert_submit(uuid,jsonb) from public,anon;
grant execute on function public.sports_cert_submit(uuid,jsonb) to authenticated;
create or replace function public.sports_award_suggestions(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype; v_source text; v_matches jsonb;
 v_final jsonb; v_semi jsonb; v_names text[]; v_winners text[]; v_name text;
 v_entry uuid; v_count int; v_bronze text; v_ties int; v_rank int; v_slot int; v_i int:=0; v_awards jsonb:='[]'::jsonb;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์อ่านผลรายการนี้' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event;
 if public.sports_is_boxing(p_event) then return public.sports_boxing_awards(p_event);end if;
 if v_event.event_type <> 'team' and not public.sports_is_tabletennis(p_event) then return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if public.sports_is_volleyball(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and volleyball_reviewed)<>public.sports_volleyball_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_petanque(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and not petanque_bye and status='completed' and petanque_reviewed)<>public.sports_petanque_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_tabletennis(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and tt_reviewed)<>public.sports_tt_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_takraw(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and takraw_reviewed)<>public.sports_takraw_expected(p_event) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if public.sports_is_basketball(p_event) and v_event.event_code<>'GS3-BB-UM' then
  if (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>(case when v_event.event_code='GS3-BB-15M' then 7 else 11 end) then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
  select array[case when m.score1>m.score2 then m.team1_name else m.team2_name end,case when m.score1>m.score2 then m.team2_name else m.team1_name end] into v_names from public.sports_football_matches m where m.event_id=p_event and m.stage='final' and m.status='completed';
  if v_names is null then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
  with pts as (select t.school_name,2*(select count(*) from public.sports_football_matches m where m.event_id=p_event and m.stage='group' and m.status='completed' and t.school_name=case when m.score1>m.score2 then m.team1_name else m.team2_name end) points from public.sports_football_group_teams t where t.event_id=p_event and not (t.school_name=any(v_names)))
  select min(school_name),count(*) into v_bronze,v_ties from pts where points=(select max(points) from pts);
  if v_ties<>1 then return jsonb_build_object('status','ambiguous','source','football','placements','[]'::jsonb); end if;
  v_names:=array_append(v_names,v_bronze);
  foreach v_name in array v_names loop
   select count(*),min(en.id::text)::uuid into v_count,v_entry from public.sports_entries en join public.sports_schools sc on sc.id=en.school_id where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved' and sc.name=v_name;
   if v_count<>1 then return jsonb_build_object('status','ambiguous','source','football','placements','[]'::jsonb); end if;
   v_i:=v_i+1;
   v_awards:=v_awards||jsonb_build_array(jsonb_build_object('rank',v_i,'slot',1,'entry_id',v_entry));
  end loop;
  return jsonb_build_object('status','ready','source','football','placements',v_awards);
 end if;
 if public.sports_is_basketball(p_event) and (select count(*) from public.sports_football_matches where event_id=p_event and status='completed' and basketball_reviewed)<>25 then return jsonb_build_object('status','incomplete','source','football','placements','[]'::jsonb); end if;
 if exists(select 1 from public.sports_football_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='football';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.status='completed',
   'winner',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team1_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team2_name end,
   'loser',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team2_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team1_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_football_matches m where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.status<>'cancelled';
 elsif exists(select 1 from public.sports_esports_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='esports';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.match_status='completed',
   'winner',case when m.score1>m.score2 then a.school_name when m.score2>m.score1 then b.school_name end,
   'loser',case when m.score1>m.score2 then b.school_name when m.score2>m.score1 then a.school_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_esports_matches m left join public.sports_esports_group_teams a on a.id=m.team1_id and a.event_id=m.event_id and a.competition_id=m.competition_id
   left join public.sports_esports_group_teams b on b.id=m.team2_id and b.event_id=m.event_id and b.competition_id=m.competition_id
   where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.match_status<>'cancelled';
 else return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='final')<>1
 or (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal')<>2
 or exists(select 1 from jsonb_array_elements(v_matches) x where x->>'done' is distinct from 'true' or nullif(btrim(x->>'winner'),'') is null or nullif(btrim(x->>'loser'),'') is null)
 then return jsonb_build_object('status','incomplete','source',v_source,'placements','[]'::jsonb); end if;
 select x into v_final from jsonb_array_elements(v_matches) x where x->>'stage'='final';
 select jsonb_agg(x) into v_semi from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal';
 v_names:=array[v_final->>'winner',v_final->>'loser',v_semi->0->>'loser',v_semi->1->>'loser'];
 v_winners:=array[v_semi->0->>'winner',v_semi->1->>'winner'];
 if not (v_names[1]=any(v_winners) and v_names[2]=any(v_winners)) or (select count(distinct n) from unnest(v_names) n)<>4 then
 return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
 foreach v_name in array v_names loop
  select count(*),min(en.id::text)::uuid into v_count,v_entry from public.sports_entries en join public.sports_schools s on s.id=en.school_id
   where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved' and regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(regexp_replace(btrim(v_name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g');
  if v_count<>1 then return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
  v_i:=v_i+1; v_rank:=least(v_i,3); v_slot:=case when v_i=4 then 2 else 1 end;
  v_awards:=v_awards||jsonb_build_array(jsonb_build_object('rank',v_rank,'slot',v_slot,'entry_id',v_entry));
 end loop;
 return jsonb_build_object('status','ready','source',v_source,'placements',v_awards);
end $$;
revoke all on function public.sports_award_suggestions(uuid) from public,anon;
grant execute on function public.sports_award_suggestions(uuid) to authenticated;

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
 if public.sports_is_basketball(e.id) then raise exception 'กรุณาใช้หน้าลงทะเบียนบาสเกตบอล 4 รุ่น'; end if;
 if e.stage3_source is not null and e.status <> 'registration' and p_entry is null then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 n:=jsonb_array_length(p_players);
 if coalesce(n,0)<1 or nullif(btrim(p_name),'') is null or exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'full_name'),'') is null)
 then raise exception 'กรุณากรอกชื่อทีมและรายชื่อนักกีฬาให้ครบ'; end if;
 if n>e.max_athletes_per_entry then raise exception 'จำนวนนักกีฬาเกินที่รายการกำหนด'; end if;
 if exists(select 1 from jsonb_array_elements(p_players) x where nullif(btrim(x->>'student_code'),'') is not null group by btrim(x->>'student_code') having count(*)>1)
 then raise exception 'รหัสนักเรียนซ้ำภายในทีม'; end if;
 -- Validate repeatable coaches for every sport when supplied; still accept old
 -- non-RoV callers that only send p_coach until the v14 frontend is deployed.
 if p_coaches is not null then
   if jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<1
     then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีมอย่างน้อย 1 คน'; end if;
   if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
     regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
     then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูทุกคนให้ครบ'; end if;
   p_coach := btrim(p_coaches->0->>'name');
   p_assistant := nullif(btrim(p_coaches->1->>'name'),'');
 end if;
 if e.event_code in ('GS3-ES-SM','GS3-ES-SF') then
   if n not between 5 and 7 then raise exception 'ต้องมีผู้เล่นหลัก 5 คน และตัวสำรองเพิ่มได้ไม่เกิน 2 คน (ไม่บังคับ)'; end if;
   if p_coaches is null then raise exception 'กรุณาเพิ่มครูผู้ควบคุมทีม'; end if;
   if exists(select 1 from jsonb_array_elements(p_players) a where nullif(btrim(a->>'ign'),'') is null or coalesce(a->>'team_role','') not in ('หัวหน้าทีม','ตัวจริง','ตัวสำรอง'))
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='หัวหน้าทีม')<>1
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวจริง')<>4
     or (select count(*) from jsonb_array_elements(p_players) a where a->>'team_role'='ตัวสำรอง')>2
   then raise exception 'กรุณาระบุชื่อในเกมทุกคน พร้อมหัวหน้าทีม 1 คน ตัวจริงอีก 4 คน และตัวสำรองไม่เกิน 2 คน (ไม่บังคับ)'; end if;
   select t.id into team from public.sports_esports_group_teams t join public.sports_schools s
   on regexp_replace(btrim(s.name),'^โรงเรียน','')=regexp_replace(btrim(t.school_name),'^โรงเรียน','')
   where s.id=p_school and t.event_id=e.id and t.competition_id=e.competition_id;
   if team is null then raise exception 'ไม่พบทีมโรงเรียนในสายของประเภทนี้ กรุณาตรวจชื่อโรงเรียนกับผู้จัด'; end if;
   if exists(select 1 from public.sports_entries where event_id=e.id and school_id=p_school and id is distinct from p_entry)
   then raise exception 'โรงเรียนนี้มีใบสมัคร RoV ในประเภทนี้แล้ว'; end if;
 end if;
 if public.sports_is_boxing(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if n<>1 then raise exception 'มวยสากลสมัครเล่น: นักกีฬา 1 คนต่อใบสมัคร';end if;
  if exists(select 1 from public.sports_boxing_draws where event_id=p_event) or public.sports_award_is_published(p_event) then raise exception 'มวยจับสายแล้ว ไม่สามารถแก้ใบสมัคร';end if;
 end if;
 if public.sports_is_volleyball(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262642);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 6 and 12 or p_coaches is null or jsonb_array_length(p_coaches) not between 1 and 3 then raise exception 'วอลเลย์บอล: นักกีฬา 6–12 คน เจ้าหน้าที่ 1–3 คน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on (nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_volleyball(en.event_id)) then raise exception 'นักกีฬาซ้ำในรายการวอลเลย์บอล กรุณาตรวจรายชื่อ'; end if;
 end if;
 if public.sports_is_petanque(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 3 and 4 then raise exception 'เปตอง: นักกีฬา 3 คน สำรองได้ 1 คน'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
 end if;
 if public.sports_is_takraw(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262643);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เริ่มแข่งขันหรือประกาศผลแล้ว'; end if;
  if n not between 3 and 5 or p_coaches is null or jsonb_array_length(p_coaches) <> 3 then raise exception 'เซปักตะกร้อ: นักกีฬา 3–5 คน เจ้าหน้าที่ 3 คน'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'พบชื่อนักกีฬาซ้ำในทีม'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขันรุ่นนี้'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'โรงเรียนนี้ส่งใบสมัครรุ่นนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a join public.sports_athletes sa on (nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') join public.sports_entries en on en.id=sa.entry_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_takraw(en.event_id)) then raise exception 'นักกีฬาซ้ำในรายการเซปักตะกร้อ กรุณาตรวจรายชื่อ'; end if;
 end if;
 if public.sports_is_tabletennis(p_event) then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(e.competition_id::text),262644);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
  if e.status<>'registration' or public.sports_award_is_published(p_event) or exists(select 1 from public.sports_football_matches where event_id=p_event and status='completed') then raise exception 'เทเบิลเทนนิสปิดลงทะเบียนหรือเริ่มแข่งแล้ว'; end if;
  if n<>(case when e.event_code like '%-S' then 1 else 2 end) or p_coaches is null or jsonb_array_length(p_coaches)>3 then raise exception 'ตรวจจำนวนผู้เล่นเดี่ยว/คู่ และเจ้าหน้าที่ไม่เกิน 3 คน'; end if;
  if not exists(select 1 from public.sports_football_group_teams t join public.sports_schools sc on sc.name=t.school_name where t.event_id=p_event and sc.id=p_school) then raise exception 'โรงเรียนไม่ได้อยู่ในสายการแข่งขัน'; end if;
  if exists(select 1 from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.id is distinct from p_entry) then raise exception 'มีใบสมัครรายการนี้แล้ว'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a group by regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อผู้เล่นซ้ำในคู่'; end if;
  if exists(select 1 from jsonb_array_elements(p_players) a where (select count(distinct en.event_id) from public.sports_athletes sa join public.sports_entries en on en.id=sa.entry_id join public.sports_events oe on oe.id=en.event_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and public.sports_is_tabletennis(en.event_id) and oe.level_rule=e.level_rule and ((nullif(btrim(a->>'student_code'),'') is not null and sa.student_code=btrim(a->>'student_code')) or regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(a->>'full_name'),'[[:space:]]+','','g')))>=2) then raise exception 'นักกีฬาลงได้ไม่เกิน 2 รายการในรุ่นเดียวกัน'; end if;
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
 if p_coaches is not null then
   insert into public.sports_roster_staff(entry_id,coaches) values(saved,(
     select jsonb_agg(jsonb_build_object('name',btrim(c->>'name'),'phone',btrim(c->>'phone')) order by pos)
     from jsonb_array_elements(p_coaches) with ordinality x(c,pos)
   )) on conflict(entry_id) do update set coaches=excluded.coaches;
 end if;
 return saved;
end $$;

revoke all on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb) to authenticated;
create or replace function public.sports_admin_correct_published_result(
  p_event uuid, p_awards jsonb, p_reason text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_result public.sports_certificate_results%rowtype;
 v_comp uuid;
 v_expected int;
 v_num int;
 v_old jsonb;
 v_new jsonb;
 v_reason text:=btrim(coalesce(p_reason,''));
 v_change uuid:=gen_random_uuid();
 v_revoked int:=0;
 v_issued int:=0;
 v_athletes int:=0;
 v_coaches int:=0;
 v_timestamp timestamptz:=now();
begin
 if public.sports_is_boxing(p_event) then raise exception 'การแก้ผลมวยหลังประกาศต้องตรวจสอบสายและเกียรติบัตรโดยผู้ดูแลก่อน';end if;
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select * into v_event from public.sports_events where id=p_event;
 if not found or not public.sports_stage3_admin(v_event.competition_id) then
   raise exception 'เฉพาะ Admin หลักเท่านั้นที่แก้ผลหลังประกาศได้' using errcode='42501';
 end if;
 v_comp:=v_event.competition_id;
 if length(v_reason)<8 or length(v_reason)>1000 then
   raise exception 'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 และไม่เกิน 1,000 ตัวอักษร';
 end if;
 v_expected:=case when (v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'ต้องกรอกอันดับให้ครบตามประเภทกีฬา';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
     or x.rank not between 1 and 3 or x.slot not between 1 and 2
     or (x.rank<>3 and x.slot<>1)
     or ((v_event.event_type='athletics' or (public.sports_is_basketball(v_event.id) and v_event.event_code<>'GS3-BB-UM')) and x.slot<>1)) then
   raise exception 'ข้อมูลอันดับไม่ถูกต้อง';
 end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
  or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=2)) then
   raise exception 'อันดับซ้ำหรือผู้แข่งขันได้รับหลายอันดับ';
 end if;
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_comp and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then raise exception 'กรุณาเลือกเฉพาะใบสมัครที่โรงเรียนส่งแล้วในรายการนี้'; end if;

 -- Same lock used by the assigned-official publisher; then the certificate lock.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94724);
 select * into v_result from public.sports_certificate_results where event_id=p_event for update;
 if not found or v_result.status<>'published' then
   raise exception 'รายการนี้ยังไม่ประกาศผล หรือสถานะถูกเปลี่ยนไปแล้ว';
 end if;
 if p_expected_updated_at is null or v_result.updated_at is distinct from p_expected_updated_at then
   raise exception 'มีการเปลี่ยนแปลงผลระหว่างที่เปิดหน้า กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
   order by p.rank,p.slot),'[]'::jsonb) into v_old
 from public.sports_certificate_placements p where p.event_id=p_event;
 select coalesce(jsonb_agg(jsonb_build_object('rank',x.rank,'slot',x.slot,'entry_id',x.entry_id)
   order by x.rank,x.slot),'[]'::jsonb) into v_new
 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid);
 if v_old=v_new then raise exception 'อันดับยังเหมือนเดิม ไม่จำเป็นต้องออกเกียรติบัตรใหม่'; end if;

 -- Invalidate ALL unrevoked award documents for this event, including temporarily
 -- inactive ones. Keep old snapshots, QR tokens, reasons and serial numbers forever.
 update public.sports_certificates_issued
   set is_active=false,revoked_at=v_timestamp,revoked_by=auth.uid(),
       revocation_reason='แก้ผลหลังประกาศโดย Admin: '||v_reason
 where event_id=p_event and certificate_kind='award' and revoked_at is null;
 get diagnostics v_revoked=row_count;

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_comp,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 update public.sports_certificate_results
 set status='published',published_at=v_timestamp,updated_at=v_timestamp
 where event_id=p_event;

 -- Preserve match scores and athletics performance values; modify only ranks.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,v_timestamp
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set school_id=excluded.school_id,
    entry_name=excluded.entry_name,rank=excluded.rank,recorded_at=excluded.recorded_at;

 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_comp,p_event,en.school_id,
  case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Generate entirely new immutable award documents. The ordinary issue_internal
 -- cannot be reused: the UNIQUE key of a canceled original remains reserved.
 with eligible as (
   select en.id entry_id,en.school_id,s.name school_name,a.full_name recipient_name,
     'athlete:'||coalesce(a.roster_position::text,
       row_number() over(partition by en.id order by a.roster_position nulls last,a.full_name)::text) base_key,
     p.rank award_rank
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   join public.sports_athletes a on a.entry_id=en.id
   where p.event_id=p_event
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,a.entry_id,a.school_id,'athlete',
   left('correction:'||v_change::text||':'||a.base_key,200),
   a.recipient_name,a.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   a.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from eligible a join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp;
 get diagnostics v_athletes=row_count;

 with ranked as (
   select en.id entry_id,en.school_id,s.name school_name,p.rank award_rank,
     coalesce(nullif(st.coaches,'[]'::jsonb),
       case when nullif(btrim(coalesce(en.coach_name,'')),'') is not null
         then jsonb_build_array(jsonb_build_object('name',en.coach_name)) else '[]'::jsonb end) staff
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   left join public.sports_roster_staff st on st.entry_id=en.id
   where p.event_id=p_event
 ), expanded as (
   select en.*,staff.pos,btrim(coalesce(staff.person->>'name','')) coach_name
   from ranked en cross join lateral jsonb_array_elements(en.staff) with ordinality staff(person,pos)
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,en.entry_id,en.school_id,'coach',
   left('correction:'||v_change::text||':coach:'||en.pos::text,200),
   en.coach_name,en.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   en.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from expanded en join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp
 where en.coach_name<>'';
 get diagnostics v_coaches=row_count;
 v_issued:=v_athletes+v_coaches;
 if v_issued=0 then
   raise exception 'ไม่พบรายชื่อนักกีฬา/ครูผู้ควบคุมสำหรับออกเกียรติบัตรใหม่ ระบบจึงไม่แก้ไขผลและไม่ยกเลิกเอกสารเดิม';
 end if;

 -- Connect 1:1 matching recipients to the new document without mis-linking
 -- different people with the same name. Old QR stays revoked in all cases.
 with candidate as (
   select old.id old_id,new.id new_id,
     count(*) over(partition by old.id) matches_old,
     count(*) over(partition by new.id) matches_new
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new
     on new.event_id=old.event_id and new.entry_id=old.entry_id
      and new.recipient_type=old.recipient_type and new.recipient_name=old.recipient_name
   where old.event_id=p_event and old.certificate_kind='award'
     and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 ), pairs as (
   select old_id,new_id from candidate where matches_old=1 and matches_new=1
 )
 update public.sports_certificates_issued old
    set replaced_by=pairs.new_id,replacement_reason=v_reason
 from pairs where old.id=pairs.old_id;

 -- Historical predecessor QRs should point to the newest replacement as well.
 with recursive linked(ancestor_id,replacement_id) as (
   select i.id,i.replaced_by from public.sports_certificates_issued i
   where i.event_id=p_event and i.revoked_at=v_timestamp and i.replaced_by is not null
   union all
   select prior.id,linked.replacement_id
   from public.sports_certificates_issued prior
   join linked on prior.replaced_by=linked.ancestor_id
   where prior.id<>linked.replacement_id
 )
 update public.sports_certificates_issued old set replaced_by=linked.replacement_id
 from linked where old.id=linked.ancestor_id and old.replaced_by is distinct from linked.replacement_id;

 -- Set replaces_id only when an unambiguous immediate predecessor exists.
 with pairs as (
   select old.id old_id,new.id new_id,
      count(*) over(partition by new.id) n_new,
      count(*) over(partition by old.id) n_old
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new on new.id=old.replaced_by
   where old.event_id=p_event and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 )
 update public.sports_certificates_issued new set replaces_id=pairs.old_id
 from pairs where new.id=pairs.new_id and pairs.n_new=1 and pairs.n_old=1
   and new.replaces_id is null;

 insert into public.sports_result_admin_corrections(
  id,event_id,competition_id,corrected_by,correction_reason,
  previous_placements,corrected_placements,previous_published_at,corrected_at,
  revoked_award_certificates,newly_issued_award_certificates
 ) values (
  v_change,p_event,v_comp,auth.uid(),v_reason,
  v_old,v_new,v_result.published_at,v_timestamp,v_revoked,v_issued
 );
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลที่แก้ไขยังเชื่อมโยงไม่ครบ ระบบคืนข้อมูลเดิมทั้งหมด กรุณาตรวจใบสมัครและเหรียญรางวัล';
 end if;
 return jsonb_build_object('status','published','correction_id',v_change,
   'revoked_award_certificates',v_revoked,
   'new_award_certificates',v_issued,
   'updated_at',v_timestamp);
end; $$;
revoke all on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) from public,anon;
grant execute on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) to authenticated;
create or replace function public.sports_boxing_discard_draft(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare comp uuid;
begin
 select competition_id into strict comp from public.sports_events where id=p_event;
 if auth.uid() is null or not public.sports_is_boxing(p_event) or not public.sports_stage3_admin(comp) then raise exception 'เฉพาะผู้ดูแล' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 if public.sports_award_is_published(p_event) or exists(select 1 from public.sports_boxing_bouts where event_id=p_event and status in ('published','completed')) then raise exception 'ห้ามล้างสายที่เผยแพร่แล้ว';end if;
 delete from public.sports_boxing_draws where event_id=p_event and not published;
 if not found then raise exception 'ไม่พบสายฉบับร่าง';end if;
 insert into public.sports_boxing_audit(event_id,action,actor) values(p_event,'discard_draft',auth.uid());
end $$;
revoke all on function public.sports_boxing_discard_draft(uuid) from public,anon;grant execute on function public.sports_boxing_discard_draft(uuid) to authenticated;
commit;
notify pgrst, 'reload schema';
