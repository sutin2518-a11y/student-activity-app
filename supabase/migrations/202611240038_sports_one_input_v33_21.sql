-- v33.21 | One confirmed award ranking -> results, medals, certificates.
-- Apply AFTER 031,032,036,037. No existing data is rewritten on installation.
begin;
-- Existing event referee assignments now permit final award ranking for that event ONLY.
-- Dedicated award officials retain their existing access; printing rights remain separate.
create or replace function public.sports_cert_can_record(p_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
   select 1 from public.sports_events e
   join public.sports_competitions c on c.id=e.competition_id
   join auth.users u on u.id=auth.uid()
   where e.id=p_event and c.slug='phayao-secondary-group-sports-2569'
     and u.email_confirmed_at is not null
     and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
     and (exists(select 1 from public.sports_certificate_officials o
       where o.event_id=e.id and o.competition_id=e.competition_id and o.is_active and o.email=lower(btrim(u.email)))
       or exists(select 1 from public.sports_event_referees o
       where o.event_id=e.id and o.competition_id=e.competition_id and o.is_active and o.email=lower(btrim(u.email))))
 );
$$;
revoke all on function public.sports_cert_can_record(uuid) from public,anon;
grant execute on function public.sports_cert_can_record(uuid) to authenticated;

-- Admin may inspect rankings and team labels, never publish unless explicitly assigned.
create or replace function public.sports_award_can_inspect(p_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.sports_cert_can_record(p_event) or exists(
  select 1 from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
  where e.id=p_event and c.slug='phayao-secondary-group-sports-2569' and public.sports_stage3_admin(e.competition_id)
 ));
$$;
revoke all on function public.sports_award_can_inspect(uuid) from public,anon;
grant execute on function public.sports_award_can_inspect(uuid) to authenticated;

create or replace function public.sports_cert_event_entries(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not public.sports_award_can_inspect(p_event) then raise exception 'ไม่มีสิทธิ์ดูรายชื่อทีมเพื่อส่งผล' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',en.id,'school_name',s.name,
   'entry_name',en.entry_name,'athlete_count',(
     select count(*) from public.sports_athletes a where a.entry_id=en.id
   )) order by s.name,en.entry_name),'[]'::jsonb) into v_result
 from public.sports_entries en join public.sports_schools s on s.id=en.school_id
 where en.event_id=p_event and en.status='approved';
 return v_result;
end; $$;
revoke all on function public.sports_cert_event_entries(uuid) from public,anon;
grant execute on function public.sports_cert_event_entries(uuid) to authenticated;

create or replace function public.sports_cert_result_details(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if not public.sports_award_can_inspect(p_event) then raise exception 'ไม่มีสิทธิ์ดูผลที่ยังไม่เผยแพร่' using errcode='42501'; end if;
 select jsonb_build_object('status',r.status,'reason',r.rejection_reason,'placements',
   coalesce((select jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
     order by p.rank,p.slot) from public.sports_certificate_placements p where p.event_id=p_event),'[]'::jsonb))
 into v_result from public.sports_certificate_results r where r.event_id=p_event;
 return coalesce(v_result,'null'::jsonb);
end; $$;
revoke all on function public.sports_cert_result_details(uuid) from public,anon;
grant execute on function public.sports_cert_result_details(uuid) to authenticated;

