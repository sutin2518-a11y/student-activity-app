-- Stage 14: allow competition administrators to open multiple sports for registration atomically.
-- This changes sports_events only. It does not publish match schedules or modify school accounts.
begin;

create or replace function public.sports_stage3_open_registration(p_comp uuid,p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested integer;
  v_found integer;
  v_changed integer;
begin
  if not public.sports_stage3_admin(p_comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันที่ได้รับสิทธิ์เท่านั้น' using errcode='42501';
  end if;
  if p_ids is null or cardinality(p_ids) not between 1 and 500 or array_position(p_ids,null) is not null then
    raise exception 'กรุณาเลือก 1–500 รายการที่ถูกต้อง';
  end if;
  select count(distinct x) into v_requested from unnest(p_ids) x;
  if v_requested <> cardinality(p_ids) then
    raise exception 'พบรหัสรายการซ้ำในคำขอ';
  end if;

  -- Lock rows before validating status, so concurrent changes cannot bypass the check.
  perform 1 from public.sports_events e
    where e.competition_id = p_comp and e.id = any(p_ids) for update;
  select count(*) into v_found from public.sports_events e
    where e.competition_id = p_comp and e.id = any(p_ids)
      and e.status in ('draft','scheduled','closed')
      and nullif(btrim(e.sport_name),'') is not null
      and nullif(btrim(e.event_code),'') is not null;
  if v_found <> v_requested then
    raise exception 'บางรายการไม่อยู่ในการแข่งขันนี้ ไม่พร้อมเปิดรับสมัคร หรือไม่มีรหัส/ชื่อรายการครบ';
  end if;

  update public.sports_events e
    set status='registration',updated_at=now()
    where e.competition_id=p_comp and e.id=any(p_ids)
      and e.status in ('draft','scheduled','closed');
  get diagnostics v_changed = row_count;
  if v_changed <> v_requested then
    raise exception 'ไม่สามารถอัปเดตครบทุกรายการได้ โปรดตรวจสอบใหม่';
  end if;

  insert into public.sports_audit_logs(actor_user_id,action,entity_table,details)
  values(auth.uid(),'OPEN_REGISTRATION_BULK','sports_events',
    jsonb_build_object('competition_id',p_comp,'count',v_changed,'event_ids',p_ids));
  return v_changed;
end;
$$;
revoke all on function public.sports_stage3_open_registration(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.sports_stage3_open_registration(uuid,uuid[]) to authenticated;
commit;
