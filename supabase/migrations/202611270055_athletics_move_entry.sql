-- Additive migration: no existing registration or event data is changed on install.
begin;
create or replace function public.sports_admin_move_athletics_entry(
  p_entry uuid, p_from_event uuid, p_to_event uuid, p_expected_updated_at timestamptz,
  p_reason text, p_eligibility_confirmed boolean
) returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '3s' as $$
declare
  en public.sports_entries%rowtype;
  src public.sports_events%rowtype;
  dst public.sports_events%rowtype;
  comp uuid;
  player_count int;
  required_count int;
  src_relay boolean;
  dst_relay boolean;
  changed timestamptz;
  reason text := btrim(coalesce(p_reason,''));
begin
  select competition_id into comp from public.sports_entries where id=p_entry;
  if comp is null or auth.uid() is null or not public.sports_stage3_admin(comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันที่มีสิทธิ์เท่านั้น' using errcode='42501';
  end if;
  if p_from_event is null or p_to_event is null or p_from_event=p_to_event or p_expected_updated_at is null then
    raise exception 'กรุณาเลือกรายการใหม่และตรวจสอบข้อมูลล่าสุด';
  end if;
  if p_eligibility_confirmed is distinct from true or length(reason) not between 8 and 1000 then
    raise exception 'กรุณายืนยันคุณสมบัตินักกีฬาและระบุเหตุผลอย่างน้อย 8 ตัวอักษร';
  end if;
  -- Lock only the two athletics event rows, in deterministic order. Registration
  -- and preparing call-room rosters take event locks before athletics advisory locks.
  perform 1 from public.sports_events where competition_id=comp
    and id in (p_from_event,p_to_event) order by id for update;
  select * into src from public.sports_events where id=p_from_event and competition_id=comp;
  select * into dst from public.sports_events where id=p_to_event and competition_id=comp;
  if src.id is null or dst.id is null or coalesce(src.event_code,'') not like 'GS3-AT-%'
    or coalesce(dst.event_code,'') not like 'GS3-AT-%'
    or src.event_type is distinct from 'athletics' or dst.event_type is distinct from 'athletics'
    or not public.sports_ath_managed(src.id) or not public.sports_ath_managed(dst.id) then
    raise exception 'ย้ายได้เฉพาะรายการกรีฑาของการแข่งขันเดียวกัน';
  end if;
  if src.status is distinct from 'registration' or dst.status is distinct from 'registration' then
    raise exception 'ทั้งรายการเดิมและรายการใหม่ต้องยังเปิดรับสมัคร';
  end if;
  if src.gender_rule is distinct from dst.gender_rule then
    raise exception 'รายการใหม่ต้องเป็นประเภทเพศเดียวกับรายการเดิม';
  end if;
  -- Lock against the same roster and results workflows used by migration 047.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(least(src.id,dst.id)::text),94723);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(greatest(src.id,dst.id)::text),94723);
  select * into en from public.sports_entries where id=p_entry for update;
  if not found or en.competition_id is distinct from comp or en.event_id is distinct from src.id
    or en.updated_at is distinct from p_expected_updated_at
    or en.status not in ('approved','submitted') then
    raise exception 'ใบสมัครเปลี่ยนแปลงหรือไม่อยู่ในสถานะที่ย้ายได้ กรุณารีเฟรช';
  end if;
  if exists(select 1 from public.sports_ath_rounds r where r.event_id in (src.id,dst.id)
       and (r.roster_ready or r.state<>'waiting'))
    or exists(select 1 from public.sports_ath_people p join public.sports_ath_rounds r on r.session_id=p.session_id
       where p.entry_id=en.id or r.event_id in (src.id,dst.id))
    or public.sports_award_is_published(src.id) or public.sports_award_is_published(dst.id)
    or exists(select 1 from public.sports_event_results where entry_id=en.id or event_id in (src.id,dst.id))
    or exists(select 1 from public.sports_certificate_placements where entry_id=en.id or event_id in (src.id,dst.id))
    or exists(select 1 from public.sports_certificates_issued where entry_id=en.id or event_id in (src.id,dst.id)) then
    raise exception 'รายการถูกจัดรายชื่อ รายงานตัว บันทึกผล หรือออกเกียรติบัตรแล้ว ไม่อนุญาตให้ย้าย';
  end if;
  select exists(select 1 from public.sports_ath_rounds where event_id=src.id and kind='relay') into src_relay;
  select exists(select 1 from public.sports_ath_rounds where event_id=dst.id and kind='relay') into dst_relay;
  required_count := case when dst_relay then 4 else 1 end;
  select count(*) into player_count from public.sports_athletes where entry_id=en.id;
  if src_relay is distinct from dst_relay or player_count<>required_count
    or coalesce(dst.max_athletes_per_entry,0)<player_count then
    raise exception 'จำนวนผู้เล่นไม่ตรงกับรายการใหม่ (เดี่ยว 1 คน ผลัด 4 คน)';
  end if;
  if exists(select 1 from public.sports_entries other
      join public.sports_athletes b on b.entry_id=other.id
      join public.sports_athletes a on a.entry_id=en.id
      where other.event_id=dst.id and other.competition_id=comp and other.school_id=en.school_id
        and other.id<>en.id and other.status<>'withdrawn'
        and ((nullif(btrim(a.student_code),'') is not null and btrim(a.student_code)=btrim(b.student_code))
         or regexp_replace(btrim(a.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(b.full_name),'[[:space:]]+','','g'))) then
    raise exception 'พบรายชื่อนักกีฬาซ้ำในรายการปลายทาง กรุณาตรวจสอบใบสมัครเดิม';
  end if;
  -- Preserve the entry ID and all linked athletes, coaches, and photo paths.
  update public.sports_entries set event_id=dst.id,updated_at=clock_timestamp()
    where id=en.id returning updated_at into changed;
  insert into public.sports_audit_logs(actor_user_id,action,entity_table,details)
    values(auth.uid(),'ADMIN_MOVE_ATHLETICS_ENTRY','sports_entries',jsonb_build_object(
      'competition_id',comp,'entry_id',en.id,'school_id',en.school_id,'from_event_id',src.id,
      'to_event_id',dst.id,'from_event_name',src.sport_name,'to_event_name',dst.sport_name,
      'reason',reason,'athlete_count',player_count,'eligibility_confirmed',true));
  return jsonb_build_object('entry_id',en.id,'event_id',dst.id,'sport_name',dst.sport_name,'updated_at',changed);
end $$;
revoke all on function public.sports_admin_move_athletics_entry(uuid,uuid,uuid,timestamptz,text,boolean) from public,anon,authenticated;
grant execute on function public.sports_admin_move_athletics_entry(uuid,uuid,uuid,timestamptz,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
select to_regprocedure('public.sports_admin_move_athletics_entry(uuid,uuid,uuid,timestamptz,text,boolean)') is not null as athletics_move_ready;
