-- School-owned registration self-service. No existing RPC or policy is replaced.
BEGIN;
SET LOCAL lock_timeout='3s';
CREATE TABLE IF NOT EXISTS public.sports_school_entry_audit_v1 (
 id bigint generated always as identity primary key,
 entry_id uuid not null, school_id uuid not null, event_id uuid not null,
 actor uuid not null, action text not null check(action in ('edit','delete')),
 snapshot jsonb not null, at timestamptz not null default clock_timestamp()
);
ALTER TABLE public.sports_school_entry_audit_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sports_school_entry_audit_v1 FROM PUBLIC,anon,authenticated;
-- Internal helper; must be called inside the same transaction as the edit/delete.
CREATE OR REPLACE FUNCTION public.sports_school_entry_guard_v1(p_entry uuid,p_event uuid,p_school uuid,p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE en public.sports_entries%rowtype; ev public.sports_events%rowtype; has_live boolean := false; today date := (clock_timestamp() at time zone 'Asia/Bangkok')::date;
BEGIN
 IF auth.uid() IS NULL OR p_entry IS NULL OR p_action IS NULL OR p_action NOT IN ('edit','delete') THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบและเลือกใบสมัครเดิม'; END IF;
 SELECT * INTO en FROM public.sports_entries WHERE id=p_entry;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.sports_user_roles r WHERE r.user_id=auth.uid() AND r.is_active AND r.role='school_manager' AND r.school_id=en.school_id AND (r.competition_id=en.competition_id OR r.competition_id IS NULL)) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการใบสมัครนี้' USING ERRCODE='42501'; END IF;
 -- Lock event before entry, as the existing registration functions do.
 SELECT * INTO STRICT ev FROM public.sports_events WHERE id=en.event_id AND competition_id=en.competition_id FOR UPDATE;
 SELECT * INTO STRICT en FROM public.sports_entries WHERE id=p_entry FOR UPDATE;
 IF en.event_id IS DISTINCT FROM ev.id OR en.competition_id IS DISTINCT FROM ev.competition_id OR (p_event IS NOT NULL AND en.event_id IS DISTINCT FROM p_event) OR (p_school IS NOT NULL AND en.school_id IS DISTINCT FROM p_school) OR NOT EXISTS(SELECT 1 FROM public.sports_user_roles r WHERE r.user_id=auth.uid() AND r.is_active AND r.role='school_manager' AND r.school_id=en.school_id AND (r.competition_id=en.competition_id OR r.competition_id IS NULL)) THEN RAISE EXCEPTION 'ข้อมูลใบสมัครเปลี่ยน กรุณาโหลดใหม่' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sports_competitions c WHERE c.id=en.competition_id AND c.slug='phayao-secondary-group-sports-2569') OR ev.status IS DISTINCT FROM 'registration' OR en.status NOT IN ('approved','submitted','rejected') THEN RAISE EXCEPTION 'รายการนี้ปิดรับสมัครหรือไม่อนุญาตให้แก้ไขแล้ว'; END IF;
 IF to_regclass('public.sports_live_display_v1') IS NOT NULL THEN EXECUTE 'select exists(select 1 from public.sports_live_display_v1 where event_id=$1)' INTO has_live USING ev.id; END IF;
 -- Conservative cutoff: no self-service on/after a scheduled competition day.
 IF EXISTS(SELECT 1 FROM public.sports_football_matches m WHERE m.event_id=ev.id AND (m.status='completed' OR (m.scheduled_date<=today AND m.status<>'cancelled')))
 OR EXISTS(SELECT 1 FROM public.sports_esports_matches m WHERE m.event_id=ev.id AND (m.match_status='completed' OR m.scheduled_date<=today))
 OR EXISTS(SELECT 1 FROM public.sports_boxing_draws b WHERE b.event_id=ev.id)
 OR EXISTS(SELECT 1 FROM public.sports_boxing_checks b WHERE b.event_id=ev.id)
 OR EXISTS(SELECT 1 FROM public.sports_ath_rounds r WHERE r.event_id=ev.id AND (r.roster_ready OR r.state<>'waiting'))
 OR EXISTS(SELECT 1 FROM public.sports_schedule_sessions s WHERE s.event_id=ev.id AND s.session_date<=today)
 OR EXISTS(SELECT 1 FROM public.sports_ath_people p JOIN public.sports_ath_rounds r ON r.session_id=p.session_id WHERE r.event_id=ev.id)
 OR has_live
 OR EXISTS(SELECT 1 FROM public.sports_matches m WHERE m.event_id=ev.id AND (m.status='completed' OR EXISTS(SELECT 1 FROM public.sports_match_results x WHERE x.match_id=m.id)))
 OR EXISTS(SELECT 1 FROM public.sports_event_results x WHERE x.event_id=ev.id)
 OR EXISTS(SELECT 1 FROM public.sports_medals x WHERE x.event_id=ev.id)
 OR EXISTS(SELECT 1 FROM public.sports_certificate_placements x WHERE x.event_id=ev.id)
 OR EXISTS(SELECT 1 FROM public.sports_certificates_issued x WHERE x.entry_id=en.id)
 OR public.sports_award_is_published(ev.id) THEN RAISE EXCEPTION 'ถึงวันแข่งขัน เริ่มจัดรายชื่อ/แข่งขัน หรือมีผลแล้ว กรุณาติดต่อผู้จัด'; END IF;
 INSERT INTO public.sports_school_entry_audit_v1(entry_id,school_id,event_id,actor,action,snapshot)
 VALUES(en.id,en.school_id,en.event_id,auth.uid(),p_action,jsonb_build_object(
 'entry',to_jsonb(en),
 'athletes',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) FROM public.sports_athletes a WHERE a.entry_id=en.id),
 'staff',(SELECT to_jsonb(s) FROM public.sports_roster_staff s WHERE s.entry_id=en.id),
 'football_details',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.sports_football_player_details x WHERE x.entry_id=en.id),
 'volleyball_form',(SELECT to_jsonb(x) FROM public.sports_volleyball_forms x WHERE x.entry_id=en.id),
 'volleyball_players',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.sports_volleyball_player_forms x JOIN public.sports_athletes a ON a.id=x.athlete_id WHERE a.entry_id=en.id),
 'takraw_players',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.sports_takraw_player_forms x JOIN public.sports_athletes a ON a.id=x.athlete_id WHERE a.entry_id=en.id),
 'tt_form',(SELECT to_jsonb(x) FROM public.sports_tt_entry_forms x WHERE x.entry_id=en.id),
 'tt_players',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM public.sports_tt_player_forms x JOIN public.sports_athletes a ON a.id=x.athlete_id WHERE a.entry_id=en.id),
 'photo_paths',(SELECT coalesce(jsonb_agg(o.name),'[]'::jsonb) FROM storage.objects o WHERE o.bucket_id='sports-athlete-photos' AND split_part(o.name,'/',1)=en.id::text)));