-- Read-only suggestions: exact unique school-to-approved-entry mapping. Never infer
-- unfinished brackets, ambiguous school names, or different medal rules.
create or replace function public.sports_award_suggestions(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype; v_source text; v_matches jsonb;
 v_final jsonb; v_semi jsonb; v_names text[]; v_winners text[]; v_name text;
 v_entry uuid; v_count int; v_rank int; v_slot int; v_i int:=0; v_awards jsonb:='[]'::jsonb;
begin
 if not public.sports_cert_can_record(p_event) then raise exception 'ไม่มีสิทธิ์อ่านผลรายการนี้' using errcode='42501'; end if;
 select * into strict v_event from public.sports_events where id=p_event;
 if v_event.event_type <> 'team' then return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if exists(select 1 from public.sports_football_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='football';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.status='completed',
   'winner',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team1_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team2_name end,
   'loser',case when m.score1>m.score2 or (m.score1=m.score2 and m.penalty1>m.penalty2) then m.team2_name when m.score2>m.score1 or (m.score1=m.score2 and m.penalty2>m.penalty1) then m.team1_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_football_matches m where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.status<>'cancelled';
 elsif exists(select 1 from public.sports_esports_matches where event_id=p_event and competition_id=v_event.competition_id) then
  v_source:='esports';
  select coalesce(jsonb_agg(jsonb_build_object('stage',m.stage,'done',m.match_status='completed',
   'winner',case when m.score1>m.score2 then a.school_name when m.score2>m.score1 then b.school_name end,
   'loser',case when m.score1>m.score2 then b.school_name when m.score2>m.score1 then a.school_name end) order by m.match_no),'[]'::jsonb) into v_matches
   from public.sports_esports_matches m left join public.sports_esports_group_teams a on a.id=m.team1_id and a.event_id=m.event_id and a.competition_id=m.competition_id
   left join public.sports_esports_group_teams b on b.id=m.team2_id and b.event_id=m.event_id and b.competition_id=m.competition_id
   where m.event_id=p_event and m.competition_id=v_event.competition_id and m.stage in ('final','semifinal') and m.match_status<>'cancelled';
 else return jsonb_build_object('status','manual','placements','[]'::jsonb); end if;
 if (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='final')<>1
 or (select count(*) from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal')<>2
 or exists(select 1 from jsonb_array_elements(v_matches) x where x->>'done' is distinct from 'true' or nullif(btrim(x->>'winner'),'') is null or nullif(btrim(x->>'loser'),'') is null)
 then return jsonb_build_object('status','incomplete','source',v_source,'placements','[]'::jsonb); end if;
 select x into v_final from jsonb_array_elements(v_matches) x where x->>'stage'='final';
 select jsonb_agg(x) into v_semi from jsonb_array_elements(v_matches) x where x->>'stage'='semifinal';
 v_names:=array[v_final->>'winner',v_final->>'loser',v_semi->0->>'loser',v_semi->1->>'loser'];
 v_winners:=array[v_semi->0->>'winner',v_semi->1->>'winner'];
 if not (v_names[1]=any(v_winners) and v_names[2]=any(v_winners)) or (select count(distinct n) from unnest(v_names) n)<>4 then
 return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
 foreach v_name in array v_names loop
  select count(*),min(en.id::text)::uuid into v_count,v_entry from public.sports_entries en join public.sports_schools s on s.id=en.school_id
   where en.event_id=p_event and en.competition_id=v_event.competition_id and en.status='approved' and regexp_replace(regexp_replace(btrim(s.name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g')=regexp_replace(regexp_replace(btrim(v_name),'^โรงเรียน[[:space:]]*',''),'[[:space:]]+','','g');
  if v_count<>1 then return jsonb_build_object('status','ambiguous','source',v_source,'placements','[]'::jsonb); end if;
  v_i:=v_i+1; v_rank:=least(v_i,3); v_slot:=case when v_i=4 then 2 else 1 end;
  v_awards:=v_awards||jsonb_build_array(jsonb_build_object('rank',v_rank,'slot',v_slot,'entry_id',v_entry));
 end loop;
 return jsonb_build_object('status','ready','source',v_source,'placements',v_awards);
end $$;
revoke all on function public.sports_award_suggestions(uuid) from public,anon;
grant execute on function public.sports_award_suggestions(uuid) to authenticated;

-- Read-only receipt for the already atomic publisher in 031; no extra writes.
create or replace function public.sports_award_receipt(p_event uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_result public.sports_certificate_results%rowtype; v_count int; v_ranks int; v_rank_total int; v_medals int; v_docs int; v_without int; v_synced boolean;
begin
 if not public.sports_award_can_inspect(p_event) then raise exception 'ไม่มีสิทธิ์ดูสถานะรายการนี้' using errcode='42501'; end if;
 select * into v_result from public.sports_certificate_results where event_id=p_event;
 if not found or v_result.status<>'published' then return null; end if;
 select count(*) into v_count from public.sports_certificate_placements where event_id=p_event;
 select count(*) into v_ranks from public.sports_event_results r join public.sports_certificate_placements p on p.event_id=r.event_id and p.entry_id=r.entry_id and p.rank=r.rank where r.event_id=p_event;
 select count(*) into v_rank_total from public.sports_event_results where event_id=p_event and rank is not null;
 select count(*) into v_medals from public.sports_medals where event_id=p_event;
 select count(*) into v_docs from public.sports_certificates_issued where event_id=p_event and certificate_kind='award' and is_active and revoked_at is null;
 select count(*) into v_without from public.sports_certificate_placements p where p.event_id=p_event and not exists(select 1 from public.sports_certificates_issued i where i.event_id=p_event and i.entry_id=p.entry_id and i.award_rank=p.rank and i.certificate_kind='award' and i.is_active and i.revoked_at is null);
 select not exists (
  (select en.school_id,case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end from public.sports_certificate_placements p join public.sports_entries en on en.id=p.entry_id where p.event_id=p_event
   except all select m.school_id,m.medal_type::text from public.sports_medals m where m.event_id=p_event)
  union all
  (select m.school_id,m.medal_type::text from public.sports_medals m where m.event_id=p_event
   except all select en.school_id,case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end from public.sports_certificate_placements p join public.sports_entries en on en.id=p.entry_id where p.event_id=p_event)
 ) into v_synced;
 return jsonb_build_object('published_at',v_result.published_at,'placements',v_count,'ranks',v_ranks,'medals',v_medals,'certificates',v_docs,'missing_award_entries',v_without,'consistent',v_count>0 and v_ranks=v_count and v_rank_total=v_count and v_medals=v_count and v_synced and v_without=0);
end $$;
revoke all on function public.sports_award_receipt(uuid) from public,anon;
grant execute on function public.sports_award_receipt(uuid) to authenticated;
-- Reinstall the existing transactional publisher and correction RPC with a consistency gate.
create or replace function public.sports_cert_submit(p_event uuid,p_awards jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_expected int;
 v_num int;
 v_status text;
begin
 if not public.sports_cert_can_record(p_event) then
   raise exception 'ไม่มีสิทธิ์ประกาศผลรายการนี้' using errcode='42501';
 end if;
 select * into strict v_event from public.sports_events where id=p_event for share;
 v_expected:=case when v_event.event_type='athletics' then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'จำนวนอันดับไม่ครบตามประเภทการแข่งขัน';
 end if;
 if exists(
   select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
      or x.rank not between 1 and 3 or x.slot not between 1 and 2
      or (x.rank<>3 and x.slot<>1)
      or (v_event.event_type='athletics' and x.slot<>1)
 ) then raise exception 'ข้อมูลอันดับไม่ถูกต้อง'; end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid)) <> v_expected
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
   or not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
   or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) as x(rank int,slot int,entry_id uuid) where rank=3 and slot=2))
 then raise exception 'อันดับซ้ำหรือผู้ได้รับรางวัลซ้ำ กรุณาตรวจสอบ'; end if;

 -- Registration is considered received when the school submits it. The existing
 -- auto-receive trigger normalizes new sports_entries to status='approved'.
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_event.competition_id
   and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then
   raise exception 'ต้องเลือกใบสมัครที่โรงเรียนส่งข้อมูลแล้วจากรายการนี้เท่านั้น';
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 select status into v_status from public.sports_certificate_results where event_id=p_event for update;
 if v_status='published' then
   raise exception 'รายการนี้ประกาศผลแล้ว หากต้องแก้ไขให้ใช้กระบวนการยกเลิก/ออกเกียรติบัตรฉบับใหม่';
 end if;
 if v_status is not null and v_status not in ('submitted','rejected','approved') then
   raise exception 'ไม่สามารถประกาศผลจากสถานะปัจจุบันได้';
 end if;

 -- Publish immediately in the same transaction as the placements.
 insert into public.sports_certificate_results(
   event_id,competition_id,status,rejection_reason,submitted_by,submitted_at,
   approved_by,approved_at,published_at,updated_at
 ) values(p_event,v_event.competition_id,'published','',auth.uid(),now(),null,null,now(),now())
 on conflict(event_id) do update set
   status='published',rejection_reason='',submitted_by=auth.uid(),submitted_at=now(),
   approved_by=null,approved_at=null,published_at=now(),updated_at=now();

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_event.competition_id,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 -- Sync the central individual/athletics results shown on the public results page.
 -- Clear only the previous rank, retaining any previously recorded performance data.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,now()
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set
   school_id=excluded.school_id,
   entry_name=excluded.entry_name,
   rank=excluded.rank,
   recorded_at=now();

 -- Replace the medal rows for this event from the committee's submitted placements.
 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_event.competition_id,p_event,en.school_id,
   case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Awards become available to each school's certificate-print page immediately.
 perform public.sports_cert_issue_internal(p_event,'award');
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลอันดับ เหรียญ หรือเกียรติบัตรไม่ครบ ระบบยกเลิกการบันทึกทั้งหมด กรุณาตรวจใบสมัครและติดต่อผู้ดูแล';
 end if;
 return jsonb_build_object('status','published','count',v_expected,'published_at',now());
end; $$;
revoke all on function public.sports_cert_submit(uuid,jsonb) from public,anon;
grant execute on function public.sports_cert_submit(uuid,jsonb) to authenticated;

create or replace function public.sports_admin_correct_published_result(
  p_event uuid, p_awards jsonb, p_reason text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_event public.sports_events%rowtype;
 v_result public.sports_certificate_results%rowtype;
 v_comp uuid;
 v_expected int;
 v_num int;
 v_old jsonb;
 v_new jsonb;
 v_reason text:=btrim(coalesce(p_reason,''));
 v_change uuid:=gen_random_uuid();
 v_revoked int:=0;
 v_issued int:=0;
 v_athletes int:=0;
 v_coaches int:=0;
 v_timestamp timestamptz:=now();
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ Admin' using errcode='42501'; end if;
 select * into v_event from public.sports_events where id=p_event;
 if not found or not public.sports_stage3_admin(v_event.competition_id) then
   raise exception 'เฉพาะ Admin หลักเท่านั้นที่แก้ผลหลังประกาศได้' using errcode='42501';
 end if;
 v_comp:=v_event.competition_id;
 if length(v_reason)<8 or length(v_reason)>1000 then
   raise exception 'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 และไม่เกิน 1,000 ตัวอักษร';
 end if;
 v_expected:=case when v_event.event_type='athletics' then 3 else 4 end;
 if p_awards is null or jsonb_typeof(p_awards)<>'array' or jsonb_array_length(p_awards)<>v_expected then
   raise exception 'ต้องกรอกอันดับให้ครบตามประเภทกีฬา';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid)
   where x.rank is null or x.slot is null or x.entry_id is null
     or x.rank not between 1 and 3 or x.slot not between 1 and 2
     or (x.rank<>3 and x.slot<>1)
     or (v_event.event_type='athletics' and x.slot<>1)) then
   raise exception 'ข้อมูลอันดับไม่ถูกต้อง';
 end if;
 if (select count(distinct (x.rank,x.slot)) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or (select count(distinct x.entry_id) from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid))<>v_expected
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=1 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=2 and slot=1)
  or not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=1)
  or (v_expected=4 and not exists(select 1 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid) where rank=3 and slot=2)) then
   raise exception 'อันดับซ้ำหรือผู้แข่งขันได้รับหลายอันดับ';
 end if;
 select count(*) into v_num from public.sports_entries en
 where en.event_id=p_event and en.competition_id=v_comp and en.status='approved'
   and en.id in (select x.entry_id from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid));
 if v_num<>v_expected then raise exception 'กรุณาเลือกเฉพาะใบสมัครที่โรงเรียนส่งแล้วในรายการนี้'; end if;

 -- Same lock used by the assigned-official publisher; then the certificate lock.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94723);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),94724);
 select * into v_result from public.sports_certificate_results where event_id=p_event for update;
 if not found or v_result.status<>'published' then
   raise exception 'รายการนี้ยังไม่ประกาศผล หรือสถานะถูกเปลี่ยนไปแล้ว';
 end if;
 if p_expected_updated_at is null or v_result.updated_at is distinct from p_expected_updated_at then
   raise exception 'มีการเปลี่ยนแปลงผลระหว่างที่เปิดหน้า กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('rank',p.rank,'slot',p.slot,'entry_id',p.entry_id)
   order by p.rank,p.slot),'[]'::jsonb) into v_old
 from public.sports_certificate_placements p where p.event_id=p_event;
 select coalesce(jsonb_agg(jsonb_build_object('rank',x.rank,'slot',x.slot,'entry_id',x.entry_id)
   order by x.rank,x.slot),'[]'::jsonb) into v_new
 from jsonb_to_recordset(p_awards) x(rank int,slot int,entry_id uuid);
 if v_old=v_new then raise exception 'อันดับยังเหมือนเดิม ไม่จำเป็นต้องออกเกียรติบัตรใหม่'; end if;

 -- Invalidate ALL unrevoked award documents for this event, including temporarily
 -- inactive ones. Keep old snapshots, QR tokens, reasons and serial numbers forever.
 update public.sports_certificates_issued
   set is_active=false,revoked_at=v_timestamp,revoked_by=auth.uid(),
       revocation_reason='แก้ผลหลังประกาศโดย Admin: '||v_reason
 where event_id=p_event and certificate_kind='award' and revoked_at is null;
 get diagnostics v_revoked=row_count;

 delete from public.sports_certificate_placements where event_id=p_event;
 insert into public.sports_certificate_placements(event_id,competition_id,entry_id,rank,slot)
 select p_event,v_comp,x.entry_id,x.rank,x.slot
 from jsonb_to_recordset(p_awards) x(rank smallint,slot smallint,entry_id uuid);

 update public.sports_certificate_results
 set status='published',published_at=v_timestamp,updated_at=v_timestamp
 where event_id=p_event;

 -- Preserve match scores and athletics performance values; modify only ranks.
 update public.sports_event_results set rank=null where event_id=p_event;
 insert into public.sports_event_results(event_id,entry_id,school_id,entry_name,rank,recorded_at)
 select p_event,en.id,en.school_id,en.entry_name,p.rank,v_timestamp
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict(event_id,entry_id) do update set school_id=excluded.school_id,
    entry_name=excluded.entry_name,rank=excluded.rank,recorded_at=excluded.recorded_at;

 delete from public.sports_medals where event_id=p_event;
 insert into public.sports_medals(competition_id,event_id,school_id,medal_type)
 select v_comp,p_event,en.school_id,
  case p.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end
 from public.sports_certificate_placements p
 join public.sports_entries en on en.id=p.entry_id
 where p.event_id=p_event
 on conflict do nothing;

 -- Generate entirely new immutable award documents. The ordinary issue_internal
 -- cannot be reused: the UNIQUE key of a canceled original remains reserved.
 with eligible as (
   select en.id entry_id,en.school_id,s.name school_name,a.full_name recipient_name,
     'athlete:'||coalesce(a.roster_position::text,
       row_number() over(partition by en.id order by a.roster_position nulls last,a.full_name)::text) base_key,
     p.rank award_rank
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   join public.sports_athletes a on a.entry_id=en.id
   where p.event_id=p_event
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,a.entry_id,a.school_id,'athlete',
   left('correction:'||v_change::text||':'||a.base_key,200),
   a.recipient_name,a.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   a.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from eligible a join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp;
 get diagnostics v_athletes=row_count;

 with ranked as (
   select en.id entry_id,en.school_id,s.name school_name,p.rank award_rank,
     coalesce(nullif(st.coaches,'[]'::jsonb),
       case when nullif(btrim(coalesce(en.coach_name,'')),'') is not null
         then jsonb_build_array(jsonb_build_object('name',en.coach_name)) else '[]'::jsonb end) staff
   from public.sports_certificate_placements p
   join public.sports_entries en on en.id=p.entry_id
   join public.sports_schools s on s.id=en.school_id
   left join public.sports_roster_staff st on st.entry_id=en.id
   where p.event_id=p_event
 ), expanded as (
   select en.*,staff.pos,btrim(coalesce(staff.person->>'name','')) coach_name
   from ranked en cross join lateral jsonb_array_elements(en.staff) with ordinality staff(person,pos)
 )
 insert into public.sports_certificates_issued(
   competition_id,event_id,entry_id,school_id,recipient_type,recipient_key,
   recipient_name,school_name,event_name,competition_name,certificate_title,
   award_rank,certificate_kind,signer_name,signer_position
 )
 select v_comp,p_event,en.entry_id,en.school_id,'coach',
   left('correction:'||v_change::text||':coach:'||en.pos::text,200),
   en.coach_name,en.school_name,v_event.sport_name,c.name,coalesce(cfg.title,'เกียรติบัตร'),
   en.award_rank,'award',coalesce(cfg.signer_name,''),coalesce(cfg.signer_position,'')
 from expanded en join public.sports_competitions c on c.id=v_comp
 left join public.sports_certificate_settings cfg on cfg.competition_id=v_comp
 where en.coach_name<>'';
 get diagnostics v_coaches=row_count;
 v_issued:=v_athletes+v_coaches;
 if v_issued=0 then
   raise exception 'ไม่พบรายชื่อนักกีฬา/ครูผู้ควบคุมสำหรับออกเกียรติบัตรใหม่ ระบบจึงไม่แก้ไขผลและไม่ยกเลิกเอกสารเดิม';
 end if;

 -- Connect 1:1 matching recipients to the new document without mis-linking
 -- different people with the same name. Old QR stays revoked in all cases.
 with candidate as (
   select old.id old_id,new.id new_id,
     count(*) over(partition by old.id) matches_old,
     count(*) over(partition by new.id) matches_new
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new
     on new.event_id=old.event_id and new.entry_id=old.entry_id
      and new.recipient_type=old.recipient_type and new.recipient_name=old.recipient_name
   where old.event_id=p_event and old.certificate_kind='award'
     and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 ), pairs as (
   select old_id,new_id from candidate where matches_old=1 and matches_new=1
 )
 update public.sports_certificates_issued old
    set replaced_by=pairs.new_id,replacement_reason=v_reason
 from pairs where old.id=pairs.old_id;

 -- Historical predecessor QRs should point to the newest replacement as well.
 with recursive linked(ancestor_id,replacement_id) as (
   select i.id,i.replaced_by from public.sports_certificates_issued i
   where i.event_id=p_event and i.revoked_at=v_timestamp and i.replaced_by is not null
   union all
   select prior.id,linked.replacement_id
   from public.sports_certificates_issued prior
   join linked on prior.replaced_by=linked.ancestor_id
   where prior.id<>linked.replacement_id
 )
 update public.sports_certificates_issued old set replaced_by=linked.replacement_id
 from linked where old.id=linked.ancestor_id and old.replaced_by is distinct from linked.replacement_id;

 -- Set replaces_id only when an unambiguous immediate predecessor exists.
 with pairs as (
   select old.id old_id,new.id new_id,
      count(*) over(partition by new.id) n_new,
      count(*) over(partition by old.id) n_old
   from public.sports_certificates_issued old
   join public.sports_certificates_issued new on new.id=old.replaced_by
   where old.event_id=p_event and old.revoked_at=v_timestamp
     and new.recipient_key like ('correction:'||v_change::text||':%')
 )
 update public.sports_certificates_issued new set replaces_id=pairs.old_id
 from pairs where new.id=pairs.new_id and pairs.n_new=1 and pairs.n_old=1
   and new.replaces_id is null;

 insert into public.sports_result_admin_corrections(
  id,event_id,competition_id,corrected_by,correction_reason,
  previous_placements,corrected_placements,previous_published_at,corrected_at,
  revoked_award_certificates,newly_issued_award_certificates
 ) values (
  v_change,p_event,v_comp,auth.uid(),v_reason,
  v_old,v_new,v_result.published_at,v_timestamp,v_revoked,v_issued
 );
 if not coalesce((public.sports_award_receipt(p_event)->>'consistent')::boolean,false) then
   raise exception 'ผลที่แก้ไขยังเชื่อมโยงไม่ครบ ระบบคืนข้อมูลเดิมทั้งหมด กรุณาตรวจใบสมัครและเหรียญรางวัล';
 end if;
 return jsonb_build_object('status','published','correction_id',v_change,
   'revoked_award_certificates',v_revoked,
   'new_award_certificates',v_issued,
   'updated_at',v_timestamp);
end; $$;
revoke all on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) from public,anon;
grant execute on function public.sports_admin_correct_published_result(uuid,jsonb,text,timestamptz) to authenticated;

