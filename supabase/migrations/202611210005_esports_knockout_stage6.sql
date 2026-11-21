-- Stage 6: Editable E-Sport Knockout bracket with confirmation, downstream reset,
-- automatic winner/loser advancement, and immutable match-change history.
-- Apply after Stage 4 (202611210004_esports_management.sql) and Stage 5.
-- This migration does not alter existing group fixtures or their saved results.

begin;

-- Knockout rounds begin with unresolved slots. Group-stage matches must still have both teams.
alter table public.sports_esports_matches
  alter column team1_id drop not null,
  alter column team2_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sports_esports_matches'::regclass
      and conname = 'sports_esports_group_slots_required'
  ) then
    alter table public.sports_esports_matches
      add constraint sports_esports_group_slots_required
      check (stage <> 'group' or (team1_id is not null and team2_id is not null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sports_esports_matches'::regclass
      and conname = 'sports_esports_completed_slots_required'
  ) then
    alter table public.sports_esports_matches
      add constraint sports_esports_completed_slots_required
      check (match_status <> 'completed' or (team1_id is not null and team2_id is not null));
  end if;

end $$;

alter table public.sports_esports_matches
  add column if not exists winner_next_match_id uuid,
  add column if not exists winner_next_slot smallint,
  add column if not exists loser_next_match_id uuid,
  add column if not exists loser_next_slot smallint;

-- Add route constraints after columns exist (the first DO block is intentionally followed
-- by this idempotent constraint block for databases applying the migration from scratch).
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.sports_esports_matches'::regclass and conname='sports_esports_winner_route_check') then
    alter table public.sports_esports_matches add constraint sports_esports_winner_route_check
      check ((winner_next_match_id is null and winner_next_slot is null) or (winner_next_match_id is not null and winner_next_slot in (1,2)));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.sports_esports_matches'::regclass and conname='sports_esports_loser_route_check') then
    alter table public.sports_esports_matches add constraint sports_esports_loser_route_check
      check ((loser_next_match_id is null and loser_next_slot is null) or (loser_next_match_id is not null and loser_next_slot in (1,2)));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.sports_esports_matches'::regclass and conname='sports_esports_winner_route_fk') then
    alter table public.sports_esports_matches add constraint sports_esports_winner_route_fk
      foreign key (competition_id,event_id,winner_next_match_id)
      references public.sports_esports_matches(competition_id,event_id,id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.sports_esports_matches'::regclass and conname='sports_esports_loser_route_fk') then
    alter table public.sports_esports_matches add constraint sports_esports_loser_route_fk
      foreign key (competition_id,event_id,loser_next_match_id)
      references public.sports_esports_matches(competition_id,event_id,id) not valid;
  end if;
end $$;

create unique index if not exists sports_esports_winner_route_slot_uidx
  on public.sports_esports_matches(winner_next_match_id,winner_next_slot)
  where winner_next_match_id is not null;
create unique index if not exists sports_esports_loser_route_slot_uidx
  on public.sports_esports_matches(loser_next_match_id,loser_next_slot)
  where loser_next_match_id is not null;

-- Immutable audit snapshots. No foreign key to match_id: history survives any later cleanup.
create table if not exists public.sports_esports_match_history (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  event_id uuid not null,
  match_id uuid,
  match_no text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  reason text not null default 'แก้ไขข้อมูลการแข่งขัน',
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb,
  foreign key (competition_id,event_id)
    references public.sports_events(competition_id,id) on delete cascade
);

create index if not exists sports_esports_history_event_time_idx
  on public.sports_esports_match_history(competition_id,event_id,changed_at desc);
create index if not exists sports_esports_history_match_time_idx
  on public.sports_esports_match_history(match_id,changed_at desc);

alter table public.sports_esports_match_history enable row level security;
revoke all privileges on public.sports_esports_match_history from public,anon,authenticated;
grant select on public.sports_esports_match_history to authenticated;

drop policy if exists "esports match history admin read" on public.sports_esports_match_history;
create policy "esports match history admin read"
  on public.sports_esports_match_history for select to authenticated
  using (public.sports_stage3_admin(competition_id));

create or replace function public.sports_esports_capture_match_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competition_id uuid;
  v_event_id uuid;
  v_match_id uuid;
  v_match_no text;
  v_action text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_reason text;
begin
  if tg_op = 'DELETE' then
    v_competition_id := old.competition_id;
    v_event_id := old.event_id;
    v_match_id := old.id;
    v_match_no := old.match_no;
    v_action := 'DELETE';
    v_old_data := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_competition_id := new.competition_id;
    v_event_id := new.event_id;
    v_match_id := new.id;
    v_match_no := new.match_no;
    v_action := 'INSERT';
    v_new_data := to_jsonb(new);
  else
    if to_jsonb(new) is not distinct from to_jsonb(old) then
      return new;
    end if;
    v_competition_id := new.competition_id;
    v_event_id := new.event_id;
    v_match_id := new.id;
    v_match_no := new.match_no;
    v_action := 'UPDATE';
    v_old_data := to_jsonb(old);
    v_new_data := to_jsonb(new);
  end if;

  v_reason := nullif(btrim(current_setting('app.esports_reason', true)), '');
  insert into public.sports_esports_match_history(
    competition_id,event_id,match_id,match_no,action,reason,changed_by,old_data,new_data
  ) values (
    v_competition_id,v_event_id,v_match_id,v_match_no,v_action,
    coalesce(v_reason,'แก้ไขข้อมูลการแข่งขัน'),auth.uid(),v_old_data,v_new_data
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sports_esports_matches_history on public.sports_esports_matches;
create trigger sports_esports_matches_history
after insert or update or delete on public.sports_esports_matches
for each row execute function public.sports_esports_capture_match_history();

-- Preserve a baseline snapshot of the existing fixtures/results before Stage 6 is enabled.
insert into public.sports_esports_match_history(
  competition_id,event_id,match_id,match_no,action,reason,changed_by,old_data,new_data
)
select m.competition_id,m.event_id,m.id,m.match_no,'INSERT',
  'สำรองข้อมูลตั้งต้นก่อนเปิดใช้ Stage 6',null,null,to_jsonb(m)
from public.sports_esports_matches m
where not exists (
  select 1 from public.sports_esports_match_history h
  where h.match_id = m.id and h.reason = 'สำรองข้อมูลตั้งต้นก่อนเปิดใช้ Stage 6'
);

-- Clear only the downstream slots fed by the changed match and all later dependent slots.
-- The other participant in a downstream match is retained when it comes from an unaffected feeder.
create or replace function public.sports_esports_invalidate_downstream(
  p_source_match_id uuid,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  perform set_config('app.esports_reason', coalesce(nullif(btrim(p_reason),''),'ผลการแข่งขันต้นทางมีการเปลี่ยนแปลง'), true);

  with recursive affected(match_id, slot_no, path) as (
    select route.child_id, route.slot_no, array[src.id,route.child_id]::uuid[]
    from public.sports_esports_matches src
    cross join lateral (values
      (src.winner_next_match_id,src.winner_next_slot),
      (src.loser_next_match_id,src.loser_next_slot)
    ) as route(child_id,slot_no)
    where src.id = p_source_match_id
      and route.child_id is not null
      and route.slot_no is not null

    union all

    select route.child_id, route.slot_no, affected.path || route.child_id
    from affected
    join public.sports_esports_matches parent on parent.id = affected.match_id
    cross join lateral (values
      (parent.winner_next_match_id,parent.winner_next_slot),
      (parent.loser_next_match_id,parent.loser_next_slot)
    ) as route(child_id,slot_no)
    where route.child_id is not null
      and route.slot_no is not null
      and not route.child_id = any(affected.path)
  ), affected_slots as (
    select match_id,
      bool_or(slot_no = 1) as clear_team1,
      bool_or(slot_no = 2) as clear_team2
    from affected
    group by match_id
  )
  update public.sports_esports_matches target
  set team1_id = case when affected_slots.clear_team1 then null::uuid else target.team1_id end,
      team2_id = case when affected_slots.clear_team2 then null::uuid else target.team2_id end,
      match_status = 'draft',
      score1 = null,
      score2 = null,
      duration_minutes = null,
      team1_kills = null,
      team2_kills = null
  from affected_slots
  where target.id = affected_slots.match_id
    and (
      (affected_slots.clear_team1 and target.team1_id is not null)
      or (affected_slots.clear_team2 and target.team2_id is not null)
      or target.match_status <> 'draft'
      or target.score1 is not null or target.score2 is not null
      or target.duration_minutes is not null
      or target.team1_kills is not null or target.team2_kills is not null
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.sports_esports_invalidate_downstream(uuid,text) from public,anon,authenticated;

-- Create the men's 8-team knockout skeleton. Pairings are intentionally left unassigned:
-- the organizer selects the qualified teams according to the official bracket draw.
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
  if not public.sports_stage3_admin(v_competition_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
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

-- Change a knockout pairing. The old result and all dependent downstream results are
-- snapshotted first; the edited match returns to draft and its dependent slots are reset.
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
  if not public.sports_stage3_admin(v_match.competition_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
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

-- Save schedule/result for a knockout match. If the winner or loser feeding another round
-- changes, only the affected slots and their downstream results are invalidated.
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
  if not public.sports_stage3_admin(v_match.competition_id) then raise exception 'ไม่มีสิทธิ์จัดการการแข่งขัน'; end if;
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

-- Knockout rows must be changed through the RPCs above so downstream propagation cannot be bypassed.
drop policy if exists "esports matches update" on public.sports_esports_matches;
create policy "esports matches update"
  on public.sports_esports_matches for update to authenticated
  using (public.sports_stage3_admin(competition_id) and stage = 'group')
  with check (public.sports_stage3_admin(competition_id) and stage = 'group');

drop policy if exists "esports matches insert" on public.sports_esports_matches;
create policy "esports matches insert"
  on public.sports_esports_matches for insert to authenticated
  with check (public.sports_stage3_admin(competition_id) and stage = 'group');

drop policy if exists "esports matches delete draft" on public.sports_esports_matches;
create policy "esports matches delete draft"
  on public.sports_esports_matches for delete to authenticated
  using (public.sports_stage3_admin(competition_id) and stage = 'group' and match_status = 'draft');

revoke all on function public.sports_esports_generate_knockout(uuid) from public,anon,authenticated;
revoke all on function public.sports_esports_update_knockout_teams(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.sports_esports_save_knockout_match(uuid,date,time,text,text,smallint,smallint,numeric,integer,integer,text) from public,anon,authenticated;
grant execute on function public.sports_esports_generate_knockout(uuid) to authenticated;
grant execute on function public.sports_esports_update_knockout_teams(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.sports_esports_save_knockout_match(uuid,date,time,text,text,smallint,smallint,numeric,integer,integer,text) to authenticated;

commit;
