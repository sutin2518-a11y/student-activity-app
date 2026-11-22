-- v31: RoV-only delegated administrators, starting with four nominated Google accounts.
-- Approved emails work after their owner signs in with a verified Google identity.
-- Other sports, competition-wide roles, school registrations, and principal admins are not changed.
-- Install after migrations 202611220024. No results or fixtures are reset.
begin;

create table if not exists public.sports_esports_admins (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and length(email) between 6 and 254),
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, email)
);

create table if not exists public.sports_esports_admin_audit (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  target_email text not null,
  was_active boolean,
  is_active boolean not null,
  performed_by uuid references auth.users(id) on delete set null,
  performed_at timestamptz not null default now()
);

create index if not exists sports_esports_admins_competition_idx
  on public.sports_esports_admins(competition_id, is_active);

-- Only already-authorized competition administrators may read or manage the delegation roster.
-- Updates are always performed through the audited RPC below, never direct browser writes.
alter table public.sports_esports_admins enable row level security;
alter table public.sports_esports_admin_audit enable row level security;
revoke all on public.sports_esports_admins from public, anon, authenticated;
revoke all on public.sports_esports_admin_audit from public, anon, authenticated;
grant select on public.sports_esports_admins, public.sports_esports_admin_audit to authenticated;
drop policy if exists "esports principal admin roster read" on public.sports_esports_admins;
create policy "esports principal admin roster read" on public.sports_esports_admins
  for select to authenticated using (public.sports_stage3_admin(competition_id));
drop policy if exists "esports principal admin audit read" on public.sports_esports_admin_audit;
create policy "esports principal admin audit read" on public.sports_esports_admin_audit
  for select to authenticated using (public.sports_stage3_admin(competition_id));

-- A delegated administrator can act only after Google sign-in has produced a verified
-- auth.users record with a Google identity and an exact approved email.
-- No special permission is inferred from email domain, user_metadata, or profiles.role.
create or replace function public.sports_esports_can_manage(p_comp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.sports_stage3_admin(p_comp), false)
    or (auth.uid() is not null and exists (
      select 1
      from public.sports_esports_admins a
      join auth.users u on u.id = auth.uid()
      where a.competition_id = p_comp
        and a.is_active
        and a.email = lower(btrim(u.email))
        and u.email_confirmed_at is not null
        and exists (
          select 1 from auth.identities i
          where i.user_id = u.id and i.provider = 'google'
        )
    ));
$$;
revoke all on function public.sports_esports_can_manage(uuid) from public, anon, authenticated;
grant execute on function public.sports_esports_can_manage(uuid) to anon, authenticated;

-- Scope delegated privileges to only the two official RoV events, not any other sports.
create or replace function public.sports_esports_can_edit_event(p_comp uuid, p_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.sports_stage3_admin(p_comp), false)
    or (public.sports_esports_can_manage(p_comp) and exists (
      select 1 from public.sports_events e
      where e.id = p_event and e.competition_id = p_comp
        and e.event_code in ('GS3-ES-SM','GS3-ES-SF')
    ));
$$;
revoke all on function public.sports_esports_can_edit_event(uuid,uuid) from public, anon, authenticated;
grant execute on function public.sports_esports_can_edit_event(uuid,uuid) to anon, authenticated;

-- OAuth completion can check delegated access without knowing a competition UUID.
create or replace function public.sports_esports_my_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.sports_esports_can_manage(c.id)
    from public.sports_competitions c
    where c.slug = 'phayao-secondary-group-sports-2569'
    limit 1
  ), false);
$$;
revoke all on function public.sports_esports_my_access() from public, anon, authenticated;
grant execute on function public.sports_esports_my_access() to authenticated;

