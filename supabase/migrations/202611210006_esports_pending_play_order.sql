begin;

alter table public.sports_esports_matches
  add column if not exists play_order integer check (play_order > 0);

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
      and public.sports_stage3_admin(e.competition_id)
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

revoke all on function public.sports_esports_assign_pending_play_order(uuid,uuid[],text)
  from public, anon, authenticated;
grant execute on function public.sports_esports_assign_pending_play_order(uuid,uuid[],text)
  to authenticated;

commit;
