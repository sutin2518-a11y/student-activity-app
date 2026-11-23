-- v33.11: public aggregate-only school sports statistics for the home dashboard.
-- No personal data, student names, roster IDs or contact details are returned.
-- The function is read-only and restricted to the public 2569 competition.
begin;

create or replace function public.sports_public_overview_counts(p_comp uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_athletes bigint := 0;
  v_entries bigint := 0;
begin
  select c.slug into v_slug from public.sports_competitions c where c.id = p_comp;
  if v_slug is distinct from 'phayao-secondary-group-sports-2569' then
    return jsonb_build_object('athletes',0,'registrations',0);
  end if;
  select count(*) into v_entries
    from public.sports_entries e
    where e.competition_id = p_comp and e.status = 'approved';
  select count(*) into v_athletes
    from public.sports_athletes a
    join public.sports_entries e on e.id = a.entry_id
    where e.competition_id = p_comp and e.status = 'approved';
  return jsonb_build_object('athletes',v_athletes,'registrations',v_entries);
end;
$$;
revoke all on function public.sports_public_overview_counts(uuid) from public;
grant execute on function public.sports_public_overview_counts(uuid) to anon, authenticated;
commit;
notify pgrst, 'reload schema';
