-- v33.6: Allow an administrator to reset test registrations AFTER all affected
-- certificates are explicitly revoked, retaining the original audit records.
-- INSTALL ONLY: running this migration does not delete any registrations or documents.
-- Depends on 202611230028 and 202611230029. Back up DB + Storage before use.
begin;

-- Issued documents are immutable historical evidence. The old RESTRICT FK
-- made deleting test registrations impossible even after formal revocation.
-- On entry deletion only the old relation becomes NULL; printed identity,
-- QR token, revocation reason, signer, school and event all remain untouched.
alter table public.sports_certificates_issued
  drop constraint if exists sports_certificates_issued_entry_id_fkey;
alter table public.sports_certificates_issued alter column entry_id drop not null;
alter table public.sports_certificates_issued
  add constraint sports_certificates_issued_entry_id_fkey foreign key (entry_id)
    references public.sports_entries(id) on delete set null;

-- Defense in depth: no caller may delete an entry tied to ANY unrevoked
-- certificate, including temporarily inactive certificates.
create or replace function public.sports_cert_block_entry_with_live_documents()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.sports_certificates_issued c
   where c.entry_id=old.id and c.revoked_at is null) then
  raise exception 'ไม่สามารถลบใบสมัครที่มีเกียรติบัตรยังไม่ยกเลิก กรุณายกเลิกก่อน';
 end if;
 return old;
end; $$;
revoke all on function public.sports_cert_block_entry_with_live_documents() from public,anon,authenticated;
drop trigger if exists sports_cert_prevent_entry_delete_unrevoked on public.sports_entries;
create trigger sports_cert_prevent_entry_delete_unrevoked
 before delete on public.sports_entries for each row
 execute function public.sports_cert_block_entry_with_live_documents();

