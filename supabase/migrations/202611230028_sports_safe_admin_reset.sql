-- v33.4. Install-only: DOES NOT delete any data on execution.
-- Admin-only, pre-competition, preview/confirm reset for athlete registrations and trial results.
-- IMPORTANT: test on a staging clone and create a Supabase DB backup before first reset.
begin;

create table if not exists public.sports_admin_reset_archives (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  reset_scope text not null check(reset_scope in ('entry','event','competition')),
  target_id uuid,
  reset_by uuid references auth.users(id) on delete set null,
  reset_at timestamptz not null default now(),
  snapshot jsonb not null,
  counts jsonb not null
);
create index if not exists sports_admin_reset_archives_comp_idx on public.sports_admin_reset_archives(competition_id,reset_at desc);
alter table public.sports_admin_reset_archives enable row level security;
revoke all on public.sports_admin_reset_archives from public,anon,authenticated;
grant select on public.sports_admin_reset_archives to authenticated;
drop policy if exists sports_admin_reset_archives_read on public.sports_admin_reset_archives;
create policy sports_admin_reset_archives_read on public.sports_admin_reset_archives for select to authenticated
 using(public.sports_stage3_admin(competition_id));

-- Physical photo objects must be removed by Storage API (never DELETE directly from storage.objects).
create table if not exists public.sports_admin_reset_photo_queue (
  archive_id uuid not null references public.sports_admin_reset_archives(id) on delete restrict,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  object_path text not null,
  removed_at timestamptz,
  primary key(archive_id,object_path)
);
alter table public.sports_admin_reset_photo_queue enable row level security;
revoke all on public.sports_admin_reset_photo_queue from public,anon,authenticated;

create or replace function public.sports_admin_reset_photo_allowed(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from public.sports_admin_reset_photo_queue q
  where q.object_path=p_path and q.removed_at is null
    and public.sports_stage3_admin(q.competition_id)
 );
$$;
revoke all on function public.sports_admin_reset_photo_allowed(text) from public,anon;
grant execute on function public.sports_admin_reset_photo_allowed(text) to authenticated;
-- Existing non-reset photo policies remain unchanged. Admin can clean only queued objects.
drop policy if exists sports_admin_reset_photo_select on storage.objects;
create policy sports_admin_reset_photo_select on storage.objects for select to authenticated
 using(bucket_id='sports-athlete-photos' and public.sports_admin_reset_photo_allowed(name));
drop policy if exists sports_admin_reset_photo_delete on storage.objects;
create policy sports_admin_reset_photo_delete on storage.objects for delete to authenticated
 using(bucket_id='sports-athlete-photos' and public.sports_admin_reset_photo_allowed(name));

create or replace function public.sports_admin_reset_pending_photos(p_archive uuid)
returns text[] language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid;
begin
 select competition_id into v_comp from public.sports_admin_reset_archives where id=p_archive;
 if v_comp is null or not public.sports_stage3_admin(v_comp) then
  raise exception 'ไม่มีสิทธิ์ดูรายการรูปที่ต้องลบ' using errcode='42501'; end if;
 return array(select object_path from public.sports_admin_reset_photo_queue
   where archive_id=p_archive and removed_at is null order by object_path);
end $$;
revoke all on function public.sports_admin_reset_pending_photos(uuid) from public,anon;
grant execute on function public.sports_admin_reset_pending_photos(uuid) to authenticated;

create or replace function public.sports_admin_reset_ack_photos(p_archive uuid,p_paths text[])
returns integer language plpgsql security definer set search_path='' as $$
declare v_comp uuid; v_count int;
begin
 select competition_id into v_comp from public.sports_admin_reset_archives where id=p_archive;
 if v_comp is null or not public.sports_stage3_admin(v_comp) then
  raise exception 'ไม่มีสิทธิ์บันทึกสถานะรูป' using errcode='42501'; end if;
 update public.sports_admin_reset_photo_queue set removed_at=now()
 where archive_id=p_archive and object_path=any(coalesce(p_paths,'{}'::text[])) and removed_at is null;
 get diagnostics v_count=row_count;
 return v_count;
end $$;
revoke all on function public.sports_admin_reset_ack_photos(uuid,text[]) from public,anon;
grant execute on function public.sports_admin_reset_ack_photos(uuid,text[]) to authenticated;

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
 v_issued int;
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
    from public.sports_certificates_issued x where x.event_id=any(v_events)),
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
 v_issued:=(v_counts->>'issued_certificates')::int;
 v_result_count:=(v_counts->>'match_results')::int+(v_counts->>'event_results')::int+
  (v_counts->>'medals')::int;

 if p_scope='entry' and (v_issued>0 or v_result_count>0 or
    exists(select 1 from public.sports_certificate_placements where event_id=any(v_events)) or
    exists(select 1 from public.sports_football_matches where event_id=any(v_events) and status='completed') or
    exists(select 1 from public.sports_esports_matches where event_id=any(v_events) and match_status='completed')) then
   raise exception 'รายการนี้มีผลแข่งขัน/เกียรติบัตรแล้ว กรุณาตรวจสอบก่อนลบใบสมัคร หรือใช้รีเซตเฉพาะรายการ';
 end if;
 if p_action='preview' then
  return jsonb_build_object('scope',p_scope,'target',p_target,'counts',v_counts,
   'fingerprint',v_fingerprint,'can_reset',v_issued=0 and
    (clock_timestamp() at time zone 'Asia/Bangkok')::date < date '2026-11-30',
   'note',case when v_issued>0 then 'มีเกียรติบัตรออกแล้ว จึงไม่อนุญาตให้รีเซต' else '' end);
 end if;
 if v_issued>0 then raise exception 'รายการนี้มีเกียรติบัตรออกแล้ว ห้ามรีเซต ต้องดำเนินการเพิกถอนอย่างเป็นทางการก่อน'; end if;
 if p_expected_fingerprint is distinct from v_fingerprint then
  raise exception 'ข้อมูลเปลี่ยนหลังตรวจสอบ กรุณากดดูข้อมูลที่จะลบใหม่'; end if;

 insert into public.sports_admin_reset_archives(competition_id,reset_scope,target_id,reset_by,snapshot,counts)
 values(v_comp,p_scope,p_target,auth.uid(),v_snapshot,v_counts) returning id into v_archive;
 insert into public.sports_admin_reset_photo_queue(archive_id,competition_id,object_path)
 select v_archive,v_comp,path.value #>> '{}' from jsonb_array_elements(v_snapshot->'photo_paths') path(value);

 if p_scope='entry' then
  -- Single registration: no match scores or certificates may exist (checked above).
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
commit;
notify pgrst,'reload schema';
