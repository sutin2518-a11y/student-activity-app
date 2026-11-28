-- Public aggregate counts only. No roster, names or personal details returned.
-- Uses the same received/approved status as sports_public_overview_counts.
begin;
create or replace function public.sports_school_public_stats_v1(p_comp uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
with eligible as (
  select en.id, en.school_id, en.coach_name, en.assistant_coach,
         split_part(ev.event_code,'-',2) as sport
  from public.sports_entries en
  join public.sports_competitions co on co.id=en.competition_id
  join public.sports_events ev on ev.id=en.event_id and ev.competition_id=co.id
  join public.sports_schools sc on sc.id=en.school_id
  where co.id=p_comp and co.slug='phayao-secondary-group-sports-2569'
    and en.status='approved'
    and ev.event_code ~ '^GS3-(FB|FS|BB|VB|ST|PT|TT|ES|BX|AT)-'
), registrations as (
  select school_id, count(*) as entry_count, count(distinct sport) as sport_count
  from eligible group by school_id
), athlete_names as (
  select e.school_id,
    lower(regexp_replace(regexp_replace(btrim(coalesce(a.full_name,'')),
       '^(เด็กชาย|เด็กหญิง|ด[.]ช[.]|ด[.]ญ[.]|นางสาว|น[.]ส[.]|นาย|นาง)[[:space:]]*','','i'),
       '[[:space:]]+','','g')) as name_key
  from eligible e join public.sports_athletes a on a.entry_id=e.id
), athlete_counts as (
  select school_id, count(*) as athlete_rows, count(distinct nullif(name_key,'')) as athlete_count
  from athlete_names group by school_id
), staff_names as (
  select e.school_id,
    lower(regexp_replace(regexp_replace(btrim(coalesce(s.person->>'name','')),
       '^(เด็กชาย|เด็กหญิง|ด[.]ช[.]|ด[.]ญ[.]|นางสาว|น[.]ส[.]|นาย|นาง)[[:space:]]*','','i'),
       '[[:space:]]+','','g')) as name_key
  from eligible e
  left join public.sports_roster_staff st on st.entry_id=e.id
  cross join lateral jsonb_array_elements(
    case when exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(st.coaches)='array' then st.coaches else '[]'::jsonb end) as c(person)
      where nullif(btrim(c.person->>'name'),'') is not null
    ) then st.coaches else jsonb_build_array(jsonb_build_object('name',e.coach_name),jsonb_build_object('name',e.assistant_coach)) end
  ) as s(person)
  where nullif(btrim(s.person->>'name'),'') is not null
), staff_counts as (
  select school_id, count(*) as staff_rows, count(distinct nullif(name_key,'')) as staff_count
  from staff_names group by school_id
)
select coalesce(jsonb_agg(jsonb_build_object(
  'school_id',r.school_id,'sport_count',r.sport_count,'entry_count',r.entry_count,
  'athlete_count',coalesce(a.athlete_count,0),'athlete_rows',coalesce(a.athlete_rows,0),
  'staff_count',coalesce(s.staff_count,0),'staff_rows',coalesce(s.staff_rows,0)
) order by r.school_id),'[]'::jsonb)
from registrations r
left join athlete_counts a using(school_id)
left join staff_counts s using(school_id);
$$;
revoke all on function public.sports_school_public_stats_v1(uuid) from public, anon, authenticated;
grant execute on function public.sports_school_public_stats_v1(uuid) to anon, authenticated;
commit;
notify pgrst, 'reload schema';
select 'READY' as school_public_stats;