-- Only principal competition admins can add, reactivate, or revoke E-Sport admins.
-- This RPC can store an email even if the user has not yet signed in to Supabase.
create or replace function public.sports_esports_set_admin(
  p_comp uuid, p_email text, p_active boolean default true
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_old boolean;
  v_id uuid;
begin
  if not public.sports_stage3_admin(p_comp) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันหลักเท่านั้นที่แก้ไขรายชื่อผู้ดูแล E-Sport ได้' using errcode='42501';
  end if;
  if not exists (select 1 from public.sports_competitions c where c.id=p_comp and c.slug='phayao-secondary-group-sports-2569') then
    raise exception 'ไม่พบการแข่งขันที่อนุญาตให้จัดการผู้ดูแล E-Sport';
  end if;
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' or length(v_email) > 254 then
    raise exception 'รูปแบบอีเมลไม่ถูกต้อง';
  end if;
  if p_active is null then raise exception 'ต้องระบุสถานะผู้ดูแล'; end if;
  select a.is_active into v_old from public.sports_esports_admins a
    where a.competition_id=p_comp and a.email=v_email for update;
  insert into public.sports_esports_admins(competition_id,email,is_active,granted_by)
    values (p_comp,v_email,p_active,auth.uid())
  on conflict (competition_id,email) do update
    set is_active=excluded.is_active, updated_at=now(), granted_by=auth.uid()
  returning id into v_id;
  if v_old is distinct from p_active then
    insert into public.sports_esports_admin_audit(competition_id,target_email,was_active,is_active,performed_by)
      values (p_comp,v_email,v_old,p_active,auth.uid());
  end if;
  return jsonb_build_object('id',v_id,'email',v_email,'is_active',p_active);
end;
$$;
revoke all on function public.sports_esports_set_admin(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.sports_esports_set_admin(uuid,text,boolean) to authenticated;

-- Initial list supplied by the competition organizer; DO NOTHING if already present.
-- Never reactivate a record deliberately disabled later if the migration is rerun.
insert into public.sports_esports_admins(competition_id,email,is_active)
select c.id, v.email, true
from public.sports_competitions c
cross join (values
  ('tanadon@chiangkham.ac.th'),
  ('tanamas@chiangkham.ac.th'),
  ('panupong@chiangkham.ac.th'),
  ('anuphan@chiangkham.ac.th')
) v(email)
where c.slug='phayao-secondary-group-sports-2569'
on conflict (competition_id,email) do nothing;

-- Select unpublished RoV events by delegated admins without granting visibility
-- into unpublished events of other sports (the guard remains restrictive).
drop policy if exists "stage3 event draft guard" on public.sports_events;
create policy "stage3 event draft guard" on public.sports_events as restrictive
for select to public
using (status <> 'draft' or public.sports_stage3_admin(competition_id)
       or (event_code in ('GS3-ES-SM','GS3-ES-SF')
           and public.sports_esports_can_edit_event(competition_id,id)));
drop policy if exists "esports delegated event read" on public.sports_events;
create policy "esports delegated event read" on public.sports_events
for select to authenticated
using (event_code in ('GS3-ES-SM','GS3-ES-SF')
       and public.sports_esports_can_edit_event(competition_id,id));

-- Delegated admins may update the two existing E-Sport event records but cannot
-- insert/delete sports events, change their event codes to another sport, or
-- cross into a different competition.
drop policy if exists "stage3 event update guard" on public.sports_events;
create policy "stage3 event update guard" on public.sports_events as restrictive
for update to public
using (public.sports_stage3_admin(competition_id)
       or (event_code in ('GS3-ES-SM','GS3-ES-SF')
           and public.sports_esports_can_edit_event(competition_id,id)))
with check (public.sports_stage3_admin(competition_id)
       or (event_code in ('GS3-ES-SM','GS3-ES-SF')
           and public.sports_esports_can_edit_event(competition_id,id)));
drop policy if exists "esports delegated event update" on public.sports_events;
create policy "esports delegated event update" on public.sports_events
for update to authenticated
using (event_code in ('GS3-ES-SM','GS3-ES-SF')
       and public.sports_esports_can_edit_event(competition_id,id))
with check (event_code in ('GS3-ES-SM','GS3-ES-SF')
       and public.sports_esports_can_edit_event(competition_id,id));

-- RLS for the dedicated E-Sport tables. Non-admin public read behavior is unchanged.
drop policy if exists "esports groups read" on public.sports_esports_groups;
create policy "esports groups read" on public.sports_esports_groups for select to anon,authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id) or exists (
  select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
));
drop policy if exists "esports groups manage" on public.sports_esports_groups;
create policy "esports groups manage" on public.sports_esports_groups for all to authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id))
with check (public.sports_esports_can_edit_event(competition_id,event_id));

drop policy if exists "esports teams read" on public.sports_esports_group_teams;
create policy "esports teams read" on public.sports_esports_group_teams for select to anon,authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id) or exists (
  select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
));
drop policy if exists "esports teams manage" on public.sports_esports_group_teams;
create policy "esports teams manage" on public.sports_esports_group_teams for all to authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id))
with check (public.sports_esports_can_edit_event(competition_id,event_id));

