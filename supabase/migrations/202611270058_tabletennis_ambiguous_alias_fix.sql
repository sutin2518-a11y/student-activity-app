-- 058: Table tennis registration alias-only fix (from migration 052).
-- No table data, grants, registration status, or other sport functions changed.
-- Run the entire script. Unexpected deployed definition => rollback.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $patch$
DECLARE
  v_oid regprocedure := to_regprocedure('public.sports_tt_save_form(uuid,uuid,uuid,jsonb,jsonb,text)');
  v_def text;
  v_i integer;
  v_old_count integer;
  v_new_count integer;
  v_changed boolean := false;
  v_old_patterns text[] := ARRAY[
    $q$if\s+exists\(select\s+1\s+from\s+jsonb_array_elements\(p_players\)\s+a\s+group\s+by\s+regexp_replace\(btrim\(a\->>'full_name'\),'\[\[:space:\]\]\+','','g'\)\s+having\s+count\(\*\)>1\)\s+then\s+raise\s+exception\s+'ชื่อผู้เล่นซ้ำในคู่';\s+end\s+if;$q$,
    $q$if\s+exists\(select\s+1\s+from\s+jsonb_array_elements\(p_players\)\s+a\s+where\s+\(select\s+count\(distinct\s+en\.event_id\)\s+from\s+public\.sports_athletes\s+sa\s+join\s+public\.sports_entries\s+en\s+on\s+en\.id=sa\.entry_id\s+join\s+public\.sports_events\s+oe\s+on\s+oe\.id=en\.event_id\s+where\s+en\.competition_id=e\.competition_id\s+and\s+en\.school_id=p_school\s+and\s+en\.id\s+is\s+distinct\s+from\s+p_entry\s+and\s+en\.status<>'withdrawn'\s+and\s+public\.sports_is_tabletennis\(en\.event_id\)\s+and\s+substring\(oe\.event_code\s+from\s+'\^GS3\-TT\-\(13\|15\|U\)'\)=substring\(e\.event_code\s+from\s+'\^GS3\-TT\-\(13\|15\|U\)'\)\s+and\s+regexp_replace\(btrim\(sa\.full_name\),'\[\[:space:\]\]\+','','g'\)=regexp_replace\(btrim\(a\->>'full_name'\),'\[\[:space:\]\]\+','','g'\)\)>=2\)\s+then\s+raise\s+exception\s+'นักกีฬาลงได้ไม่เกิน\ 2\ รายการในรุ่นเดียวกัน';\s+end\s+if;$q$
  ];
  v_new_patterns text[] := ARRAY[
    $q$if\s+exists\(select\s+1\s+from\s+jsonb_array_elements\(p_players\)\s+AS\s+tt_player\(item\)\s+group\s+by\s+regexp_replace\(btrim\(tt_player\.item\->>'full_name'\),'\[\[:space:\]\]\+','','g'\)\s+having\s+count\(\*\)>1\)\s+then\s+raise\s+exception\s+'ชื่อผู้เล่นซ้ำในคู่';\s+end\s+if;$q$,
    $q$if\s+exists\(select\s+1\s+from\s+jsonb_array_elements\(p_players\)\s+AS\s+tt_player\(item\)\s+where\s+\(select\s+count\(distinct\s+en\.event_id\)\s+from\s+public\.sports_athletes\s+sa\s+join\s+public\.sports_entries\s+en\s+on\s+en\.id=sa\.entry_id\s+join\s+public\.sports_events\s+oe\s+on\s+oe\.id=en\.event_id\s+where\s+en\.competition_id=e\.competition_id\s+and\s+en\.school_id=p_school\s+and\s+en\.id\s+is\s+distinct\s+from\s+p_entry\s+and\s+en\.status<>'withdrawn'\s+and\s+public\.sports_is_tabletennis\(en\.event_id\)\s+and\s+substring\(oe\.event_code\s+from\s+'\^GS3\-TT\-\(13\|15\|U\)'\)=substring\(e\.event_code\s+from\s+'\^GS3\-TT\-\(13\|15\|U\)'\)\s+and\s+regexp_replace\(btrim\(sa\.full_name\),'\[\[:space:\]\]\+','','g'\)=regexp_replace\(btrim\(tt_player\.item\->>'full_name'\),'\[\[:space:\]\]\+','','g'\)\)>=2\)\s+then\s+raise\s+exception\s+'นักกีฬาลงได้ไม่เกิน\ 2\ รายการในรุ่นเดียวกัน';\s+end\s+if;$q$
  ];
  v_replacements text[] := ARRAY[
    $q$if exists(select 1 from jsonb_array_elements(p_players) AS tt_player(item) group by regexp_replace(btrim(tt_player.item->>'full_name'),'[[:space:]]+','','g') having count(*)>1) then raise exception 'ชื่อผู้เล่นซ้ำในคู่'; end if;$q$,
    $q$if exists(select 1 from jsonb_array_elements(p_players) AS tt_player(item) where (select count(distinct en.event_id) from public.sports_athletes sa join public.sports_entries en on en.id=sa.entry_id join public.sports_events oe on oe.id=en.event_id where en.competition_id=e.competition_id and en.school_id=p_school and en.id is distinct from p_entry and en.status<>'withdrawn' and public.sports_is_tabletennis(en.event_id) and substring(oe.event_code from '^GS3-TT-(13|15|U)')=substring(e.event_code from '^GS3-TT-(13|15|U)') and regexp_replace(btrim(sa.full_name),'[[:space:]]+','','g')=regexp_replace(btrim(tt_player.item->>'full_name'),'[[:space:]]+','','g'))>=2) then raise exception 'นักกีฬาลงได้ไม่เกิน 2 รายการในรุ่นเดียวกัน'; end if;$q$
  ];
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'STOP: table tennis registration function missing; no changes committed';
  END IF;
  v_def := pg_catalog.pg_get_functiondef(v_oid::oid);
  IF v_def !~* $q$\ma\s+jsonb\M$q$ THEN
    RAISE EXCEPTION 'STOP: table tennis declaration differs; no changes committed';
  END IF;
  FOR v_i IN 1..2 LOOP
    SELECT count(*) INTO v_old_count FROM regexp_matches(v_def,v_old_patterns[v_i],'gi');
    SELECT count(*) INTO v_new_count FROM regexp_matches(v_def,v_new_patterns[v_i],'gi');
    IF v_old_count=1 AND v_new_count=0 THEN
      v_def := regexp_replace(v_def,v_old_patterns[v_i],v_replacements[v_i],'i');
      v_changed := true;
    ELSIF v_old_count=0 AND v_new_count=1 THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'STOP: table tennis RPC differs at check % (old %, new %); no changes committed',v_i,v_old_count,v_new_count;
    END IF;
  END LOOP;
  IF v_def ~* $q$from\s+jsonb_array_elements\s*\(\s*p_players\s*\)\s+(?:as\s+)?a\M$q$ THEN
    RAISE EXCEPTION 'STOP: unresolved table tennis alias; no changes committed';
  END IF;
  IF v_changed THEN EXECUTE v_def; END IF;
  v_def := pg_catalog.pg_get_functiondef(v_oid::oid);
  FOR v_i IN 1..2 LOOP
    SELECT count(*) INTO v_new_count FROM regexp_matches(v_def,v_new_patterns[v_i],'gi');
    IF v_new_count<>1 THEN
      RAISE EXCEPTION 'STOP: table tennis verification failed; no changes committed';
    END IF;
  END LOOP;
END;
$patch$;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'READY' AS tabletennis_alias_fix;
