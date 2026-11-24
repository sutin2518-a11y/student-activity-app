-- Read only, run after migration 046.
SELECT count(*) AS boxing_events
FROM public.sports_events e JOIN public.sports_competitions c ON c.id=e.competition_id
WHERE c.slug='phayao-secondary-group-sports-2569' AND e.event_code ~ '^GS3-BX-(36|39|42|45|48|51|54|57|60|64|67|71|75)[MF]$';
SELECT e.event_code,e.status,count(b.id) FILTER(WHERE b.status<>'bye') AS bouts,count(b.id) FILTER(WHERE b.status='bye') AS byes,count(b.id) FILTER(WHERE b.status='completed') AS completed
FROM public.sports_events e JOIN public.sports_competitions c ON c.id=e.competition_id LEFT JOIN public.sports_boxing_bouts b ON b.event_id=e.id
WHERE c.slug='phayao-secondary-group-sports-2569' AND e.event_code LIKE 'GS3-BX-%'
GROUP BY e.id,e.event_code,e.status ORDER BY e.event_code;
