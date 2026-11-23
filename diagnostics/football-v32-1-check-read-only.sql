-- v32.1 ตรวจข้อมูลฟุตบอล (READ ONLY) — ใช้กับ Supabase SQL Editor
-- ไม่มีคำสั่ง INSERT / UPDATE / DELETE / DROP
-- หากพบ ERROR "relation sports_football_matches does not exist" แปลว่ายังไม่ได้ติดตั้ง SQL 0026 ครบ
WITH expected(sort_order,event_code,event_name,expected_matches) AS (
  VALUES
    (1,'GS3-FB-13M','ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย',9),
    (2,'GS3-FB-15M','ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย',17),
    (3,'GS3-FB-UM','ฟุตบอล รุ่นไม่จำกัดอายุ ชาย',16),
    (4,'GS3-FB-UF','ฟุตบอล รุ่นไม่จำกัดอายุ หญิง',9)
)
SELECT x.event_code,
       x.event_name,
       COALESCE(e.status,'ไม่พบรายการใน sports_events') AS event_status,
       x.expected_matches,
       (SELECT count(*) FROM public.sports_football_group_teams t WHERE t.event_id = e.id) AS teams_in_groups,
       (SELECT count(*) FROM public.sports_football_matches m WHERE m.event_id = e.id) AS matches_in_database,
       (SELECT count(*) FROM public.sports_football_matches m WHERE m.event_id = e.id AND m.status = 'draft') AS draft_matches,
       (SELECT count(*) FROM public.sports_football_matches m WHERE m.event_id = e.id AND m.status IN ('published','completed')) AS published_matches
FROM expected x
LEFT JOIN public.sports_competitions c ON c.slug = 'phayao-secondary-group-sports-2569'
LEFT JOIN public.sports_events e ON e.competition_id = c.id AND e.event_code = x.event_code
ORDER BY x.sort_order;
