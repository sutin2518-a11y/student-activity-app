-- Read-only. Run after Migration 045.
SELECT e.event_code, e.sport_name, count(m.id) AS total_matches,
 count(m.id) FILTER (WHERE m.status='draft') AS draft_matches,
 count(m.id) FILTER (WHERE m.status='completed') AS completed_matches
FROM public.sports_events e
JOIN public.sports_competitions c ON c.id=e.competition_id
LEFT JOIN public.sports_football_matches m ON m.event_id=e.id
WHERE c.slug='phayao-secondary-group-sports-2569' AND e.event_code LIKE 'GS3-TT-%'
GROUP BY e.id,e.event_code,e.sport_name ORDER BY e.event_code;
-- Expected: 15 rows, sum total_matches=75.
