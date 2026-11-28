-- Additive referee workbench; no changes to registration, existing policies or existing data.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.sports_cert_submit(uuid,jsonb)') IS NULL OR
 to_regprocedure('public.sports_award_suggestions(uuid)') IS NULL OR
 to_regprocedure('public.sports_award_receipt(uuid)') IS NULL OR
 to_regprocedure('public.sports_event_referee_assign(uuid,text,boolean)') IS NULL OR
 to_regprocedure('public.sports_ath_awards(uuid)') IS NULL OR
 to_regprocedure('public.sports_award_can_inspect(uuid)') IS NULL OR
 to_regprocedure('public.sports_award_is_published(uuid)') IS NULL OR
 to_regprocedure('public.sports_esports_can_edit_event(uuid,uuid)') IS NULL OR
 to_regprocedure('public.sports_cert_can_record(uuid)') IS NULL OR
 to_regclass('public.sports_ath_rounds') IS NULL THEN
 RAISE EXCEPTION 'Missing existing awards/referee functions (036–047). Stop and check migrations'; END IF;
END $$;

-- Existing email registry is the source of truth. Award-only officials do not gain score rights.
CREATE OR REPLACE FUNCTION public.sports_unified_referee_v1(p_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.sports_events e JOIN public.sports_competitions c ON c.id=e.competition_id
 JOIN auth.users u ON u.id=auth.uid()
 JOIN public.sports_event_referees r ON r.event_id=e.id AND r.competition_id=e.competition_id AND r.email=lower(btrim(u.email))
 WHERE e.id=p_event AND c.slug='phayao-secondary-group-sports-2569' AND r.is_active
 AND u.email_confirmed_at IS NOT NULL AND EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google'));
$$;

CREATE OR REPLACE FUNCTION public.sports_unified_preview_v1(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.sports_events%rowtype; total int:=0; done int:=0; expected int; grp_expected int; grp_actual int; proposal jsonb; rec jsonb; names jsonb; fb jsonb:='[]'; can_record boolean; ref boolean; can_rov boolean:=false;
BEGIN
 SELECT ev.* INTO e FROM public.sports_events ev JOIN public.sports_competitions c ON c.id=ev.competition_id WHERE ev.id=p_event AND c.slug='phayao-secondary-group-sports-2569';
 IF NOT FOUND OR auth.uid() IS NULL OR NOT coalesce(public.sports_award_can_inspect(p_event),false) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ดูรายการนี้' USING ERRCODE='42501'; END IF;
 can_record:=coalesce(public.sports_cert_can_record(p_event),false); ref:=public.sports_unified_referee_v1(p_event);
 IF e.event_code LIKE 'GS3-ES-%' THEN
  can_rov:=coalesce(public.sports_esports_can_edit_event(e.competition_id,e.id),false);
  SELECT count(*),count(*) FILTER(WHERE match_status='completed') INTO total,done FROM public.sports_esports_matches WHERE event_id=e.id AND competition_id=e.competition_id;
  SELECT coalesce(sum(n*(n-1)/2),0) INTO grp_expected FROM (SELECT count(*)::int n FROM public.sports_esports_group_teams WHERE event_id=e.id AND competition_id=e.competition_id GROUP BY group_id) g;
  SELECT count(*) INTO grp_actual FROM public.sports_esports_matches WHERE event_id=e.id AND competition_id=e.competition_id AND stage='group';
 ELSIF e.event_code LIKE 'GS3-AT-%' THEN
  SELECT count(*),count(*) FILTER(WHERE state='finished') INTO total,done FROM public.sports_ath_rounds WHERE event_id=e.id;
 ELSIF e.event_code LIKE 'GS3-BX-%' THEN
  -- The existing boxing awards RPC owns readiness (including small brackets / BYE).
  total:=0;done:=0;
 ELSE
  SELECT count(*),count(*) FILTER(WHERE status='completed') INTO total,done FROM public.sports_football_matches WHERE event_id=e.id AND competition_id=e.competition_id AND (e.event_code NOT LIKE 'GS3-PT-%' OR NOT petanque_bye);
 END IF;
 IF e.event_code LIKE 'GS3-FB-%' AND (ref OR coalesce(public.sports_stage3_admin(e.competition_id),false)) THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'match_no',m.match_no,'stage',m.stage,'team1',m.team1_name,'team2',m.team2_name,'status',m.status,'score1',m.score1,'score2',m.score2,'penalty1',m.penalty1,'penalty2',m.penalty2,'updated_at',m.updated_at,'date',m.scheduled_date,'time',m.start_time) ORDER BY m.match_no),'[]') INTO fb FROM public.sports_football_matches m WHERE m.event_id=e.id AND m.competition_id=e.competition_id AND m.status IN ('published','completed');
 END IF;
 IF public.sports_award_is_published(p_event) THEN
  rec:=public.sports_award_receipt(p_event); proposal:=jsonb_build_object('status','published','placements','[]'::jsonb);
 ELSIF NOT can_record THEN proposal:=jsonb_build_object('status','no_permission','placements','[]'::jsonb);
 ELSE
  proposal:=public.sports_award_suggestions(p_event);
  expected:=CASE e.event_code WHEN 'GS3-FB-13M' THEN 9 WHEN 'GS3-FB-15M' THEN 17 WHEN 'GS3-FB-UM' THEN 16 WHEN 'GS3-FB-UF' THEN 9 WHEN 'GS3-FS-15M' THEN 17 WHEN 'GS3-FS-UM' THEN 22 WHEN 'GS3-FS-UF' THEN 12 ELSE NULL END;
  IF (expected IS NOT NULL AND (total<>expected OR done<>expected)) OR
    (e.event_code LIKE 'GS3-ES-%' AND (total=0 OR done<>total OR grp_expected=0 OR grp_actual<>grp_expected)) OR
    (e.event_code LIKE 'GS3-AT-%' AND (total=0 OR total<>done)) OR e.status='draft' THEN
    proposal:=jsonb_build_object('status','incomplete','placements','[]'::jsonb);
  END IF;
  -- Existing award model has two bronze placements; a third-place fixture needs an explicit rule decision.
  IF proposal->>'status'='ready' AND e.event_code LIKE 'GS3-ES-%' AND EXISTS (SELECT 1 FROM public.sports_esports_matches WHERE event_id=e.id AND competition_id=e.competition_id AND stage='third_place') THEN
    proposal:=jsonb_build_object('status','manual','placements','[]'::jsonb);
  END IF;
 END IF;
 -- Display only entry labels already visible to award officials; never student names/photos.
 IF proposal->>'status'='ready' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('rank',x.rank,'slot',x.slot,'entry_id',x.entry_id,'school',s.name,'entry_name',en.entry_name) ORDER BY x.rank,x.slot),'[]') INTO names
  FROM jsonb_to_recordset(proposal->'placements') x(rank int,slot int,entry_id uuid)
  JOIN public.sports_entries en ON en.id=x.entry_id AND en.event_id=e.id AND en.competition_id=e.competition_id AND en.status='approved'
  JOIN public.sports_schools s ON s.id=en.school_id;
  IF jsonb_array_length(names)<>jsonb_array_length(proposal->'placements') OR jsonb_array_length(names)=0 THEN
   proposal:=jsonb_build_object('status','ambiguous','placements','[]'::jsonb);names:='[]'; END IF;
 END IF;
 RETURN jsonb_build_object('event_id',e.id,'total',total,'done',done,'status',proposal->>'status','placements',coalesce(proposal->'placements','[]'::jsonb),'labels',coalesce(names,'[]'::jsonb),'receipt',rec,'can_record',can_record,'referee',ref,'rov_access',can_rov,'football',fb);
