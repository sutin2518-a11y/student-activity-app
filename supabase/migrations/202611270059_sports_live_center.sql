-- Live display only. Does not change existing tables, registrations, official results or awards.
BEGIN;
SET LOCAL lock_timeout = '3s';
CREATE TABLE IF NOT EXISTS public.sports_live_display_v1 (
  source text NOT NULL CHECK (source IN ('football','esports','boxing')),
  match_id uuid NOT NULL,
  event_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('live','awaiting_result')),
  score_a integer CHECK (score_a BETWEEN 0 AND 999),
  score_b integer CHECK (score_b BETWEEN 0 AND 999),
  fixture_version timestamptz NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid NOT NULL,
  PRIMARY KEY (source,match_id),
  CHECK ((score_a IS NULL) = (score_b IS NULL))
);
ALTER TABLE public.sports_live_display_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sports_live_display_v1 FROM PUBLIC, anon, authenticated;

-- Private helper: only published official fixtures; no personal details or entries in output.
CREATE OR REPLACE FUNCTION public.sports_live_fixtures_v1()
RETURNS TABLE(source text, match_id uuid, event_id uuid, competition_id uuid,
  event_code text, sport_name text, match_no text, round_name text, day date, start_time time,
  venue_name text, official_status text, team_a text, team_b text, score_a integer, score_b integer,
  fixture_version timestamptz, winner_school text, state_label text, ready boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT 'football'::text,m.id,e.id,e.competition_id,e.event_code,e.sport_name,m.match_no::text,
   CASE WHEN m.stage='group' THEN 'รอบแบ่งกลุ่ม' || coalesce(' · สาย '||m.group_code,'') WHEN m.stage='quarter' THEN 'รอบก่อนรองชนะเลิศ' WHEN m.stage='semifinal' THEN 'รอบรองชนะเลิศ' WHEN m.stage='final' THEN 'รอบชิงชนะเลิศ' ELSE m.stage END,
   m.scheduled_date,m.start_time,m.venue_name,m.status,m.team1_name,m.team2_name,m.score1::int,m.score2::int,m.updated_at,NULL::text,NULL::text,
   EXISTS (SELECT 1 FROM public.sports_football_group_teams t WHERE t.event_id=e.id AND t.school_name=m.team1_name) AND EXISTS (SELECT 1 FROM public.sports_football_group_teams t WHERE t.event_id=e.id AND t.school_name=m.team2_name)
 FROM public.sports_football_matches m JOIN public.sports_events e ON e.id=m.event_id AND e.competition_id=m.competition_id JOIN public.sports_competitions c ON c.id=e.competition_id
 WHERE c.slug='phayao-secondary-group-sports-2569' AND e.status<>'draft' AND m.status IN ('published','completed') AND NOT m.petanque_bye
 UNION ALL
 SELECT 'esports',m.id,e.id,e.competition_id,e.event_code,e.sport_name,m.match_no::text,
   CASE WHEN m.stage='group' THEN 'รอบแบ่งกลุ่ม' WHEN m.stage='semifinal' THEN 'รอบรองชนะเลิศ' WHEN m.stage='final' THEN 'รอบชิงชนะเลิศ' WHEN m.stage='third_place' THEN 'ชิงอันดับ 3' ELSE 'รอบน็อกเอาต์' END,
   m.scheduled_date,m.start_time,m.venue_name,m.match_status,coalesce(t1.school_name,'รอคู่แข่งขัน'),coalesce(t2.school_name,'รอคู่แข่งขัน'),m.score1::int,m.score2::int,m.updated_at,NULL,NULL,t1.id IS NOT NULL AND t2.id IS NOT NULL
 FROM public.sports_esports_matches m JOIN public.sports_events e ON e.id=m.event_id AND e.competition_id=m.competition_id JOIN public.sports_competitions c ON c.id=e.competition_id
 LEFT JOIN public.sports_esports_group_teams t1 ON t1.id=m.team1_id AND t1.event_id=e.id AND t1.competition_id=c.id
 LEFT JOIN public.sports_esports_group_teams t2 ON t2.id=m.team2_id AND t2.event_id=e.id AND t2.competition_id=c.id
 WHERE c.slug='phayao-secondary-group-sports-2569' AND e.status<>'draft' AND m.match_status IN ('scheduled','completed')
 UNION ALL
 SELECT 'boxing',b.id,e.id,e.competition_id,e.event_code,e.sport_name,b.match_no::text,b.round_name,b.scheduled_date,b.start_time,'โรงเรียนราชประชานุเคราะห์ 24',b.status,coalesce(sr.name,'รอคู่แข่งขัน'),coalesce(sb.name,'รอคู่แข่งขัน'),NULL,NULL,b.updated_at,sw.name,NULL,b.red_entry IS NOT NULL AND b.blue_entry IS NOT NULL
 FROM public.sports_boxing_bouts b JOIN public.sports_boxing_draws d ON d.event_id=b.event_id AND d.published JOIN public.sports_events e ON e.id=b.event_id JOIN public.sports_competitions c ON c.id=e.competition_id
 LEFT JOIN public.sports_entries er ON er.id=b.red_entry AND er.event_id=e.id LEFT JOIN public.sports_schools sr ON sr.id=er.school_id
 LEFT JOIN public.sports_entries eb ON eb.id=b.blue_entry AND eb.event_id=e.id LEFT JOIN public.sports_schools sb ON sb.id=eb.school_id
 LEFT JOIN public.sports_entries ew ON ew.id=b.winner_entry AND ew.event_id=e.id LEFT JOIN public.sports_schools sw ON sw.id=ew.school_id
 WHERE c.slug='phayao-secondary-group-sports-2569' AND e.status<>'draft' AND b.status IN ('published','completed')
 UNION ALL
 SELECT 'athletics',ss.id,e.id,e.competition_id,e.event_code,e.sport_name,ss.session_number,ss.round_name,ss.session_date,ss.start_time,ss.venue_name,
   CASE WHEN r.state='finished' THEN 'completed' WHEN r.state IN ('open','closed') THEN 'in_progress' ELSE 'published' END,
   '', '', NULL,NULL,r.changed_at,NULL,CASE WHEN r.state='open' THEN 'กำลังเรียกรายงานตัว' WHEN r.state='closed' THEN 'เข้าสนามแล้ว' WHEN r.state='finished' THEN 'เสร็จสิ้น' ELSE 'รอเรียก' END,false
 FROM public.sports_ath_rounds r JOIN public.sports_schedule_sessions ss ON ss.id=r.session_id AND ss.event_id=r.event_id JOIN public.sports_events e ON e.id=ss.event_id AND e.competition_id=ss.competition_id JOIN public.sports_competitions c ON c.id=e.competition_id
 WHERE c.slug='phayao-secondary-group-sports-2569' AND e.status<>'draft' AND ss.status='published';
$$;
REVOKE ALL ON FUNCTION public.sports_live_fixtures_v1() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sports_live_can_manage_v1(p_comp uuid,p_event uuid,p_source text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.sports_stage3_admin(p_comp)
 OR (p_source='esports' AND public.sports_esports_can_edit_event(p_comp,p_event))
 OR EXISTS(SELECT 1 FROM public.sports_event_referees r JOIN auth.users u ON u.id=auth.uid() AND lower(btrim(u.email))=r.email
   WHERE r.event_id=p_event AND r.competition_id=p_comp AND r.is_active AND u.email_confirmed_at IS NOT NULL
   AND EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google')));
$$;
REVOKE ALL ON FUNCTION public.sports_live_can_manage_v1(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

-- JSON array avoids the default 500/1000 row client limit. Permissions are per fixture.
CREATE OR REPLACE FUNCTION public.sports_live_board_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
 'id',f.source||':'||f.match_id,'event_id',f.event_id,'special_source',f.source,'special_code',f.event_code,'special_number',f.match_no,
 'sport_name',f.sport_name,'round_name',f.round_name,'scheduled_day',f.day,'scheduled_time',f.start_time,
 'scheduled_at',CASE WHEN f.day IS NOT NULL AND f.start_time IS NOT NULL THEN (f.day+f.start_time) AT TIME ZONE 'Asia/Bangkok' END,
 'venue_name',f.venue_name,'status',CASE WHEN f.official_status='completed' THEN 'completed' WHEN f.source='athletics' THEN f.official_status ELSE coalesce(l.state,'scheduled') END,
 'display_team_a',f.team_a,'display_team_b',f.team_b,'score_a',CASE WHEN f.official_status='completed' THEN f.score_a ELSE l.score_a END,
 'score_b',CASE WHEN f.official_status='completed' THEN f.score_b ELSE l.score_b END,'winner_school',f.winner_school,
 'is_session',f.source='athletics','status_label',f.state_label,'updated_at',CASE WHEN f.official_status='completed' THEN f.fixture_version ELSE l.changed_at END,
 'live_version',l.changed_at,'fixture_version',f.fixture_version,
 'operator',f.source<>'athletics' AND public.sports_live_can_manage_v1(f.competition_id,f.event_id,f.source),
 'can_manage',f.source<>'athletics' AND f.official_status IN ('published','scheduled') AND f.ready AND public.sports_live_can_manage_v1(f.competition_id,f.event_id,f.source)
 ) ORDER BY f.day NULLS LAST,f.start_time NULLS LAST,f.source,f.match_no,f.event_id,f.match_id),'[]'::jsonb)
 FROM public.sports_live_fixtures_v1() f LEFT JOIN public.sports_live_display_v1 l ON l.source=f.source AND l.match_id=f.match_id AND l.event_id=f.event_id AND l.fixture_version=f.fixture_version AND f.official_status IN ('published','scheduled');
$$;
REVOKE ALL ON FUNCTION public.sports_live_board_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sports_live_board_v1() TO anon, authenticated;

-- Cheap network pulse: return only the signature, not hundreds of fixture rows.
CREATE OR REPLACE FUNCTION public.sports_live_pulse_v1()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT md5(public.sports_live_board_v1()::text);
$$;
REVOKE ALL ON FUNCTION public.sports_live_pulse_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sports_live_pulse_v1() TO anon, authenticated;

-- All actions affect only the independent live display. The official result is saved in the existing sport page.
CREATE OR REPLACE FUNCTION public.sports_live_action_v1(p_source text,p_match uuid,p_action text,p_score_a integer,p_score_b integer,p_fixture_version timestamptz,p_expected timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f record; v_previous public.sports_live_display_v1%rowtype; v_state text; v_a integer; v_b integer;
BEGIN
 IF auth.uid() IS NULL OR p_source IS NULL OR p_source NOT IN ('football','esports','boxing') OR p_action IS NULL OR p_action NOT IN ('start','score','stop') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์หรือคำสั่งไม่ถูกต้อง' USING ERRCODE='42501'; END IF;
 -- Serialize live operators and official result changes on the same fixture row.
 IF p_source='football' THEN PERFORM 1 FROM public.sports_football_matches WHERE id=p_match FOR SHARE;
 ELSIF p_source='esports' THEN PERFORM 1 FROM public.sports_esports_matches WHERE id=p_match FOR SHARE;
 ELSE PERFORM 1 FROM public.sports_boxing_bouts WHERE id=p_match FOR SHARE; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_source),pg_catalog.hashtext(p_match::text));
 SELECT * INTO f FROM public.sports_live_fixtures_v1() x WHERE x.source=p_source AND x.match_id=p_match;
 IF NOT FOUND OR f.official_status NOT IN ('published','scheduled') OR NOT f.ready OR NOT public.sports_live_can_manage_v1(f.competition_id,f.event_id,p_source) THEN RAISE EXCEPTION 'คู่ยังไม่พร้อม ไม่เผยแพร่ จบแล้ว หรือไม่มีสิทธิ์' USING ERRCODE='42501'; END IF;
 IF f.fixture_version IS DISTINCT FROM p_fixture_version THEN RAISE EXCEPTION 'โปรแกรมถูกเปลี่ยน กรุณารีเฟรช'; END IF;
 SELECT * INTO v_previous FROM public.sports_live_display_v1 WHERE source=p_source AND match_id=p_match FOR UPDATE;
 IF v_previous.fixture_version IS DISTINCT FROM f.fixture_version THEN v_previous.state:=NULL; v_previous.score_a:=NULL; v_previous.score_b:=NULL; v_previous.changed_at:=NULL; END IF;
 IF v_previous.changed_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'ข้อมูลสดเปลี่ยนแล้ว กรุณารีเฟรช'; END IF;
 IF p_action='start' THEN
   IF f.day IS DISTINCT FROM (clock_timestamp() AT TIME ZONE 'Asia/Bangkok')::date THEN RAISE EXCEPTION 'เริ่ม LIVE ได้เฉพาะคู่ที่กำหนดแข่งขันวันนี้ หากเลื่อนวันให้แก้โปรแกรมก่อน'; END IF;
   IF v_previous.state='live' THEN RAISE EXCEPTION 'คู่นี้กำลังแข่งขันแล้ว'; END IF;
   v_state:='live'; v_a:=v_previous.score_a; v_b:=v_previous.score_b;
 ELSIF p_action='score' THEN
   IF v_previous.state IS DISTINCT FROM 'live' OR p_source='boxing' OR p_score_a IS NULL OR p_score_b IS NULL OR p_score_a NOT BETWEEN 0 AND 999 OR p_score_b NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'คะแนนไม่ถูกต้องหรือยังไม่ได้เริ่ม LIVE'; END IF;
   IF p_source='esports' AND (p_score_a>2 OR p_score_b>2 OR (p_score_a=2 AND p_score_b=2)) THEN RAISE EXCEPTION 'คะแนนเกม RoV ไม่ถูกต้อง'; END IF;
   v_state:='live'; v_a:=p_score_a; v_b:=p_score_b;
 ELSE
   IF v_previous.state IS DISTINCT FROM 'live' THEN RAISE EXCEPTION 'คู่นี้ไม่ได้กำลัง LIVE'; END IF;
   v_state:='awaiting_result'; v_a:=v_previous.score_a; v_b:=v_previous.score_b;
 END IF;
 INSERT INTO public.sports_live_display_v1(source,match_id,event_id,state,score_a,score_b,fixture_version,changed_at,changed_by)
 VALUES(p_source,p_match,f.event_id,v_state,v_a,v_b,f.fixture_version,clock_timestamp(),auth.uid())
 ON CONFLICT(source,match_id) DO UPDATE SET event_id=excluded.event_id,state=excluded.state,score_a=excluded.score_a,score_b=excluded.score_b,fixture_version=excluded.fixture_version,changed_at=excluded.changed_at,changed_by=excluded.changed_by;
END $$;
REVOKE ALL ON FUNCTION public.sports_live_action_v1(text,uuid,text,integer,integer,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sports_live_action_v1(text,uuid,text,integer,integer,timestamptz,timestamptz) TO authenticated;
-- Validate the query before commit (no registration writes).
SELECT CASE WHEN jsonb_typeof(public.sports_live_board_v1())='array' AND length(public.sports_live_pulse_v1())=32 THEN 'READY' ELSE 'CHECK' END AS live_center_ready;
NOTIFY pgrst,'reload schema';
COMMIT;
