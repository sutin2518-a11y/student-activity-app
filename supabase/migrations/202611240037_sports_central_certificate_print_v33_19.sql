-- v33.19: competition-wide PRINT ONLY permission, independent of result officials.
-- Requires migrations 027 and 029; no changes to issued documents or school printing.
begin;
create table if not exists public.sports_central_certificate_officials (
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  email text not null check (email=lower(btrim(email)) and length(email) between 6 and 254),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (competition_id,email)
);
alter table public.sports_central_certificate_officials enable row level security;
revoke all on public.sports_central_certificate_officials from public,anon,authenticated;

create or replace function public.sports_central_cert_my_access()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.sports_competitions c
    where c.slug='phayao-secondary-group-sports-2569' and (
      public.sports_stage3_admin(c.id) or exists (
        select 1 from public.sports_central_certificate_officials o
        join auth.users u on u.id=auth.uid() and lower(btrim(u.email))=o.email
        where o.competition_id=c.id and o.is_active and u.email_confirmed_at is not null
        and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
      )
    )
  );
$$;

create or replace function public.sports_central_cert_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_events jsonb;
begin
  if not public.sports_central_cert_my_access() then
    raise exception 'บัญชีนี้ไม่มีสิทธิ์พิมพ์เกียรติบัตรส่วนกลาง' using errcode='42501';
  end if;
  select id into v_comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'sport_name',e.sport_name,'event_code',e.event_code) order by e.sport_name,e.event_code),'[]'::jsonb)
  into v_events from public.sports_events e where e.competition_id=v_comp;
  return jsonb_build_object('admin',public.sports_stage3_admin(v_comp),'events',v_events);
end; $$;

create or replace function public.sports_central_cert_documents(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_data jsonb;
begin
  if not public.sports_central_cert_my_access() then
    raise exception 'บัญชีนี้ไม่มีสิทธิ์พิมพ์เกียรติบัตรส่วนกลาง' using errcode='42501';
  end if;
  if not exists(select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where e.id=p_event and c.slug='phayao-secondary-group-sports-2569') then
    raise exception 'ไม่พบรายการแข่งขันนี้';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'token',i.verify_token,'recipient_name',i.recipient_name,
    'recipient_type',i.recipient_type,'school_name',i.school_name,'event_name',i.event_name,
    'competition_name',i.competition_name,'certificate_title',i.certificate_title,
    'rank',i.award_rank,'kind',i.certificate_kind,'signer_name',i.signer_name,
    'signer_position',i.signer_position,'issued_at',i.issued_at,'replaces_id',i.replaces_id
  ) order by i.school_name,i.certificate_kind,i.award_rank nulls last,i.recipient_name),'[]'::jsonb)
  into v_data from public.sports_certificates_issued i
  where i.event_id=p_event and i.is_active and i.revoked_at is null;
  return v_data;
end; $$;

create or replace function public.sports_central_cert_roster()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_data jsonb;
begin
  select id into v_comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
  if v_comp is null or not public.sports_stage3_admin(v_comp) then raise exception 'เฉพาะแม่แอดมินเท่านั้น' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('email',o.email,'is_active',o.is_active) order by o.email),'[]'::jsonb)
  into v_data from public.sports_central_certificate_officials o where o.competition_id=v_comp;
  return v_data;
end; $$;

create or replace function public.sports_central_cert_assign(p_email text,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_comp uuid; v_email text:=lower(btrim(coalesce(p_email,'')));
begin
  select id into v_comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
  if v_comp is null or not public.sports_stage3_admin(v_comp) then raise exception 'เฉพาะแม่แอดมินเท่านั้น' using errcode='42501'; end if;
  if p_active is null or length(v_email)>254 or v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then raise exception 'กรุณาระบุอีเมล Google ให้ถูกต้อง'; end if;
  insert into public.sports_central_certificate_officials(competition_id,email,is_active,updated_by)
  values(v_comp,v_email,p_active,auth.uid()) on conflict(competition_id,email) do update
  set is_active=excluded.is_active,updated_by=auth.uid(),updated_at=now();
end; $$;
revoke all on function public.sports_central_cert_my_access(), public.sports_central_cert_context(), public.sports_central_cert_documents(uuid), public.sports_central_cert_roster(), public.sports_central_cert_assign(text,boolean) from public,anon,authenticated;
grant execute on function public.sports_central_cert_my_access(), public.sports_central_cert_context(), public.sports_central_cert_documents(uuid), public.sports_central_cert_roster(), public.sports_central_cert_assign(text,boolean) to authenticated;
commit;
notify pgrst, 'reload schema';
