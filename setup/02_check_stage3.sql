-- Read-only: expected 122 events, 571 sessions, 84 athletics sessions, 0 published on first install.
select c.slug,
 (select count(*) from public.sports_events e where e.competition_id=c.id and e.event_code like 'GS3-%') as imported_events,
 (select count(*) from public.sports_schedule_sessions s where s.competition_id=c.id and s.seed_key is not null) as imported_sessions,
 (select count(*) from public.sports_schedule_sessions s join public.sports_events e on e.id=s.event_id where s.competition_id=c.id and e.event_type='athletics') as athletics_sessions,
 (select count(*) from public.sports_schedule_sessions s where s.competition_id=c.id and s.status='draft') as drafts,
 (select count(*) from public.sports_schedule_sessions s where s.competition_id=c.id and s.status='published') as published,
 (select relrowsecurity from pg_class where oid=to_regclass('public.sports_schedule_sessions')) as schedule_rls,
 has_table_privilege('anon','public.sports_schedule_sessions','INSERT') as anon_insert_should_be_false,
 has_function_privilege('anon','public.sports_stage3_publish(uuid,uuid[])','EXECUTE') as anon_publish_should_be_false
from public.sports_competitions c where c.slug='phayao-secondary-group-sports-2569';
