-- 057: Repair ambiguous SQL aliases in volleyball registration only.
-- No table data is modified by this migration.
BEGIN;
DO $patch$
DECLARE
  v_oid regprocedure := to_regprocedure('public.sports_volleyball_save_form(uuid,uuid,uuid,text,text,text,jsonb,jsonb)');
  v_def text;
  v_pattern text;
  v_replacement text;
  v_count integer;
  v_i integer;
  v_patterns text[] := ARRAY[
    $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\s+group\s+by\s+\(\s*a\s*->>\s*'jersey_number'\s*\)::int$re$,
    $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\s+group\s+by\s+regexp_replace\s*\(\s*btrim\s*\(\s*a\s*->>\s*'full_name'\s*\)\s*,\s*'\[\[:space:\]\]\+'\s*,\s*''\s*,\s*'g'\s*\)$re$,
    $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\s+join\s+public\.sports_athletes\s+sa\s+on\s+regexp_replace\s*\(\s*btrim\s*\(\s*sa\.full_name\s*\)\s*,\s*'\[\[:space:\]\]\+'\s*,\s*''\s*,\s*'g'\s*\)\s*=\s*regexp_replace\s*\(\s*btrim\s*\(\s*a\s*->>\s*'full_name'\s*\)\s*,\s*'\[\[:space:\]\]\+'\s*,\s*''\s*,\s*'g'\s*\)$re$
  ];
  v_replacements text[] := ARRAY[
    $r$from jsonb_array_elements(p_players) as vb_player(item) group by (vb_player.item->>'jersey_number')::int$r$,
    $r$from jsonb_array_elements(p_players) as vb_player(item) group by regexp_replace(btrim(vb_player.item->>'full_name'),'[[:space:]]+','','g')$r$,
    $r$from jsonb_array_elements(p_players) as vb_player(item) join public.sports_athletes sa on regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(vb_player.item->>'full_name'),'[[:space:]]+','','g')$r$
  ];
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'STOP: volleyball registration function not found; no changes committed';
  END IF;
  v_def := pg_get_functiondef(v_oid::oid);
  -- Idempotent: if all three intended replacements already exist, do nothing.
  IF position(v_replacements[1] in v_def)>0 AND position(v_replacements[2] in v_def)>0 AND position(v_replacements[3] in v_def)>0
     AND v_def !~* $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\M$re$ THEN
    RETURN;
  END IF;
  -- Preserve the actual deployed function, changing only its three conflicting aliases.
  FOR v_i IN 1..3 LOOP
    v_pattern := v_patterns[v_i];
    v_replacement := v_replacements[v_i];
    SELECT count(*) INTO v_count FROM regexp_matches(v_def,v_pattern,'gi');
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'STOP: volleyball RPC differs at check % (matches=%); no changes committed',v_i,v_count;
    END IF;
    v_def := regexp_replace(v_def,v_pattern,v_replacement,'i');
  END LOOP;
  IF v_def ~* $re$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\M$re$ THEN
    RAISE EXCEPTION 'STOP: an unresolved volleyball alias remains; no changes committed';
  END IF;
  EXECUTE v_def;
END;
$patch$;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'READY' AS volleyball_alias_fix;
