-- Read-only check. Expected 17/22/12 fixtures and 11/13/7 teams.
select e.event_code,e.status,e.max_athletes_per_entry,
 (select count(*) from public.sports_football_group_teams t where t.event_id=e.id) as teams,
 (select count(distinct group_code) from public.sports_football_group_teams t where t.event_id=e.id) as groups,
 (select count(*) from public.sports_football_matches m where m.event_id=e.id) as fixtures,
 (select count(*) from public.sports_football_matches m where m.event_id=e.id and m.status='completed') as completed
from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF') order by e.event_code;
select e.event_code,m.match_no,m.stage,m.scheduled_date,m.start_time,m.team1_name,m.team2_name,m.status
from public.sports_football_matches m join public.sports_events e on e.id=m.event_id join public.sports_competitions c on c.id=e.competition_id
where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-FS-15M','GS3-FS-UM','GS3-FS-UF') order by m.match_no;