END $$;
REVOKE ALL ON FUNCTION public.sports_school_entry_guard_v1(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
-- New school-only copies of the deployed form functions. Retain all existing validation and the fixes 054/057/058.
-- Abort atomically if expected definition is not present. Never overwrite existing registration functions.
DO $patch$
DECLARE r record; d text; old_gate text; new_gate text; new_sig text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('sports_register_roster','uuid,uuid,uuid,text,text,text,jsonb,jsonb','sports_school_edit_roster_v1',true),
 ('sports_volleyball_save_form','uuid,uuid,uuid,text,text,text,jsonb,jsonb','sports_school_edit_volleyball_v1',false),
 ('sports_takraw_save_form','uuid,uuid,uuid,jsonb,jsonb','sports_school_edit_takraw_v1',false),
 ('sports_tt_save_form','uuid,uuid,uuid,jsonb,jsonb,text','sports_school_edit_tt_v1',false)
 ) AS v(old_name,args,new_name,generic) LOOP
  d:=pg_get_functiondef(to_regprocedure('public.'||r.old_name||'('||r.args||')'));
  IF d IS NULL THEN RAISE EXCEPTION 'Missing registration RPC: %',r.old_name; END IF;
  d:=replace(d,E'\r\n',E'\n');
  old_gate:=CASE WHEN r.generic THEN 'and status=''rejected'' returning id into saved' ELSE 'and (status=''rejected'' or (status in (''approved'',''submitted'') and public.sports_stage3_admin(e.competition_id))) returning id into saved' END;
  new_gate:='and status in (''rejected'',''approved'',''submitted'') returning id into saved';
  IF (length(d)-length(replace(d,old_gate,'')))/length(old_gate)<>1 OR position(E'\nbegin\n' IN d)=0 THEN RAISE EXCEPTION 'STOP: unexpected function definition: %',r.old_name; END IF;
  IF position('FUNCTION public.'||r.old_name||'(' IN d)=0 THEN RAISE EXCEPTION 'STOP: unexpected function header: %',r.old_name; END IF;
  d:=replace(d,'FUNCTION public.'||r.old_name||'(','FUNCTION public.'||r.new_name||'(');
  d:=replace(d,old_gate,new_gate);
  d:=regexp_replace(d,E'\nbegin\n',E'\nbegin\n perform public.sports_school_entry_guard_v1(p_entry,p_event,p_school,''edit'');\n' || CASE WHEN r.generic THEN E' if not exists(select 1 from public.sports_events ev0 where ev0.id=p_event and ev0.event_code ~ ''^GS3-(ES|PT|BX|AT)-'') then raise exception ''กรุณาใช้ฟอร์มเฉพาะกีฬา''; end if;\n if exists(select 1 from public.sports_events ev0 where ev0.id=p_event and ev0.event_code like ''GS3-AT-%'') and (jsonb_typeof(p_players) is distinct from ''array'' or jsonb_array_length(p_players) is distinct from (case when exists(select 1 from public.sports_ath_rounds ar where ar.event_id=p_event and ar.kind=''relay'') then 4 else 1 end)) then raise exception ''กรีฑาเดี่ยว 1 คน วิ่งผลัด 4 คนต่อใบสมัคร''; end if;\n' ELSE '' END);
  IF position('perform public.sports_school_entry_guard_v1(p_entry,p_event,p_school' IN d)=0 THEN RAISE EXCEPTION 'STOP: guard not installed: %',r.old_name; END IF;
  EXECUTE d;
  new_sig:='public.'||r.new_name||'('||r.args||')';
  EXECUTE 'REVOKE ALL ON FUNCTION '||new_sig||' FROM PUBLIC,anon,authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||new_sig||' TO authenticated';
 END LOOP;
