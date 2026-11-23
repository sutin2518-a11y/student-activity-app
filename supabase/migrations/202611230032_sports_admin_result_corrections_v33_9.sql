-- PHULANGKA GAMES 2569 · v33.9
-- EXCEPTION-ONLY Admin correction after an official has ALREADY published results.
-- Normal flow remains: assigned official publishes immediately, NO Admin approval.
-- Prerequisites: migration 202611230027, 029, 030 and 031.
-- Back up Database + Storage before installation. INSTALLATION DOES NOT ALTER RESULTS.
begin;

create table if not exists public.sports_result_admin_corrections (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  event_id uuid not null references public.sports_events(id) on delete restrict,
  corrected_by uuid references auth.users(id) on delete set null,
  correction_reason text not null check(length(btrim(correction_reason)) between 8 and 1000),
  previous_placements jsonb not null,
  corrected_placements jsonb not null,
  previous_published_at timestamptz,
  corrected_at timestamptz not null default now(),
  revoked_award_certificates integer not null default 0,
  newly_issued_award_certificates integer not null default 0
);
create index if not exists sports_result_admin_corrections_event_idx
 on public.sports_result_admin_corrections(event_id, corrected_at desc);
alter table public.sports_result_admin_corrections enable row level security;
revoke all on public.sports_result_admin_corrections from public,anon,authenticated;

-- Admin-only view for corrections. An ordinary official cannot read/write it.
create or replace function public.sports_admin_correction_context(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_comp uuid;
 v_result public.sports_certificate_results%rowtype;
 v_entries jsonb;
 v_before jsonb;
 v_history jsonb;
 v_live int;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select e.competition_id into v_comp from public.sports_events e where e.id=p_event;
 if v_comp is null or not public.sports_stage3_admin(v_comp) then
   raise exception 'เฉพาะ Admin หลักเท่านั้นที่แก้ไขผลประกาศแล้วได้' using errcode='42501';
 end if;
 select * into v_result from public.sports_certificate_results where event_id=p_event;
 if not found or v_result.status<>'published' then
   raise exception 'รายการนี้ยังไม่มีผลที่ประกาศแล้ว กรุณาให้กรรมการส่งผลก่อน';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',en.id,'entry_name',en.entry_name,'school_name',s.name,
   'athlete_count',(select count(*) from public.sports_athletes a where a.entry_id=en.id)
 ) order by s.name,en.entry_name),'[]'::jsonb) into v_entries
 from public.sports_entries en join public.sports_schools s on s.id=en.school_id
 where en.event_id=p_event and en.competition_id=v_comp and en.status='approved';
 select coalesce(jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
   order by p.rank,p.slot),'[]'::jsonb) into v_before
 from public.sports_certificate_placements p where p.event_id=p_event;
 select count(*) into v_live from public.sports_certificates_issued i
 where i.event_id=p_event and i.certificate_kind='award' and i.revoked_at is null;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',x.id,'reason',x.correction_reason,'corrected_at',x.corrected_at,
   'corrected_by_email',(select u.email from auth.users u where u.id=x.corrected_by),
   'revoked',x.revoked_award_certificates,'issued',x.newly_issued_award_certificates,
   'previous',x.previous_placements,'corrected',x.corrected_placements
 ) order by x.corrected_at desc),'[]'::jsonb) into v_history from (
   select * from public.sports_result_admin_corrections
   where event_id=p_event order by corrected_at desc limit 20
 ) x;
 return jsonb_build_object('event_id',p_event,'updated_at',v_result.updated_at,
   'published_at',v_result.published_at,'entries',v_entries,
   'placements',v_before,'live_award_certificates',v_live,'history',v_history);
end; $$;
revoke all on function public.sports_admin_correction_context(uuid) from public,anon;
grant execute on function public.sports_admin_correction_context(uuid) to authenticated;

-- Correct FINAL 1/2/3 placements only. Fixture-level football/RoV scores are managed
-- by their own sport systems. This function does not rewrite match scores.
-- The result, medals, old-document revocation, new documents and audit row are ONE transaction.
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
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select * into v_event from public.sports_events where id=p_event;
 if not found or not public.sports_stage3_admin(v_event.competition_id) then
   raise exception 'เฉพาะ Admin หลักเท่านั้นที่แก้ผลหลังประกาศได้' using errcode='42501';
 end if;
 v_comp:=v_event.competition_id;
 if length(v_reason)<8 or length(v_reason)>1000 then
   raise exception 'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 และไม่เกิน 1,000 ตัวอักษร';
 end if;
 v_expected:=case when v_event.event_type='athletics' then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'ต้องกรอกอันดับให้ครบตามประเภทกีฬา';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
     or x.rank not between 1 and 3 or x.slot not between 1 and 2
     or (x.rank<>3 and x.slot<>1)
     or (v_event.event_type='athletics' and x.slot<>1)) then
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
 return jsonb_build_object('status','published','correction_id',v_change,
   'revoked_award_certificates',v_revoked,
   'new_award_certificates',v_issued,
   'updated_at',v_timestamp);
end; $$;
revoke all on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) from public,anon;
grant execute on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) to authenticated;

commit;
notify pgrst, 'reload schema';