drop policy if exists "esports matches read" on public.sports_esports_matches;
create policy "esports matches read" on public.sports_esports_matches for select to anon,authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id) or
  (match_status<>'draft' and exists (
    select 1 from public.sports_events e where e.id=event_id and e.status<>'draft'
  )));
drop policy if exists "esports matches insert" on public.sports_esports_matches;
create policy "esports matches insert" on public.sports_esports_matches for insert to authenticated
with check (public.sports_esports_can_edit_event(competition_id,event_id));
drop policy if exists "esports matches update" on public.sports_esports_matches;
create policy "esports matches update" on public.sports_esports_matches for update to authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id))
with check (public.sports_esports_can_edit_event(competition_id,event_id));
drop policy if exists "esports matches delete draft" on public.sports_esports_matches;
create policy "esports matches delete draft" on public.sports_esports_matches for delete to authenticated
using (public.sports_esports_can_edit_event(competition_id,event_id) and match_status='draft');

drop policy if exists "esports match history admin read" on public.sports_esports_match_history;
create policy "esports match history admin read" on public.sports_esports_match_history
for select to authenticated using (public.sports_esports_can_edit_event(competition_id,event_id));
drop policy if exists "esports reset archive admin read" on public.sports_esports_prelaunch_reset_archives;
create policy "esports reset archive admin read" on public.sports_esports_prelaunch_reset_archives
for select to authenticated using (public.sports_esports_can_manage(competition_id));


