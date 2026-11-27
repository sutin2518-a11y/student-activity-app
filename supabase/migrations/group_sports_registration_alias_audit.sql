-- Read-only audit: checks deployed registration RPCs for the known a/jsonb alias collision.
-- This is a targeted check, not a full SQL validator or a test registration.
WITH targets(sport, signature) AS (
  VALUES
    ('ฟุตบอล (wrapper)', 'public.sports_football_register_v3333(uuid,uuid,uuid,jsonb,jsonb)'),
    ('ฟุตบอล (core)', 'public.sports_football_register(uuid,uuid,jsonb,jsonb)'),
    ('ฟุตซอล', 'public.sports_futsal_register(uuid,uuid,jsonb,jsonb)'),
    ('บาสเกตบอล', 'public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'),
    ('วอลเลย์บอล', 'public.sports_volleyball_save_form(uuid,uuid,uuid,text,text,text,jsonb,jsonb)'),
    ('เซปักตะกร้อ', 'public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'),
    ('เทเบิลเทนนิส', 'public.sports_tt_save_form(uuid,uuid,uuid,jsonb,jsonb,text)'),
    ('เปตอง / RoV / มวย / กรีฑา (shared)', 'public.sports_register_roster(uuid,uuid,uuid,text,text,text,jsonb,jsonb)'),
    ('กีฬาเดี่ยว / กรีฑา (batch)', 'public.sports_register_individual_batch(uuid,uuid,text,jsonb,jsonb)')
), defs AS (
  SELECT sport, signature, to_regprocedure(signature) AS rpc FROM targets
)
SELECT d.sport, d.signature,
       CASE WHEN p.oid IS NULL THEN 'MISSING'
            WHEN p.prosrc ~* $re$\ma\s+jsonb\M$re$
             AND p.prosrc ~* $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\M$re$
            THEN 'CHECK_ALIAS_A'
            ELSE 'NO_KNOWN_ALIAS_A_COLLISION'
       END AS alias_check,
       CASE WHEN p.oid IS NULL THEN NULL
            ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END AS authenticated_execute
FROM defs d LEFT JOIN pg_catalog.pg_proc p ON p.oid=d.rpc::oid
ORDER BY d.sport;