END $patch$;
-- Remove one application only. Archive before deleting; no file or competition changes.
CREATE OR REPLACE FUNCTION public.sports_school_delete_entry_v1(p_entry uuid,p_expected_updated_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.sports_school_entry_guard_v1(p_entry,NULL,NULL,'delete');
 IF NOT EXISTS(SELECT 1 FROM public.sports_entries en WHERE en.id=p_entry AND en.updated_at IS NOT DISTINCT FROM p_expected_updated_at) OR p_expected_updated_at IS NULL THEN RAISE EXCEPTION 'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดรายการใหม่ก่อนลบ'; END IF;
 DELETE FROM public.sports_football_player_details WHERE entry_id=p_entry;
 DELETE FROM public.sports_roster_staff WHERE entry_id=p_entry;
 DELETE FROM public.sports_athletes WHERE entry_id=p_entry;
 DELETE FROM public.sports_entries WHERE id=p_entry;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบสมัคร'; END IF;
 RETURN p_entry;
END $$;
REVOKE ALL ON FUNCTION public.sports_school_delete_entry_v1(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sports_school_delete_entry_v1(uuid,timestamptz) TO authenticated;
-- Existing team registration functions already accept edits; expose guarded entry-specific wrappers.
CREATE OR REPLACE FUNCTION public.sports_school_edit_team_v1(p_entry uuid,p_event uuid,p_school uuid,p_players jsonb,p_coaches jsonb,p_sport text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved uuid;
BEGIN
 PERFORM public.sports_school_entry_guard_v1(p_entry,p_event,p_school,'edit');
 IF p_sport='football' THEN saved:=public.sports_football_register_v3333(p_entry,p_event,p_school,p_players,p_coaches);
 ELSIF p_sport='basketball' THEN saved:=public.sports_basketball_register(p_event,p_school,p_players,p_coaches);
 ELSIF p_sport='futsal' THEN saved:=public.sports_futsal_register(p_event,p_school,p_players,p_coaches);
 ELSE RAISE EXCEPTION 'ประเภทกีฬาไม่ถูกต้อง'; END IF;
 IF saved IS DISTINCT FROM p_entry THEN RAISE EXCEPTION 'รหัสใบสมัครไม่ตรง'; END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.sports_school_edit_team_v1(uuid,uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sports_school_edit_team_v1(uuid,uuid,uuid,jsonb,jsonb,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT 'READY' AS school_self_service;