-- Redeclare existing Stage 6 RPC with event-scoped authorization only.
create or replace function public.sports_esports_generate_knockout(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competition_id uuid;
  v_event_code text;
begin
  select e.competition_id,e.event_code
    into v_competition_id,v_event_code
  from public.sports_events e
  where e.id = p_event_id;

  if v_competition_id is null then raise exception 'ไม่พบรายการแข่งขัน E-Sport'; end if;
  if not public.sports_esports_can_edit_event(v_competition_id,p_event_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
  if v_event_code <> 'GS3-ES-SM' then
    raise exception 'Stage 6 เปิดสร้างสาย Knockout สำหรับทีมชายเท่านั้น จนกว่าจะยืนยันเกณฑ์ทีมหญิง';
  end if;

  perform set_config('app.esports_reason','สร้างโครงสาย Knockout ทีมชาย',true);

  insert into public.sports_esports_matches(
    competition_id,event_id,group_id,match_no,stage,team1_id,team2_id,match_status,venue_name
  ) values
    (v_competition_id,p_event_id,null,'KO-QF-1','knockout',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-QF-2','knockout',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-QF-3','knockout',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-QF-4','knockout',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-SF-1','semifinal',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-SF-2','semifinal',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-FINAL','final',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม'),
    (v_competition_id,p_event_id,null,'KO-3RD','third_place',null,null,'draft','หอประชุมโรงเรียนเชียงคำวิทยาคม')
  on conflict (competition_id,event_id,match_no) do nothing;

  update public.sports_esports_matches qf
  set winner_next_match_id = sf.id,
      winner_next_slot = route.slot_no
  from (values ('KO-QF-1','KO-SF-1',1),('KO-QF-2','KO-SF-1',2),
               ('KO-QF-3','KO-SF-2',1),('KO-QF-4','KO-SF-2',2)) as route(source_no,target_no,slot_no)
  join public.sports_esports_matches sf
    on sf.competition_id = v_competition_id and sf.event_id = p_event_id and sf.match_no = route.target_no
  where qf.competition_id = v_competition_id and qf.event_id = p_event_id and qf.match_no = route.source_no
    and (qf.winner_next_match_id is distinct from sf.id or qf.winner_next_slot is distinct from route.slot_no);

  update public.sports_esports_matches sf
  set winner_next_match_id = final_match.id,
      winner_next_slot = route.winner_slot,
      loser_next_match_id = third_match.id,
      loser_next_slot = route.loser_slot
  from (values ('KO-SF-1',1,1),('KO-SF-2',2,2)) as route(source_no,winner_slot,loser_slot)
  join public.sports_esports_matches final_match
    on final_match.competition_id = v_competition_id and final_match.event_id = p_event_id and final_match.match_no = 'KO-FINAL'
  join public.sports_esports_matches third_match
    on third_match.competition_id = v_competition_id and third_match.event_id = p_event_id and third_match.match_no = 'KO-3RD'
  where sf.competition_id = v_competition_id and sf.event_id = p_event_id and sf.match_no = route.source_no
    and (sf.winner_next_match_id is distinct from final_match.id or sf.winner_next_slot is distinct from route.winner_slot
      or sf.loser_next_match_id is distinct from third_match.id or sf.loser_next_slot is distinct from route.loser_slot);
end;
$$;


-- Redeclare existing Stage 6 RPC with event-scoped authorization only.
create or replace function public.sports_esports_update_knockout_teams(
  p_match_id uuid,
  p_team1_id uuid,
  p_team2_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.sports_esports_matches%rowtype;
  v_reason text;
  v_team_count integer;
begin
  select * into v_match
  from public.sports_esports_matches
  where id = p_match_id
  for update;

  if not found then raise exception 'ไม่พบคู่ Knockout ที่ต้องการแก้ไข'; end if;
  if not public.sports_esports_can_edit_event(v_match.competition_id,v_match.event_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
  if v_match.stage = 'group' then raise exception 'ฟังก์ชันนี้ใช้แก้ไขเฉพาะคู่ Knockout'; end if;
  if p_team1_id is null or p_team2_id is null or p_team1_id = p_team2_id then
    raise exception 'โปรดเลือกทีมให้ครบทั้งสองทีม และห้ามเลือกทีมซ้ำกัน';
  end if;
  v_reason := nullif(btrim(p_reason),'');
  if v_reason is null then raise exception 'โปรดระบุเหตุผลในการแก้ไขสาย'; end if;
  if v_match.team1_id is not distinct from p_team1_id and v_match.team2_id is not distinct from p_team2_id then
    return;
  end if;

  select count(*) into v_team_count
  from public.sports_esports_group_teams t
  where t.competition_id = v_match.competition_id
    and t.event_id = v_match.event_id
    and t.id in (p_team1_id,p_team2_id);
  if v_team_count <> 2 then raise exception 'ทีมที่เลือกไม่อยู่ในรายการแข่งขันประเภทเดียวกัน'; end if;

  if exists (
    select 1 from public.sports_esports_matches other_match
    where other_match.competition_id = v_match.competition_id
      and other_match.event_id = v_match.event_id
      and other_match.stage = v_match.stage
      and other_match.id <> v_match.id
      and other_match.match_status <> 'cancelled'
      and (other_match.team1_id in (p_team1_id,p_team2_id) or other_match.team2_id in (p_team1_id,p_team2_id))
  ) then
    raise exception 'ทีมที่เลือกถูกจัดไว้ในคู่อื่นของรอบเดียวกันแล้ว';
  end if;

  perform set_config('app.esports_reason',v_reason,true);
  perform public.sports_esports_invalidate_downstream(p_match_id,'สายต้นทางถูกแก้ไข: ' || v_reason);

  update public.sports_esports_matches
  set team1_id = p_team1_id,
      team2_id = p_team2_id,
      match_status = 'draft',
      score1 = null,
      score2 = null,
      duration_minutes = null,
      team1_kills = null,
      team2_kills = null
  where id = p_match_id;
end;
$$;


-- Redeclare existing Stage 6 RPC with event-scoped authorization only.
create or replace function public.sports_esports_save_knockout_match(
  p_match_id uuid,
  p_scheduled_date date,
  p_start_time time,
  p_venue_name text,
  p_match_status text,
  p_score1 smallint,
  p_score2 smallint,
  p_duration_minutes numeric,
  p_team1_kills integer,
  p_team2_kills integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.sports_esports_matches%rowtype;
  v_old_winner uuid;
  v_old_loser uuid;
  v_new_winner uuid;
  v_new_loser uuid;
  v_next_team uuid;
  v_needs_reset boolean := false;
  v_reason text;
begin
  select * into v_match
  from public.sports_esports_matches
  where id = p_match_id
  for update;

  if not found then raise exception 'ไม่พบคู่ Knockout ที่ต้องการบันทึก'; end if;
  if not public.sports_esports_can_edit_event(v_match.competition_id,v_match.event_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
  if v_match.stage = 'group' then raise exception 'ฟังก์ชันนี้ใช้บันทึกเฉพาะคู่ Knockout'; end if;
  if p_match_status is null or p_match_status not in ('draft','scheduled','completed','cancelled') then raise exception 'สถานะการแข่งขันไม่ถูกต้อง'; end if;
  if p_match_status = 'scheduled' and (p_scheduled_date is null or p_start_time is null) then
    raise exception 'โปรดระบุวันที่และเวลา ก่อนกำหนดสถานะแข่งขัน';
  end if;
  if p_match_status in ('scheduled','completed') and (v_match.team1_id is null or v_match.team2_id is null) then
    raise exception 'โปรดจัดทีมให้ครบทั้งสองช่องก่อนกำหนดโปรแกรมหรือบันทึกผล';
  end if;
  if p_match_status = 'completed' and (
    p_score1 is null or p_score2 is null or not (
      (p_score1 = 2 and p_score2 in (0,1)) or (p_score2 = 2 and p_score1 in (0,1))
    )
  ) then
    raise exception 'ผลการแข่งขันต้องเป็น 2–0, 2–1, 0–2 หรือ 1–2 ตามกติกา Best of Three';
  end if;

  if v_match.match_status = 'completed' then
    if v_match.score1 > v_match.score2 then
      v_old_winner := v_match.team1_id; v_old_loser := v_match.team2_id;
    else
      v_old_winner := v_match.team2_id; v_old_loser := v_match.team1_id;
    end if;
  end if;

  if p_match_status = 'completed' then
    if p_score1 > p_score2 then
      v_new_winner := v_match.team1_id; v_new_loser := v_match.team2_id;
    else
      v_new_winner := v_match.team2_id; v_new_loser := v_match.team1_id;
    end if;
  end if;

  if v_old_winner is distinct from v_new_winner or v_old_loser is distinct from v_new_loser then
    v_needs_reset := true;
  end if;

  if v_match.winner_next_match_id is not null and p_match_status = 'completed' then
    select case when v_match.winner_next_slot = 1 then child.team1_id else child.team2_id end
      into v_next_team
    from public.sports_esports_matches child where child.id = v_match.winner_next_match_id;
    if v_next_team is distinct from v_new_winner then v_needs_reset := true; end if;
  end if;
  if v_match.loser_next_match_id is not null and p_match_status = 'completed' then
    select case when v_match.loser_next_slot = 1 then child.team1_id else child.team2_id end
      into v_next_team
    from public.sports_esports_matches child where child.id = v_match.loser_next_match_id;
    if v_next_team is distinct from v_new_loser then v_needs_reset := true; end if;
  end if;

  v_reason := coalesce(nullif(btrim(p_reason),''),'บันทึกหรือแก้ไขผลการแข่งขัน Knockout');
  perform set_config('app.esports_reason',v_reason,true);
  if v_needs_reset then
    perform public.sports_esports_invalidate_downstream(p_match_id,'ผลการแข่งขันต้นทางเปลี่ยนแปลง: ' || v_reason);
  end if;

  update public.sports_esports_matches
  set scheduled_date = p_scheduled_date,
      start_time = p_start_time,
      venue_name = coalesce(nullif(btrim(p_venue_name),''),'หอประชุมโรงเรียนเชียงคำวิทยาคม'),
      match_status = p_match_status,
      score1 = case when p_match_status = 'completed' then p_score1 else null end,
      score2 = case when p_match_status = 'completed' then p_score2 else null end,
      duration_minutes = p_duration_minutes,
      team1_kills = p_team1_kills,
      team2_kills = p_team2_kills
  where id = p_match_id;

  if p_match_status = 'completed' then
    if v_match.winner_next_match_id is not null then
      update public.sports_esports_matches child
      set team1_id = case when v_match.winner_next_slot = 1 then v_new_winner else child.team1_id end,
          team2_id = case when v_match.winner_next_slot = 2 then v_new_winner else child.team2_id end
      where child.id = v_match.winner_next_match_id
        and (case when v_match.winner_next_slot = 1 then child.team1_id else child.team2_id end) is distinct from v_new_winner;
    end if;
    if v_match.loser_next_match_id is not null then
      update public.sports_esports_matches child
      set team1_id = case when v_match.loser_next_slot = 1 then v_new_loser else child.team1_id end,
          team2_id = case when v_match.loser_next_slot = 2 then v_new_loser else child.team2_id end
      where child.id = v_match.loser_next_match_id
        and (case when v_match.loser_next_slot = 1 then child.team1_id else child.team2_id end) is distinct from v_new_loser;
    end if;
  end if;
end;
$$;


-- Preserve the existing preview, backup, confirmation and 5 Dec cutoff.
create or replace function public.sports_esports_prelaunch_reset(
  p_action text,
  p_confirmation text default null,
  p_expected_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_competition_id uuid;
  v_event_count integer;
  v_match_count integer;
  v_group_count integer;
  v_knockout_count integer;
  v_cancelled_count integer;
  v_completed_count integer;
  v_scheduled_count integer;
  v_draft_count integer;
  v_history_count integer;
  v_men_count integer;
  v_women_count integer;
  v_fingerprint text;
  v_archive_id uuid;
  v_snapshot jsonb;
  v_preview jsonb;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลการแข่งขันก่อน' using errcode = '42501';
  end if;

  select id into v_competition_id
  from public.sports_competitions
  where slug = 'phayao-secondary-group-sports-2569';

  if v_competition_id is null or not public.sports_esports_can_manage(v_competition_id) then
    raise exception 'เฉพาะผู้ดูแลการแข่งขันที่ได้รับสิทธิ์เท่านั้น' using errcode = '42501';
  end if;

  if p_action is null or p_action not in ('preview','reset') then
    raise exception 'รูปแบบคำสั่งไม่ถูกต้อง';
  end if;

  if p_action = 'reset' then
    -- Prevent this one-time preparation tool from being used on live competition days.
    if (clock_timestamp() at time zone 'Asia/Bangkok')::date >= date '2026-12-05' then
      raise exception 'ปิดการรีเซตอัตโนมัติตั้งแต่วันที่ 5 ธันวาคม 2569 เพื่อป้องกันการลบผลแข่งขันจริง';
    end if;
    if p_confirmation is distinct from 'รีเซต ROV 2569' then
      raise exception 'กรุณาพิมพ์ข้อความยืนยันให้ตรงทุกตัวอักษร';
    end if;
    -- Serialize all E-Sport updates while archiving and resetting.
    perform 1 from public.sports_competitions where id = v_competition_id for update;
    perform 1 from public.sports_events
      where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF')
      order by id for update;
    perform 1 from public.sports_esports_matches
      where competition_id = v_competition_id
        and event_id in (select id from public.sports_events
                         where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'))
      order by id for update;
  end if;

  select count(*)::integer into v_event_count
  from public.sports_events
  where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF');
  if v_event_count <> 2 then
    raise exception 'ต้องมีรายการ RoV ทีมชายและทีมหญิงครบ 2 รายการก่อน';
  end if;

  select count(*)::integer,
         (count(*) filter (where m.stage = 'group'))::integer,
         (count(*) filter (where m.stage <> 'group'))::integer,
         (count(*) filter (where m.match_status = 'cancelled'))::integer,
         (count(*) filter (where m.match_status = 'completed'))::integer,
         (count(*) filter (where m.match_status = 'scheduled'))::integer,
         (count(*) filter (where m.match_status = 'draft'))::integer,
         (count(*) filter (where e.event_code = 'GS3-ES-SM'))::integer,
         (count(*) filter (where e.event_code = 'GS3-ES-SF'))::integer
  into v_match_count, v_group_count, v_knockout_count, v_cancelled_count, v_completed_count,
       v_scheduled_count, v_draft_count, v_men_count, v_women_count
  from public.sports_esports_matches m
  join public.sports_events e on e.id = m.event_id
  where m.competition_id = v_competition_id and e.event_code in ('GS3-ES-SM','GS3-ES-SF');

  select count(*)::integer into v_history_count
  from public.sports_esports_match_history h
  join public.sports_events e on e.id = h.event_id
  where h.competition_id = v_competition_id and e.event_code in ('GS3-ES-SM','GS3-ES-SF');

  -- Updated timestamps change whenever a match is modified (migration 0004 trigger).
  select md5(coalesce(string_agg(m.id::text || ':' || m.updated_at::text || ':' || m.match_status,
                                  ';' order by m.id), '') || ':' || v_history_count::text)
    into v_fingerprint
  from public.sports_esports_matches m
  join public.sports_events e on e.id = m.event_id
  where m.competition_id = v_competition_id and e.event_code in ('GS3-ES-SM','GS3-ES-SF');

  v_preview := jsonb_build_object(
    'matches', v_match_count,
    'group_matches', v_group_count,
    'knockout_matches', v_knockout_count,
    'cancelled', v_cancelled_count,
    'completed', v_completed_count,
    'scheduled', v_scheduled_count,
    'draft', v_draft_count,
    'male_matches', v_men_count,
    'female_matches', v_women_count,
    'history_entries', v_history_count,
    'fingerprint', v_fingerprint
  );

  if p_action = 'preview' then return v_preview; end if;

  if p_expected_fingerprint is null or p_expected_fingerprint is distinct from v_fingerprint then
    raise exception 'ข้อมูลการแข่งขันเปลี่ยนหลังจากตรวจสอบ กรุณากดตรวจสอบรายการอีกครั้ง';
  end if;
  if v_match_count = 0 then raise exception 'ไม่พบคู่ RoV สำหรับรีเซต'; end if;

  -- Capture a full pre-reset copy, including ALL match changes and the existing history.
  select jsonb_build_object(
    'competition', (select to_jsonb(c) from public.sports_competitions c where c.id = v_competition_id),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.event_code), '[]'::jsonb)
               from public.sports_events e
               where e.competition_id = v_competition_id and e.event_code in ('GS3-ES-SM','GS3-ES-SF')),
    'groups', (select coalesce(jsonb_agg(to_jsonb(g) order by g.event_id,g.sort_order), '[]'::jsonb)
               from public.sports_esports_groups g
               where g.competition_id = v_competition_id and g.event_id in (
                 select id from public.sports_events where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'))),
    'teams', (select coalesce(jsonb_agg(to_jsonb(t) order by t.event_id,t.seed_order), '[]'::jsonb)
              from public.sports_esports_group_teams t
              where t.competition_id = v_competition_id and t.event_id in (
                select id from public.sports_events where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'))),
    'matches', (select coalesce(jsonb_agg(to_jsonb(m) order by m.event_id,m.match_no), '[]'::jsonb)
                from public.sports_esports_matches m
                where m.competition_id = v_competition_id and m.event_id in (
                  select id from public.sports_events where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'))),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.id), '[]'::jsonb)
                from public.sports_esports_match_history h
                where h.competition_id = v_competition_id and h.event_id in (
                  select id from public.sports_events where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF')))
  ) into v_snapshot;

  insert into public.sports_esports_prelaunch_reset_archives (
    competition_id, archived_by, match_count, history_count, snapshot
  ) values (
    v_competition_id, auth.uid(), v_match_count, v_history_count, v_snapshot
  ) returning id into v_archive_id;

  perform set_config('app.esports_reason', 'ล้างข้อมูลทดสอบก่อนเริ่มแข่งขันจริง (มีสำเนาในคลังสำรอง)', true);

  -- All group fixtures revert to DRAFT to avoid accidentally publishing unapproved schedules.
  -- Keep participants, dates, times, play order, stage, venue and bracket routing.
  -- Knockout reverts to a clean skeleton: no participant/result/schedule assignments.
  update public.sports_esports_matches m
  set match_status = 'draft',
      score1 = null,
      score2 = null,
      duration_minutes = null,
      team1_kills = null,
      team2_kills = null,
      notes = '',
      team1_id = case when m.stage = 'group' then m.team1_id else null::uuid end,
      team2_id = case when m.stage = 'group' then m.team2_id else null::uuid end,
      scheduled_date = case when m.stage = 'group' then m.scheduled_date else null::date end,
      start_time = case when m.stage = 'group' then m.start_time else null::time end,
      play_order = case when m.stage = 'group' then m.play_order else null::integer end
  where m.competition_id = v_competition_id
    and m.event_id in (
      select id from public.sports_events
      where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'));

  -- History trigger records reset updates; hide BOTH the old test history and reset traffic
  -- after they are protected in the archive / reset-log table.
  delete from public.sports_esports_match_history h
  where h.competition_id = v_competition_id
    and h.event_id in (
      select id from public.sports_events
      where competition_id = v_competition_id and event_code in ('GS3-ES-SM','GS3-ES-SF'));

  return v_preview || jsonb_build_object('reset_complete', true, 'archive_id', v_archive_id);
end;
$$;


-- Keep the original no-consecutive-matches validation for delegated administrators.
create or replace function public.sports_esports_assign_pending_play_order(
  p_event_id uuid, p_match_ids uuid[], p_reason text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  pending_ids uuid[];
  supplied_ids uuid[];
  conflict_pair text;
begin
  if not exists (
    select 1 from public.sports_events e
    where e.id = p_event_id and e.event_code in ('GS3-ES-SM','GS3-ES-SF')
      and public.sports_esports_can_edit_event(e.competition_id,e.id)
  ) then
    raise exception 'ไม่มีสิทธิ์จัดลำดับการแข่งขันรายการนี้' using errcode = '42501';
  end if;

  -- The event lock also serializes inserts referencing this event.
  perform 1 from public.sports_events where id = p_event_id for update;
  perform 1 from public.sports_esports_matches
    where event_id = p_event_id order by id for update;

  select array_agg(id order by id) into pending_ids
    from public.sports_esports_matches
    where event_id = p_event_id and stage = 'group' and match_status = 'draft'
      and scheduled_date is null and start_time is null;
  select array_agg(id order by id) into supplied_ids from unnest(p_match_ids) ids(id);
  if pending_ids is null or supplied_ids is distinct from pending_ids then
    raise exception 'รายการคู่ฉบับร่างเปลี่ยนแปลงหรือไม่ครบ โปรดโหลดตารางใหม่';
  end if;

  with fixtures as (
    select ord, m.match_no, array[btrim(a.school_name), btrim(b.school_name)] as schools
    from unnest(p_match_ids) with ordinality ids(id, ord)
    join public.sports_esports_matches m on m.id = ids.id
    join public.sports_esports_group_teams a on a.id = m.team1_id
    join public.sports_esports_group_teams b on b.id = m.team2_id
  )
  select prev.match_no || ' / ' || curr.match_no into conflict_pair
    from fixtures curr join fixtures prev on prev.ord = curr.ord - 1
    where prev.schools && curr.schools order by curr.ord limit 1;
  if conflict_pair is not null then
    raise exception 'โรงเรียนลงสนามติดกันในคู่ % กรุณาจัดลำดับใหม่', conflict_pair;
  end if;

  perform set_config('app.esports_reason',
    coalesce(nullif(btrim(p_reason), ''), 'จัดลำดับคู่ฉบับร่างเพื่อเว้นพัก'), true);
  update public.sports_esports_matches m set play_order = ids.ord::integer
    from unnest(p_match_ids) with ordinality ids(id, ord)
    where m.id = ids.id and m.play_order is distinct from ids.ord;
end;
$$;

-- Read approved RoV rosters exactly as the principal E-Sport admin does.
create or replace function public.sports_roster_details(p_entry uuid,p_team uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.sports_entries%rowtype;
begin
 select * into e from public.sports_entries where
 (p_team is null and id=p_entry) or (p_entry is null and esports_team_id=p_team and status='approved');
 if not found then return null; end if;
 if not public.sports_stage3_admin(e.competition_id)
    and not exists (
      select 1 from public.sports_events ev
      where ev.id=e.event_id and ev.competition_id=e.competition_id
        and ev.event_code in ('GS3-ES-SM','GS3-ES-SF')
        and public.sports_esports_can_edit_event(e.competition_id,ev.id)
    )
    and not exists(
 select 1 from public.sports_user_roles where user_id=auth.uid() and is_active and role='school_manager'
 and school_id=e.school_id and (competition_id is null or competition_id=e.competition_id)
 ) then return null; end if;
 return jsonb_build_object('coach',e.coach_name,'assistant',e.assistant_coach,'coaches',(select s.coaches from public.sports_roster_staff s where s.entry_id=e.id),'players',coalesce((
 select jsonb_agg(jsonb_build_object('student_code',a.student_code,'full_name',a.full_name,'grade_level',a.grade_level,'gender',a.gender,'ign',a.ign,'team_role',a.team_role,'play_position',a.play_position)
 order by a.roster_position nulls last,a.full_name) from public.sports_athletes a where a.entry_id=e.id),'[]'::jsonb));
end $$;

-- Keep the bucket private while giving delegated RoV admins the same photo access.
create or replace function public.sports_photo_object_permitted(p_path text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  candidate_entry uuid;
  entry_record record;
begin
  if auth.uid() is null then return false; end if;
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-9]|[1-9][0-9]|1[0-9][0-9]|200)-[0-9a-f]{20}\.jpg$'
  then return false; end if;
  candidate_entry := split_part(p_path,'/',1)::uuid;
  select en.competition_id, en.school_id, en.status, en.event_id
    into entry_record
    from public.sports_entries en
    join public.sports_events ev on ev.id = en.event_id
   where en.id = candidate_entry;
  if not found then return false; end if;

  if public.sports_stage3_admin(entry_record.competition_id) then return true; end if;
  -- Delegation is strictly limited to the two RoV events; photo access for
  -- every other sport continues to require principal admin or school owner.
  if exists (
    select 1 from public.sports_events ev
    where ev.id = entry_record.event_id and ev.competition_id = entry_record.competition_id
      and ev.event_code in ('GS3-ES-SM','GS3-ES-SF')
      and public.sports_esports_can_edit_event(entry_record.competition_id,ev.id)
  ) then return true; end if;
  if p_write and entry_record.status not in ('submitted','rejected','approved') then return false; end if;

  return exists (
    select 1 from public.sports_user_roles r
     where r.user_id = auth.uid() and r.is_active = true
       and r.role = 'school_manager' and r.school_id = entry_record.school_id
       and (r.competition_id is null or r.competition_id = entry_record.competition_id)
  );
end; $$;

commit;
