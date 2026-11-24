-- PHAYAO GAMES v33.18 | Event referee assignment registry (Stage 1)
-- Prerequisites: sports_stage3_admin, sports_events, sports_competitions,
-- 202611230027_sports_certificates_v1 and v33.4 unified officials access RPCs.
-- No existing rights/registrations/results/programs are modified.
begin;

create table if not exists public.sports_event_referees (
  event_id uuid not null references public.sports_events(id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  email text not null check (email=lower(btrim(email)) and length(email) between 6 and 254),
  is_active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(event_id,email)
);
create index if not exists sports_event_referees_email_lookup
  on public.sports_event_referees(email,is_active,competition_id);

create table if not exists public.sports_event_referee_audit (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  event_id uuid not null references public.sports_events(id) on delete restrict,
  target_email text not null,
  was_active boolean,
  is_active boolean not null,
  performed_by uuid references auth.users(id) on delete set null,
  performed_at timestamptz not null default now()
);
create index if not exists sports_event_referee_audit_event_idx
  on public.sports_event_referee_audit(event_id,performed_at desc);

alter table public.sports_event_referees enable row level security;
alter table public.sports_event_referee_audit enable row level security;
-- Deliberately expose no table access to browser clients; use vetted RPCs.
revoke all on public.sports_event_referees, public.sports_event_referee_audit
  from public, anon, authenticated;

create or replace function public.sports_event_referee_assign(
  p_event uuid, p_email text, p_active boolean
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_comp uuid;
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_previous boolean;
begin
  select e.competition_id into v_comp
  from public.sports_events e
  join public.sports_competitions c on c.id=e.competition_id
    and c.slug='phayao-secondary-group-sports-2569'
  where e.id=p_event;
  if v_comp is null or auth.uid() is null or not public.sports_stage3_admin(v_comp) then
    raise exception 'เฉพาะแม่แอดมินสามารถมอบหมายกรรมการรายการนี้ได้' using errcode='42501';
  end if;
  if p_active is null or length(v_email)>254 or
      v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'กรุณาระบุอีเมล Google และสถานะให้ถูกต้อง';
  end if;
  select r.is_active into v_previous
    from public.sports_event_referees r
    where r.event_id=p_event and r.email=v_email for update;
  insert into public.sports_event_referees(
    event_id,competition_id,email,is_active,assigned_by,updated_by
  ) values(p_event,v_comp,v_email,p_active,auth.uid(),auth.uid())
  on conflict(event_id,email) do update
    set is_active=excluded.is_active, updated_by=auth.uid(), updated_at=now();
  if v_previous is distinct from p_active then
    insert into public.sports_event_referee_audit(
      competition_id,event_id,target_email,was_active,is_active,performed_by
    ) values (v_comp,p_event,v_email,v_previous,p_active,auth.uid());
  end if;
  return jsonb_build_object('event_id',p_event,'email',v_email,'is_active',p_active);
end;
$$;
revoke all on function public.sports_event_referee_assign(uuid,text,boolean)
  from public,anon,authenticated;
grant execute on function public.sports_event_referee_assign(uuid,text,boolean)
  to authenticated;

-- Only the principal competition admin may inspect the roster / OAuth status.
create or replace function public.sports_event_referee_roster(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_rows jsonb;
begin
  select e.competition_id into v_comp from public.sports_events e
  join public.sports_competitions c on c.id=e.competition_id
    and c.slug='phayao-secondary-group-sports-2569'
  where e.id=p_event;
  if v_comp is null or auth.uid() is null or not public.sports_stage3_admin(v_comp) then
    raise exception 'เฉพาะแม่แอดมินสามารถดูข้อมูลกรรมการได้' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'email',r.email,'results_active',r.is_active,
    'login_ready',u.id is not null and u.email_confirmed_at is not null and
      exists (select 1 from auth.identities i where i.user_id=u.id and i.provider='google'),
    'login_status',case
      when u.id is null then 'not_signed_in'
      when u.email_confirmed_at is null then 'unconfirmed_email'
      when not exists (select 1 from auth.identities i where i.user_id=u.id and i.provider='google') then 'not_google'
      else 'ready' end
  ) order by r.email),'[]'::jsonb) into v_rows
  from public.sports_event_referees r
  left join lateral (
    select a.id,a.email_confirmed_at from auth.users a
    where lower(btrim(a.email))=r.email limit 1
  ) u on true
  where r.event_id=p_event and r.competition_id=v_comp;
  return v_rows;
end;
$$;
revoke all on function public.sports_event_referee_roster(uuid)
  from public,anon,authenticated;
grant execute on function public.sports_event_referee_roster(uuid) to authenticated;

-- A verified Google account may only see its OWN active event assignments.
-- No ability to edit a result/fixture is granted at this stage.
create or replace function public.sports_event_referee_my_events()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_email text; v_rows jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  select lower(btrim(u.email)) into v_email from auth.users u
  where u.id=auth.uid() and u.email_confirmed_at is not null
    and exists(select 1 from auth.identities i
      where i.user_id=u.id and i.provider='google');
  if v_email is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'sport_name',e.sport_name,
    'event_code',e.event_code,'event_type',e.event_type
  ) order by e.sport_name),'[]'::jsonb) into v_rows
  from public.sports_event_referees r
  join public.sports_events e on e.id=r.event_id and e.competition_id=r.competition_id
  join public.sports_competitions c on c.id=e.competition_id
    and c.slug='phayao-secondary-group-sports-2569'
  where r.is_active and r.email=v_email;
  return v_rows;
end;
$$;
revoke all on function public.sports_event_referee_my_events()
  from public,anon,authenticated;
grant execute on function public.sports_event_referee_my_events()
  to authenticated;

commit;
