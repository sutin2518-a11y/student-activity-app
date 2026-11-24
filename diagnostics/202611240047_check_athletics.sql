-- Read-only diagnostics. Expected: 84 slots, 54 distinct events, 30 qualifying, 54 final.
select count(*) as total_sessions,count(distinct r.event_id) as distinct_events,
 count(*) filter(where r.phase='qualifying') as qualifying,count(*) filter(where r.phase='final') as finals,
 count(*) filter(where ss.start_time-ss.report_time=interval '30 minutes') as report_30_min
from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id
join public.sports_competitions c on c.id=ss.competition_id where c.slug='phayao-secondary-group-sports-2569';
select ss.session_date,count(*) as total,count(*) filter(where ss.status='draft') as drafts,count(*) filter(where ss.status='published') as published
from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id join public.sports_competitions c on c.id=ss.competition_id where c.slug='phayao-secondary-group-sports-2569' group by ss.session_date order by ss.session_date;
select e.event_code,e.sport_name from public.sports_events e join public.sports_competitions c on c.id=e.competition_id where c.slug='phayao-secondary-group-sports-2569' and e.event_code like 'GS3-AT-%' and not exists(select 1 from public.sports_ath_rounds r where r.event_id=e.id) order by e.event_code;

-- Item 109 must be final, with the original date and times.
select ss.session_number,e.sport_name,ss.session_date,ss.report_time,ss.start_time,ss.round_name,r.phase
from public.sports_ath_rounds r join public.sports_schedule_sessions ss on ss.id=r.session_id join public.sports_events e on e.id=r.event_id join public.sports_competitions c on c.id=ss.competition_id
where c.slug='phayao-secondary-group-sports-2569' and ss.session_number='109';