create or replace function public.sports_admin_reset(
 p_action text,p_scope text,p_target uuid default null,p_confirmation text default null,
 p_expected_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_comp uuid;
 v_events uuid[];
 v_entries uuid[];
 v_archive uuid;
 v_snapshot jsonb;
 v_fingerprint text;
 v_counts jsonb;
 v_active int;
 v_revoked int;
 v_results_blocked boolean;
 v_result_count int;
 v_res jsonb;
 v_photo_count int;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบผู้ดูแลก่อน' using errcode='42501'; end if;
 select id into v_comp from public.sports_competitions
 where slug='phayao-secondary-group-sports-2569';
 if v_comp is null or not public.sports_stage3_admin(v_comp) then
  raise exception 'เฉพาะผู้ดูแลการแข่งขันหลักเท่านั้นที่รีเซตข้อมูลได้' using errcode='42501'; end if;
 if p_action not in ('preview','reset') or p_scope not in ('entry','event','competition') then
  raise exception 'รูปแบบการดำเนินการไม่ถูกต้อง'; end if;
 if (p_scope='competition' and p_target is not null) or (p_scope<>'competition' and p_target is null) then
  raise exception 'กรุณาเลือกรายการที่ต้องการลบ'; end if;
 if p_action='reset' then
  -- All trial-data resets are disabled from the first competition day.
  if (clock_timestamp() at time zone 'Asia/Bangkok')::date >= date '2026-11-30' then
   raise exception 'ปิดระบบรีเซตตั้งแต่วันที่ 30 พฤศจิกายน 2569 เพื่อปกป้องข้อมูลการแข่งขันจริง'; end if;
  if p_confirmation is distinct from 'ลบข้อมูลทดสอบ 2569' then
   raise exception 'กรุณาพิมพ์ข้อความยืนยันให้ถูกต้องทุกตัวอักษร'; end if;
  -- Registration RPCs take event-row FOR SHARE locks; this blocks concurrent registration.
  perform 1 from public.sports_competitions where id=v_comp for update;
 end if;

 if p_scope='competition' then
  select array_agg(id order by id) into v_events from public.sports_events where competition_id=v_comp;
 elsif p_scope='event' then
  select array_agg(id) into v_events from public.sports_events
   where competition_id=v_comp and id=p_target;
 else
  select array_agg(event_id) into v_events from public.sports_entries
   where competition_id=v_comp and id=p_target;
 end if;
 if coalesce(array_length(v_events,1),0)=0 then raise exception 'ไม่พบข้อมูลที่เลือกในรายการแข่งขันนี้'; end if;
 if p_action='reset' then
  perform 1 from public.sports_events where id=any(v_events) order by id for update;
 end if;
 select array_agg(id order by id) into v_entries from public.sports_entries
 where competition_id=v_comp and (p_scope<>'entry' or id=p_target)
   and event_id=any(v_events);
 v_entries:=coalesce(v_entries,'{}'::uuid[]);

 -- Snapshot all affected test data in private archive BEFORE any writes.
 -- Names and student codes remain private; no snapshot exposed in RPC response.
 select jsonb_build_object(
  'entries',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_entries x where x.id=any(v_entries)),
  'athletes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_id,to_jsonb(x)::text),'[]'::jsonb)
    from public.sports_athletes x where x.entry_id=any(v_entries)),
  'staff',(select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_id,to_jsonb(x)::text),'[]'::jsonb)
    from public.sports_roster_staff x where x.entry_id=any(v_entries)),
  'football_players',(select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_id,x.roster_position),'[]'::jsonb)
    from public.sports_football_player_details x where x.entry_id=any(v_entries)),
  'generic_matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_matches x where x.event_id=any(v_events)),
  'match_results',(select coalesce(jsonb_agg(to_jsonb(r) order by r.match_id),'[]'::jsonb)
    from public.sports_match_results r join public.sports_matches m on m.id=r.match_id
    where m.event_id=any(v_events)),
  'event_results',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_event_results x where x.event_id=any(v_events)),
  'medals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_medals x where x.event_id=any(v_events)),
  'football_matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_football_matches x where x.event_id=any(v_events)),
  'football_history',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_football_match_history x where x.event_id=any(v_events)),
  'esports_matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_esports_matches x where x.event_id=any(v_events)),
  'esports_history',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_esports_match_history x where x.event_id=any(v_events)),
  'certificate_results',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_id),'[]'::jsonb)
    from public.sports_certificate_results x where x.event_id=any(v_events)),
  'certificate_placements',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_id,x.rank,x.slot),'[]'::jsonb)
    from public.sports_certificate_placements x where x.event_id=any(v_events)),
  'certificate_event_settings',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_id),'[]'::jsonb)
    from public.sports_certificate_event_settings x where x.event_id=any(v_events)),
  'certificates_issued',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.sports_certificates_issued x where x.event_id=any(v_events)
      and (p_scope<>'entry' or x.entry_id=any(v_entries))),
  'photo_paths',(select coalesce(jsonb_agg(o.name order by o.name),'[]'::jsonb)
    from storage.objects o where o.bucket_id='sports-athlete-photos'
     and exists(select 1 from unnest(v_entries) as en(id) where split_part(o.name,'/',1)=en.id::text))
 ) into v_snapshot;

 v_counts:=jsonb_build_object(
  'entries',jsonb_array_length(v_snapshot->'entries'),
  'athletes',jsonb_array_length(v_snapshot->'athletes'),
  'photos',jsonb_array_length(v_snapshot->'photo_paths'),
  'matches',jsonb_array_length(v_snapshot->'generic_matches'),
  'match_results',jsonb_array_length(v_snapshot->'match_results'),
  'event_results',jsonb_array_length(v_snapshot->'event_results'),
  'medals',jsonb_array_length(v_snapshot->'medals'),
  'football_matches',jsonb_array_length(v_snapshot->'football_matches'),
  'esports_matches',jsonb_array_length(v_snapshot->'esports_matches'),
  'issued_certificates',jsonb_array_length(v_snapshot->'certificates_issued')
 );
 v_fingerprint:=md5(v_snapshot::text);
 -- Cancelled documents stay as immutable historical records. Scope the check to
 -- the selected entry (not all other schools/teams in the same event).
 select count(*) filter(where cert.doc->>'revoked_at' is null),
        count(*) filter(where cert.doc->>'revoked_at' is not null)
 into v_active,v_revoked
 from jsonb_array_elements(v_snapshot->'certificates_issued') as cert(doc);
 v_counts:=v_counts || jsonb_build_object(
   'active_certificates',v_active,'revoked_certificates',v_revoked);

 v_result_count:=(v_counts->>'match_results')::int+(v_counts->>'event_results')::int+
  (v_counts->>'medals')::int;

 -- A single-entry reset still must not destroy recorded competition results.
 -- Other entries' certificate documents do NOT block deletion of this entry.
 v_results_blocked:=p_scope='entry' and (
    v_result_count>0 or
    exists(select 1 from public.sports_certificate_placements
      where event_id=any(v_events) and entry_id=any(v_entries)) or
    exists(select 1 from public.sports_football_matches
      where event_id=any(v_events) and status='completed') or
    exists(select 1 from public.sports_esports_matches
      where event_id=any(v_events) and match_status='completed')
 );
 if p_action='preview' then
  return jsonb_build_object('scope',p_scope,'target',p_target,'counts',v_counts,
   'fingerprint',v_fingerprint,
   'can_reset',v_active=0 and not v_results_blocked and
      (clock_timestamp() at time zone 'Asia/Bangkok')::date < date '2026-11-30',
   'note',case
     when (clock_timestamp() at time zone 'Asia/Bangkok')::date >= date '2026-11-30'
       then 'ปิดการรีเซตตั้งแต่วันที่ 30 พฤศจิกายน 2569'
     when v_active>0 then 'ยังมีเกียรติบัตรที่ไม่ได้ยกเลิก '||v_active||' ฉบับ กรุณายกเลิกเกียรติบัตรที่เกี่ยวข้องก่อน'
     when v_results_blocked then 'ยังมีผลการแข่งขันหรือรายการจัดอันดับที่เกี่ยวข้อง จึงไม่อนุญาตให้ลบใบสมัครรายเดียว กรุณาตรวจสอบหรือใช้รีเซตตามประเภทรายการ'
     when v_revoked>0 then 'เกียรติบัตรที่ยกเลิกแล้ว '||v_revoked||' ฉบับ จะเก็บประวัติและ QR เดิมต่อไป แม้ลบใบสมัครทดสอบ'
     else '' end);
 end if;
 if v_active>0 then
   raise exception 'ยังมีเกียรติบัตรที่ไม่ได้ยกเลิก % ฉบับ (รวมฉบับพักใช้ชั่วคราว) กรุณายกเลิกก่อนรีเซต',v_active;
 end if;
 if v_results_blocked then
   raise exception 'รายการยังมีผลแข่งขันหรืออันดับรางวัลที่เกี่ยวข้อง กรุณาตรวจสอบหรือรีเซตระดับรายการ';
 end if;
 if p_expected_fingerprint is distinct from v_fingerprint then
  raise exception 'ข้อมูลเปลี่ยนหลังตรวจสอบ กรุณากดดูข้อมูลที่จะลบใหม่'; end if;

 insert into public.sports_admin_reset_archives(competition_id,reset_scope,target_id,reset_by,snapshot,counts)
 values(v_comp,p_scope,p_target,auth.uid(),v_snapshot,v_counts) returning id into v_archive;
 insert into public.sports_admin_reset_photo_queue(archive_id,competition_id,object_path)
 select v_archive,v_comp,path.value #>> '{}' from jsonb_array_elements(v_snapshot->'photo_paths') path(value);

 if p_scope='entry' then
  -- Single registration: related certificates must all be explicitly revoked.
  -- Their immutable records and QR tokens survive as entry_id becomes NULL.
  delete from public.sports_football_player_details where entry_id=any(v_entries);
  delete from public.sports_roster_staff where entry_id=any(v_entries);
  delete from public.sports_athletes where entry_id=any(v_entries);
  delete from public.sports_entries where id=any(v_entries);
 else
  -- Clear trial awards and published-result state before deleting registrations.
  delete from public.sports_certificate_placements where event_id=any(v_events);
  delete from public.sports_certificate_results where event_id=any(v_events);
  update public.sports_certificate_event_settings set participation_released=false,released_at=null,released_by=null
   where event_id=any(v_events);
  delete from public.sports_medals where event_id=any(v_events);
  delete from public.sports_event_results where event_id=any(v_events);
  delete from public.sports_match_results where match_id in
    (select id from public.sports_matches where event_id=any(v_events));
  update public.sports_matches set status=case when status='completed' then 'scheduled' else status end
   where event_id=any(v_events);
  update public.sports_football_matches set
    status=case when status='completed' and scheduled_date is not null and start_time is not null
       then 'published' when status='completed' then 'draft' else status end,
    score1=null,score2=null,penalty1=null,penalty2=null,notes=''
   where event_id=any(v_events);
  delete from public.sports_football_match_history where event_id=any(v_events);
  perform pg_catalog.set_config('app.esports_reason','รีเซตข้อมูลทดลองแบบสำรองข้อมูล',true);
  update public.sports_esports_matches set
    match_status=case when stage='group' and scheduled_date is not null and start_time is not null
      then 'scheduled' else 'draft' end,
    score1=null,score2=null,duration_minutes=null,team1_kills=null,team2_kills=null,notes='',
    team1_id=case when stage='group' then team1_id else null end,
    team2_id=case when stage='group' then team2_id else null end,
    scheduled_date=case when stage='group' then scheduled_date else null end,
    start_time=case when stage='group' then start_time else null end,
    play_order=case when stage='group' then play_order else null end
   where event_id=any(v_events);
  delete from public.sports_esports_match_history where event_id=any(v_events);
  delete from public.sports_football_player_details where entry_id=any(v_entries);
  delete from public.sports_roster_staff where entry_id=any(v_entries);
  delete from public.sports_athletes where entry_id=any(v_entries);
  delete from public.sports_entries where id=any(v_entries);
 end if;

 return jsonb_build_object('success',true,'archive_id',v_archive,'counts',v_counts,
  'pending_photos',jsonb_array_length(v_snapshot->'photo_paths'));