END $$;

-- Only an explicitly assigned award official may finalize; re-read the source and compare
-- the exact placements inside the same transaction. Existing publisher handles receipts.
CREATE OR REPLACE FUNCTION public.sports_unified_finalize_v1(p_event uuid,p_expected jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE fresh jsonb; answer jsonb; rec jsonb;
BEGIN
 IF NOT coalesce(public.sports_cert_can_record(p_event),false) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ประกาศผล' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 -- Existing sport-specific writers use the advisory lock; lock legacy fixture rows too.
 PERFORM 1 FROM public.sports_football_matches WHERE event_id=p_event ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.sports_esports_matches WHERE event_id=p_event ORDER BY id FOR UPDATE;
 fresh:=public.sports_unified_preview_v1(p_event);
 IF fresh->>'status' IS DISTINCT FROM 'ready' OR p_expected IS NULL OR jsonb_typeof(p_expected)<>'array' OR p_expected IS DISTINCT FROM fresh->'placements' THEN
  RAISE EXCEPTION 'ผลยังไม่ครบ หรืออันดับเปลี่ยนแล้ว กรุณาโหลดผลใหม่'; END IF;
 answer:=public.sports_cert_submit(p_event,fresh->'placements');
 rec:=public.sports_award_receipt(p_event);
 IF answer->>'status' IS DISTINCT FROM 'published' OR NOT coalesce((rec->>'consistent')::boolean,false) THEN RAISE EXCEPTION 'ผล เหรียญ หรือเกียรติบัตรไม่สอดคล้อง ระบบยกเลิกทั้งหมด'; END IF;
 RETURN rec;
END $$;

-- Football: record ONLY the first official result for a published, already assigned pairing.
-- No change to fixture, teams, registration or other sport. Existing audit trigger records write.
CREATE OR REPLACE FUNCTION public.sports_unified_football_score_v1(p_match uuid,p_expected timestamptz,p_score1 int,p_score2 int,p_penalty1 int,p_penalty2 int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.sports_football_matches%rowtype; ev uuid; code text; a text; b text;
BEGIN
 SELECT f.event_id,e.event_code INTO ev,code FROM public.sports_football_matches f JOIN public.sports_events e ON e.id=f.event_id AND e.competition_id=f.competition_id JOIN public.sports_competitions c ON c.id=e.competition_id WHERE f.id=p_match AND c.slug='phayao-secondary-group-sports-2569' AND e.event_code IN ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF');
 IF ev IS NULL OR NOT public.sports_unified_referee_v1(ev) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกฟุตบอลรายการนี้' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ev::text),94723);
 SELECT * INTO STRICT m FROM public.sports_football_matches WHERE id=p_match FOR UPDATE;
 IF NOT public.sports_unified_referee_v1(ev) OR NOT EXISTS(SELECT 1 FROM public.sports_events e WHERE e.id=ev AND e.status<>'draft') OR m.event_id<>ev OR m.status<>'published' OR m.updated_at IS DISTINCT FROM p_expected OR public.sports_award_is_published(ev) THEN RAISE EXCEPTION 'คู่ไม่พร้อม ผลถูกบันทึกแล้ว หรือข้อมูลเปลี่ยน กรุณาโหลดใหม่'; END IF;
 IF m.scheduled_date IS NULL OR m.start_time IS NULL OR (m.scheduled_date+m.start_time)>(now() AT TIME ZONE 'Asia/Bangkok') THEN RAISE EXCEPTION 'ยังไม่ถึงวันแข่งขันหรือโปรแกรมไม่ครบ'; END IF;
 a:=m.team1_name;b:=m.team2_name;
 IF a=b OR (SELECT count(DISTINCT t.school_name) FROM public.sports_football_group_teams t WHERE t.event_id=ev AND t.competition_id=m.competition_id AND t.school_name IN(a,b) AND (m.stage<>'group' OR t.group_code=m.group_code))<>2 THEN RAISE EXCEPTION 'ต้องให้ผู้จัดยืนยันคู่แข่งขันจริงก่อน'; END IF;
 IF m.stage<>'group' AND EXISTS (SELECT 1 FROM public.sports_football_matches f WHERE f.event_id=ev AND f.id<>m.id AND f.stage=m.stage AND f.status<>'cancelled' AND (f.team1_name IN(a,b) OR f.team2_name IN(a,b))) THEN RAISE EXCEPTION 'พบทีมซ้ำในรอบเดียวกัน'; END IF;
 IF m.stage<>'group' AND EXISTS(SELECT 1 FROM public.sports_football_matches f WHERE f.event_id=ev AND (CASE f.stage WHEN 'group' THEN 0 WHEN 'quarter' THEN 1 WHEN 'semifinal' THEN 2 ELSE 3 END)<(CASE m.stage WHEN 'quarter' THEN 1 WHEN 'semifinal' THEN 2 ELSE 3 END) AND f.status<>'completed') THEN RAISE EXCEPTION 'ผลรอบก่อนหน้ายังไม่ครบ'; END IF;
 IF m.stage='semifinal' AND EXISTS(SELECT 1 FROM public.sports_football_matches f WHERE f.event_id=ev AND f.stage='quarter') AND (SELECT count(DISTINCT CASE WHEN f.score1>f.score2 OR (f.score1=f.score2 AND f.penalty1>f.penalty2) THEN f.team1_name ELSE f.team2_name END) FROM public.sports_football_matches f WHERE f.event_id=ev AND f.stage='quarter' AND f.status='completed' AND (CASE WHEN f.score1>f.score2 OR (f.score1=f.score2 AND f.penalty1>f.penalty2) THEN f.team1_name ELSE f.team2_name END) IN(a,b))<>2 THEN RAISE EXCEPTION 'คู่รอบรองไม่ตรงผลรอบก่อนหน้า'; END IF;
 IF m.stage='final' AND (SELECT count(*) FROM public.sports_football_matches f WHERE f.event_id=ev AND f.stage='semifinal' AND f.status='completed' AND (CASE WHEN f.score1>f.score2 OR (f.score1=f.score2 AND f.penalty1>f.penalty2) THEN f.team1_name ELSE f.team2_name END) IN(a,b))<>2 THEN RAISE EXCEPTION 'คู่ชิงไม่ตรงผลรอบรอง'; END IF;
 IF p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 99 OR p_score2 NOT BETWEEN 0 AND 99 THEN RAISE EXCEPTION 'กรอกสกอร์ 0–99'; END IF;
 IF p_score1=p_score2 THEN
 IF p_penalty1 IS NULL OR p_penalty2 IS NULL OR p_penalty1 NOT BETWEEN 0 AND 99 OR p_penalty2 NOT BETWEEN 0 AND 99 OR p_penalty1=p_penalty2 THEN RAISE EXCEPTION 'ต้องระบุผลจุดโทษที่มีผู้ชนะ'; END IF;
 ELSE p_penalty1:=NULL;p_penalty2:=NULL;END IF;
 UPDATE public.sports_football_matches SET score1=p_score1,score2=p_score2,penalty1=p_penalty1,penalty2=p_penalty2,status='completed' WHERE id=m.id;
END $$;

-- Batch assignment is atomic and uses the existing verified-email registry/audit.
CREATE OR REPLACE FUNCTION public.sports_unified_assign_v1(p_events uuid[],p_email text,p_active boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v uuid; n int:=0;
BEGIN
 IF p_events IS NULL OR cardinality(p_events) NOT BETWEEN 1 AND 120 OR p_active IS NULL OR array_position(p_events,NULL::uuid) IS NOT NULL THEN RAISE EXCEPTION 'เลือกรายการ 1–120 รายการ'; END IF;
 FOR v IN SELECT DISTINCT x.id FROM unnest(p_events) AS x(id) ORDER BY x.id LOOP
  PERFORM public.sports_event_referee_assign(v,p_email,p_active); n:=n+1;
 END LOOP; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.sports_unified_referee_v1(uuid),public.sports_unified_preview_v1(uuid),public.sports_unified_finalize_v1(uuid,jsonb),public.sports_unified_football_score_v1(uuid,timestamptz,int,int,int,int),public.sports_unified_assign_v1(uuid[],text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sports_unified_preview_v1(uuid),public.sports_unified_finalize_v1(uuid,jsonb),public.sports_unified_football_score_v1(uuid,timestamptz,int,int,int,int),public.sports_unified_assign_v1(uuid[],text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'READY' AS unified_results_v1;
