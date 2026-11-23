-- PHULANGKA GAMES 2569 • Certificate revocation and replacement (v33.5)
-- Adds auditable certificate cancellation and a controlled replacement workflow.
-- Existing certificate rows, QR tokens, competition results and registrations are preserved.
begin;

alter table public.sports_certificates_issued
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists revocation_reason text not null default '',
  add column if not exists replaced_by bigint references public.sports_certificates_issued(id) on delete set null,
  add column if not exists replaces_id bigint references public.sports_certificates_issued(id) on delete set null,
  add column if not exists replacement_reason text not null default '';

create index if not exists sports_cert_issued_revoked_idx
  on public.sports_certificates_issued(event_id, revoked_at, issued_at desc);
create unique index if not exists sports_cert_issued_replaces_once_idx
  on public.sports_certificates_issued(replaces_id) where replaces_id is not null;

comment on column public.sports_certificates_issued.revoked_at is
  'Non-null means the certificate has been explicitly revoked; the original row and QR token are retained.';
comment on column public.sports_certificates_issued.replaced_by is
  'Certificate ID of the replacement document, if a replacement was issued.';
comment on column public.sports_certificates_issued.replaces_id is
  'Original certificate ID that this replacement document supersedes.';

-- Admin-only list includes active, temporarily inactive and revoked certificates.
create or replace function public.sports_cert_admin_documents(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_data jsonb;
begin
  select competition_id into v_comp from public.sports_events where id=p_event;
  if v_comp is null or not public.sports_stage3_admin(v_comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันเท่านั้นที่จัดการเกียรติบัตรได้' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,
    'recipient_name',i.recipient_name,
    'recipient_type',i.recipient_type,
    'school_name',i.school_name,
    'event_name',i.event_name,
    'kind',i.certificate_kind,
    'rank',i.award_rank,
    'issued_at',i.issued_at,
    'status',case when i.revoked_at is not null then 'revoked'
                  when i.is_active then 'active' else 'inactive' end,
    'revoked_at',i.revoked_at,
    'revocation_reason',i.revocation_reason,
    'replaced_by',i.replaced_by,
    'replaces_id',i.replaces_id,
    'replacement_reason',i.replacement_reason
  ) order by i.issued_at desc,i.id desc),'[]'::jsonb)
  into v_data
  from public.sports_certificates_issued i
  where i.event_id=p_event;
  return v_data;
end; $$;
revoke all on function public.sports_cert_admin_documents(uuid) from public,anon;
grant execute on function public.sports_cert_admin_documents(uuid) to authenticated;

-- Explicit cancellation keeps the historical document and token for QR verification.
create or replace function public.sports_cert_revoke(p_certificate_id bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event uuid; v_comp uuid; v_doc public.sports_certificates_issued%rowtype;
begin
  select event_id,competition_id into v_event,v_comp
  from public.sports_certificates_issued where id=p_certificate_id;
  if v_event is null then raise exception 'ไม่พบเกียรติบัตรที่เลือก'; end if;
  if not public.sports_stage3_admin(v_comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันเท่านั้นที่ยกเลิกเกียรติบัตรได้' using errcode='42501';
  end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null or length(btrim(p_reason))>1000 then
    raise exception 'กรุณาระบุเหตุผลการยกเลิกไม่เกิน 1,000 ตัวอักษร';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_event::text),94724);
  select * into v_doc from public.sports_certificates_issued where id=p_certificate_id for update;
  if v_doc.revoked_at is not null then raise exception 'เกียรติบัตรฉบับนี้ถูกยกเลิกไปแล้ว'; end if;
  update public.sports_certificates_issued
    set is_active=false,revoked_at=now(),revoked_by=auth.uid(),
        revocation_reason=left(btrim(p_reason),1000)
  where id=p_certificate_id;
  return jsonb_build_object('status','revoked','id',p_certificate_id);
end; $$;
revoke all on function public.sports_cert_revoke(bigint,text) from public,anon;
grant execute on function public.sports_cert_revoke(bigint,text) to authenticated;

-- Reissue creates a new identity, new sequential number and new QR token.
-- The original certificate remains revoked and links to the replacement.
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

-- Turning participation printing off/on must never undo an explicit revocation.
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
    where event_id=p_event and certificate_kind='participation' and revoked_at is null;
  if p_enable then perform public.sports_cert_issue_internal(p_event,'participation'); end if;
end; $$;
revoke all on function public.sports_cert_participation(uuid,boolean) from public,anon;
grant execute on function public.sports_cert_participation(uuid,boolean) to authenticated;

-- Expose replacement lineage to the school print view, while still returning
-- active documents belonging only to the signed-in school (or competition admin).
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
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'token',i.verify_token,'recipient_name',i.recipient_name,
    'recipient_type',i.recipient_type,'school_name',i.school_name,'event_name',i.event_name,
    'competition_name',i.competition_name,'certificate_title',i.certificate_title,
    'rank',i.award_rank,'kind',i.certificate_kind,'signer_name',i.signer_name,
    'signer_position',i.signer_position,'issued_at',i.issued_at,'replaces_id',i.replaces_id
  ) order by i.school_name,i.certificate_kind,i.award_rank nulls last,i.recipient_name),'[]'::jsonb)
  into v_data from public.sports_certificates_issued i
  where i.event_id=p_event and i.is_active and i.revoked_at is null
    and (v_admin or i.school_id=v_school);
  return v_data;
end; $$;
revoke all on function public.sports_cert_my_documents(uuid) from public,anon;
grant execute on function public.sports_cert_my_documents(uuid) to authenticated;

-- QR verification distinguishes revoked documents from unknown/inactive tokens.
create or replace function public.sports_cert_verify(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_doc public.sports_certificates_issued%rowtype; v_replacement bigint;
begin
  select * into v_doc from public.sports_certificates_issued where verify_token=p_token;
  if not found then return jsonb_build_object('valid',false,'status','not_found'); end if;
  if v_doc.revoked_at is not null then
    select id into v_replacement from public.sports_certificates_issued where id=v_doc.replaced_by;
    return jsonb_build_object(
      'valid',false,'status','revoked','id',v_doc.id,
      'recipient_name',v_doc.recipient_name,'school_name',v_doc.school_name,
      'event_name',v_doc.event_name,'revoked_at',v_doc.revoked_at,
      'revocation_reason',v_doc.revocation_reason,
      'replacement_id',v_replacement
    );
  end if;
  if not v_doc.is_active then
    return jsonb_build_object('valid',false,'status','inactive','id',v_doc.id,
      'recipient_name',v_doc.recipient_name,'school_name',v_doc.school_name,
      'event_name',v_doc.event_name);
  end if;
  return jsonb_build_object('valid',true,'status','valid','id',v_doc.id,
    'recipient_name',v_doc.recipient_name,'recipient_type',v_doc.recipient_type,
    'school_name',v_doc.school_name,'event_name',v_doc.event_name,
    'competition_name',v_doc.competition_name,'kind',v_doc.certificate_kind,
    'rank',v_doc.award_rank,'issued_at',v_doc.issued_at,
    'replaces_id',v_doc.replaces_id);
end; $$;
revoke all on function public.sports_cert_verify(uuid) from public;
grant execute on function public.sports_cert_verify(uuid) to anon,authenticated;

commit;
notify pgrst, 'reload schema';