end $$;
revoke all on function public.sports_admin_reset(text,text,uuid,text,text) from public,anon;
grant execute on function public.sports_admin_reset(text,text,uuid,text,text) to authenticated;

-- A cancelled historical certificate cannot be reissued after its
-- original registration is deleted. Issue a fresh certificate from a
-- new, valid registration instead.
create or replace function public.sports_cert_reissue(p_certificate_id bigint,p_reason text)
returns bigint language plpgsql security definer set search_path='' as $$
declare
  v_event uuid; v_comp uuid; v_old public.sports_certificates_issued%rowtype;
  v_new_id bigint; v_new_key text;
begin
  select event_id,competition_id into v_event,v_comp
  from public.sports_certificates_issued where id=p_certificate_id;
  if v_event is null then raise exception 'ไม่พบเกียรติบัตรต้นฉบับ'; end if;
  if not public.sports_stage3_admin(v_comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันเท่านั้นที่ออกฉบับใหม่แทนได้' using errcode='42501';
  end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null or length(btrim(p_reason))>1000 then
    raise exception 'กรุณาระบุเหตุผลการออกฉบับใหม่ไม่เกิน 1,000 ตัวอักษร';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event::text),94724);
  select * into v_old from public.sports_certificates_issued where id=p_certificate_id for update;
  if v_old.entry_id is null then
    raise exception 'ไม่สามารถออกฉบับใหม่จากใบสมัครที่ถูกรีเซตแล้ว กรุณาลงทะเบียนและออกเอกสารใหม่';
  end if;
  if v_old.revoked_at is null then
    raise exception 'ต้องยกเลิกเกียรติบัตรฉบับเดิมก่อนออกฉบับใหม่แทน';
  end if;
  if v_old.replaced_by is not null then
    raise exception 'เกียรติบัตรฉบับนี้มีฉบับใหม่แทนแล้ว';
  end if;
  if v_old.certificate_kind='award' and not exists(
    select 1 from public.sports_certificate_results r where r.event_id=v_event and r.status='published'
  ) then raise exception 'ผลรางวัลไม่ได้เผยแพร่อยู่ จึงยังออกฉบับใหม่ไม่ได้'; end if;
  if v_old.certificate_kind='participation' and not exists(
    select 1 from public.sports_certificate_event_settings s
    where s.event_id=v_event and s.participation_released
  ) then raise exception 'เกียรติบัตรเข้าร่วมถูกปิดการเผยแพร่ จึงยังออกฉบับใหม่ไม่ได้'; end if;

  -- The original recipient identity remains reserved by the historical row's UNIQUE key.
  -- Use a unique replacement key so the new immutable document can coexist safely.
  v_new_key:=left('replacement:'||v_old.id::text||':'||gen_random_uuid()::text,200);
  insert into public.sports_certificates_issued(
    verify_token,competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
    recipient_name,school_name,event_name,competition_name,certificate_title,award_rank,
    certificate_kind,signer_name,signer_position,is_active,replaces_id
  ) values (
    gen_random_uuid(),v_old.competition_id,v_old.event_id,v_old.entry_id,v_old.school_id,
    v_old.recipient_type,v_new_key,v_old.recipient_name,v_old.school_name,v_old.event_name,
    v_old.competition_name,v_old.certificate_title,v_old.award_rank,v_old.certificate_kind,
    v_old.signer_name,v_old.signer_position,true,v_old.id
  ) returning id into v_new_id;

  -- Point every historical ancestor in this replacement chain at the latest
  -- issued document, so scanning any older QR leads to the current replacement.
  with recursive ancestors(id) as (
    select v_old.id
    union all
    select prior.id
    from public.sports_certificates_issued prior
    join ancestors a on prior.replaced_by=a.id
  )
  update public.sports_certificates_issued
    set replaced_by=v_new_id
    where id in (select id from ancestors);

  update public.sports_certificates_issued
    set replacement_reason=left(btrim(p_reason),1000)
    where id=v_old.id;
  return v_new_id;
end; $$;
revoke all on function public.sports_cert_reissue(bigint,text) from public,anon;
grant execute on function public.sports_cert_reissue(bigint,text) to authenticated;
commit;
notify pgrst,'reload schema';
