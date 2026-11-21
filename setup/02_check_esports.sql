-- Stage 4 E-Sport verification (read-only).
select
  e.event_code,
  e.sport_name,
  count(distinct g.id) as groups,
  count(distinct t.id) as teams,
  count(distinct m.id) as group_stage_fixtures
from public.sports_competitions c
join public.sports_events e on e.competition_id=c.id
left join public.sports_esports_groups g on g.event_id=e.id
left join public.sports_esports_group_teams t on t.event_id=e.id
left join public.sports_esports_matches m on m.event_id=e.id
where c.slug='phayao-secondary-group-sports-2569'
  and e.event_code in ('GS3-ES-SM','GS3-ES-SF')
group by e.event_code,e.sport_name
order by e.event_code;

select
  count(*) filter (where seed_key like 'ESPORT-2569-%') as esports_schedule_sessions,
  count(*) filter (where seed_key like 'ESPORT-2569-%' and status='draft') as esports_draft_sessions,
  count(*) filter (where seed_key like 'ESPORT-2569-%' and session_date between date '2026-12-05' and date '2026-12-07') as sessions_with_expected_dates
from public.sports_schedule_sessions s
join public.sports_competitions c on c.id=s.competition_id
where c.slug='phayao-secondary-group-sports-2569';
