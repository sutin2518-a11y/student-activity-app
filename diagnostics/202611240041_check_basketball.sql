-- Read only: 54 fixtures; 7 / 11 / 25 / 11; 7 unresolved review flags initially.
select e.event_code,e.sport_name,count(m.id) as fixtures,
 count(m.id) filter(where m.stage='group') as group_matches,
 count(m.id) filter(where not m.basketball_reviewed) as review_pending,
 count(m.id) filter(where m.scheduled_date is null or m.start_time is null or m.basketball_end_time is null) as time_pending,
 count(m.id) filter(where m.status='published' or m.status='completed') as public_matches
from public.sports_events e join public.sports_competitions c on c.id=e.competition_id left join public.sports_football_matches m on m.event_id=e.id
where c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-BB-15M','GS3-BB-15F','GS3-BB-UM','GS3-BB-UF') group by e.event_code,e.sport_name order by e.event_code;
select to_regprocedure('public.sports_basketball_save_match(uuid,timestamptz,jsonb)') as score_rpc,
 to_regprocedure('public.sports_basketball_publish(uuid)') as publish_rpc;
