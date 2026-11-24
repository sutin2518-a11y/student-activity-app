-- Read-only verification after migration 044.
select e.event_code,e.sport_name,count(m.id) as bracket_slots,
 count(m.id) filter(where m.petanque_bye) as bye_slots,
 count(m.id) filter(where not m.petanque_bye) as real_matches,
 count(m.id) filter(where not m.petanque_bye and m.start_time is null) as missing_time,
 count(m.id) filter(where not m.petanque_reviewed) as review_pending
from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
left join public.sports_football_matches m on m.event_id=e.id
where c.slug='phayao-secondary-group-sports-2569' and e.event_code like 'GS3-PT-%'
group by e.id,e.event_code,e.sport_name order by e.event_code;
