-- READ ONLY: expected 15F=25, 15M=15, OF=22, OM=31.
select e.event_code,e.sport_name,count(m.id) total_matches,
 count(m.id) filter(where m.status='draft') drafts,
 count(m.id) filter(where not m.volleyball_reviewed or btrim(m.venue_name)='') review_pending
from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
left join public.sports_football_matches m on m.event_id=e.id
where e.event_code like 'GS3-VB-%' and c.slug='phayao-secondary-group-sports-2569'
group by e.id,e.event_code,e.sport_name order by e.event_code;
