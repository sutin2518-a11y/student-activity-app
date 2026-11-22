-- v30.3: Admin-only, preview-first reset of E-Sport test match data before the 2026 competition.
-- No athlete registrations, schools, groups, team assignments or group fixture dates are deleted.
-- Historical data is copied into an admin-only archive BEFORE resetting and clearing visible history.
-- Execute after migrations 0004, 0005, 0006. This migration INSTALLS a tool: it does not reset data.
begin;

create table if not exists public.sports_esports_prelaunch_reset_archives (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  archived_at timestamptz not null default now(),
  archived_by uuid references auth.users(id) on delete set null,
  match_count integer not null,
  history_count integer not null,
  snapshot jsonb not null
);

create index if not exists sports_esports_prelaunch_reset_archives_competition_idx
  on public.sports_esports_prelaunch_reset_archives(competition_id, archived_at desc);

alter table public.sports_esports_prelaunch_reset_archives enable row level security;
revoke all on public.sports_esports_prelaunch_reset_archives from public, anon, authenticated;
grant select on public.sports_esports_prelaunch_reset_archives to authenticated;
drop policy if exists "esports reset archive admin read" on public.sports_esports_prelaunch_reset_archives;
create policy "esports reset archive admin read"
  on public.sports_esports_prelaunch_reset_archives for select to authenticated
  using (public.sports_stage3_admin(competition_id));

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

  if v_competition_id is null or not public.sports_stage3_admin(v_competition_id) then
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

revoke all on function public.sports_esports_prelaunch_reset(text,text,text)
  from public, anon, authenticated;
grant execute on function public.sports_esports_prelaunch_reset(text,text,text)
  to authenticated;

commit;