-- Once published, browser writes to central ranks and medals must use the
-- existing audited admin correction/reset RPCs. Do not broaden existing RLS rights.
create or replace function public.sports_award_is_published(p_event uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sports_certificate_results r where r.event_id=p_event and r.status='published');
$$;
revoke all on function public.sports_award_is_published(uuid) from public,anon;
grant execute on function public.sports_award_is_published(uuid) to authenticated;
alter table public.sports_event_results enable row level security;
alter table public.sports_medals enable row level security;
-- Scope to authenticated browser users; security-definer publisher/corrections
-- keep their established ownership/transaction semantics.
drop policy if exists "v33_21 published insert guard" on public.sports_event_results;
create policy "v33_21 published insert guard" on public.sports_event_results as restrictive for insert to authenticated
with check (not public.sports_award_is_published(event_id));
drop policy if exists "v33_21 published update guard" on public.sports_event_results;
create policy "v33_21 published update guard" on public.sports_event_results as restrictive for update to authenticated
using (not public.sports_award_is_published(event_id)) with check (not public.sports_award_is_published(event_id));
drop policy if exists "v33_21 published delete guard" on public.sports_event_results;
create policy "v33_21 published delete guard" on public.sports_event_results as restrictive for delete to authenticated
using (not public.sports_award_is_published(event_id));
drop policy if exists "v33_21 published insert guard" on public.sports_medals;
create policy "v33_21 published insert guard" on public.sports_medals as restrictive for insert to authenticated
with check (not public.sports_award_is_published(event_id));
drop policy if exists "v33_21 published update guard" on public.sports_medals;
create policy "v33_21 published update guard" on public.sports_medals as restrictive for update to authenticated
using (not public.sports_award_is_published(event_id)) with check (not public.sports_award_is_published(event_id));
drop policy if exists "v33_21 published delete guard" on public.sports_medals;
create policy "v33_21 published delete guard" on public.sports_medals as restrictive for delete to authenticated
using (not public.sports_award_is_published(event_id));

commit;
notify pgrst, 'reload schema';
