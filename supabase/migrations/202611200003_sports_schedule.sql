-- Stage 3: apply after Stage 1 and Stage 2. No writes to student or submission tables.
begin;

alter table public.sports_events add column if not exists sport_group text;
alter table public.sports_events add column if not exists stage3_source text;
create unique index if not exists sports_events_comp_id_uidx on public.sports_events(competition_id,id);

-- Explicit sports role only, not profiles.role. Anonymous calls return false.
create or replace function public.sports_stage3_admin(p_comp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.sports_user_roles r
    where r.user_id = auth.uid() and r.is_active
      and ((r.role = 'competition_admin' and r.competition_id = p_comp)
        or (r.role = 'super_admin' and (r.competition_id is null or r.competition_id = p_comp)))
  );
$$;
revoke all on function public.sports_stage3_admin(uuid) from public, anon, authenticated;
grant execute on function public.sports_stage3_admin(uuid) to anon, authenticated;

-- Restrictive policies override older permissive policies relying on profiles.role.
alter table public.sports_events enable row level security;
drop policy if exists "stage3 event draft guard" on public.sports_events;
create policy "stage3 event draft guard" on public.sports_events as restrictive for select to public
using (status <> 'draft' or public.sports_stage3_admin(competition_id));
drop policy if exists "stage3 event insert guard" on public.sports_events;
create policy "stage3 event insert guard" on public.sports_events as restrictive for insert to public
with check (public.sports_stage3_admin(competition_id));
drop policy if exists "stage3 event update guard" on public.sports_events;
create policy "stage3 event update guard" on public.sports_events as restrictive for update to public
using (public.sports_stage3_admin(competition_id)) with check (public.sports_stage3_admin(competition_id));
-- Event deletion could cascade to registrations/results. Disable browser deletion.
revoke delete on public.sports_events from public, anon, authenticated;
drop policy if exists "stage3 event no browser delete" on public.sports_events;
create policy "stage3 event no browser delete" on public.sports_events as restrictive for delete to public using (false);

-- Keep seeded events closed to online registration until an official registration stage.
-- Existing non-Stage3 records retain their original workflow.
drop policy if exists "stage3 entry registration guard" on public.sports_entries;
create policy "stage3 entry registration guard" on public.sports_entries as restrictive for insert to public
with check(exists (
  select 1 from public.sports_events e
  where e.id = sports_entries.event_id and e.competition_id = sports_entries.competition_id
    and (e.stage3_source is null or e.status = 'registration')
));

create table if not exists public.sports_schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  event_id uuid not null,
  seed_key text,
  session_number text not null check (length(btrim(session_number)) between 1 and 80),
  session_date date,
  report_time time,
  start_time time,
  end_time time,
  round_name text not null default 'ไม่ระบุรอบ' check (length(btrim(round_name)) between 1 and 150),
  participants text not null default '' check (length(participants) <= 2000),
  venue_name text not null default '' check (length(venue_name) <= 250),
  source_ref text not null default '' check (length(source_ref) <= 300),
  review_note text not null default '' check (length(review_note) <= 2000),
  status text not null default 'draft' check (status in ('draft','published','postponed','cancelled')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(competition_id,seed_key),
  foreign key (competition_id,event_id) references public.sports_events(competition_id,id) on delete restrict,
  check(status <> 'published' or session_date is not null),
  check(report_time is null or start_time is null or report_time <= start_time),
  check(end_time is null or start_time is null or end_time >= start_time)
);
create index if not exists sports_schedule_sessions_comp_date_idx on public.sports_schedule_sessions(competition_id,session_date,start_time);
alter table public.sports_schedule_sessions enable row level security;
revoke all privileges on public.sports_schedule_sessions from public, anon, authenticated;
-- Publish through an explicit admin action, RLS also enforces competition scope on direct writes.
grant select on public.sports_schedule_sessions to anon, authenticated;
grant insert, update, delete on public.sports_schedule_sessions to authenticated;
drop policy if exists "stage3 session read" on public.sports_schedule_sessions;
create policy "stage3 session read" on public.sports_schedule_sessions for select to anon,authenticated
using (public.sports_stage3_admin(competition_id) or (status <> 'draft' and exists (
  select 1 from public.sports_events e where e.id=event_id and e.status <> 'draft'
)));
drop policy if exists "stage3 session insert" on public.sports_schedule_sessions;
create policy "stage3 session insert" on public.sports_schedule_sessions for insert to authenticated
with check(public.sports_stage3_admin(competition_id));
drop policy if exists "stage3 session update" on public.sports_schedule_sessions;
create policy "stage3 session update" on public.sports_schedule_sessions for update to authenticated
using(public.sports_stage3_admin(competition_id)) with check(public.sports_stage3_admin(competition_id));
drop policy if exists "stage3 session delete draft" on public.sports_schedule_sessions;
create policy "stage3 session delete draft" on public.sports_schedule_sessions for delete to authenticated
using(public.sports_stage3_admin(competition_id) and status='draft');

create or replace function public.sports_stage3_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists sports_stage3_stamp on public.sports_schedule_sessions;
create trigger sports_stage3_stamp before insert or update on public.sports_schedule_sessions
for each row execute function public.sports_stage3_stamp();

-- Admin selects reviewed rows. The RPC publishes both the selected schedule(s) and their draft events
-- in one transaction. It does NOT open registration or create match scores.
create or replace function public.sports_stage3_publish(p_comp uuid,p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_expected integer;
begin
  if not public.sports_stage3_admin(p_comp) then raise exception 'ไม่มีสิทธิ์เผยแพร่โปรแกรม' using errcode='42501'; end if;
  if p_ids is null or cardinality(p_ids) not between 1 and 500 then raise exception 'เลือก 1–500 รายการ'; end if;
  select count(distinct x) into v_expected from unnest(p_ids) x;
  if v_expected <> cardinality(p_ids) then raise exception 'รายการซ้ำหรือไม่ถูกต้อง'; end if;
  perform 1 from public.sports_schedule_sessions where competition_id=p_comp and id=any(p_ids) for update;
  select count(*) into v_count from public.sports_schedule_sessions where competition_id=p_comp and id=any(p_ids) and status='draft' and session_date is not null;
  if v_count <> v_expected then raise exception 'เลือกได้เฉพาะฉบับร่างที่ระบุวันที่ครบและอยู่ในการแข่งขันนี้'; end if;
  update public.sports_events e set status='scheduled',updated_at=now()
  where e.competition_id=p_comp and e.status='draft' and exists (select 1 from public.sports_schedule_sessions s where s.event_id=e.id and s.id=any(p_ids));
  update public.sports_schedule_sessions set status='published' where competition_id=p_comp and id=any(p_ids);
  insert into public.sports_audit_logs(actor_user_id,action,entity_table,details)
  values(auth.uid(),'PUBLISH_SCHEDULE','sports_schedule_sessions',jsonb_build_object('competition_id',p_comp,'count',v_count,'session_ids',p_ids));
  return v_count;
end;
$$;
revoke all on function public.sports_stage3_publish(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.sports_stage3_publish(uuid,uuid[]) to authenticated;
commit;
