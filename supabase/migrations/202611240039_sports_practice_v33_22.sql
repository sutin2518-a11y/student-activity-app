-- v33.22: isolated practice workspaces in the same project. Requires 038.
-- No production sports table is written by these functions. No real names or photos.
begin;
create table if not exists public.sports_practice_workspaces (
 event_id uuid primary key,
 revision uuid not null default gen_random_uuid(),
 state jsonb not null check (jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
create table if not exists public.sports_practice_reset_audit (
 id uuid primary key default gen_random_uuid(),
 event_id uuid,
 action text not null check(action in ('reset_results','reset_event','reset_all')),
 actor uuid not null,
 summary jsonb not null,
 reset_at timestamptz not null default now()
);
alter table public.sports_practice_workspaces enable row level security;
alter table public.sports_practice_reset_audit enable row level security;
revoke all on public.sports_practice_workspaces,public.sports_practice_reset_audit from public,anon,authenticated;
-- No direct client policies. Access solely via the guarded RPC below.

create or replace function public.sports_practice_summary(p_state jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object(
  'teams',jsonb_array_length(coalesce(p_state->'teams','[]'::jsonb)),
  'athletes',coalesce((select sum((t->>'athletes')::int) from jsonb_array_elements(coalesce(p_state->'teams','[]'::jsonb)) t),0),
  'coaches',coalesce((select sum((t->>'coaches')::int) from jsonb_array_elements(coalesce(p_state->'teams','[]'::jsonb)) t),0),
  'matches',jsonb_array_length(coalesce(p_state->'matches','[]'::jsonb)),
  'rankings',jsonb_array_length(coalesce(p_state->'rankings','[]'::jsonb)),
  'medals',jsonb_array_length(coalesce(p_state->'medals','[]'::jsonb)),
  'certificates',jsonb_array_length(coalesce(p_state->'certificates','[]'::jsonb))
 );
$$;
revoke all on function public.sports_practice_summary(jsonb) from public,anon,authenticated;

create or replace function public.sports_practice_action(p_action text,p_event uuid default null,p_payload jsonb default '{}'::jsonb,p_revision text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_comp uuid; v_admin boolean; v_event public.sports_events%rowtype;
 v_row public.sports_practice_workspaces%rowtype; v_state jsonb; v_snapshot jsonb;
 v_summary jsonb; v_token text; v_result jsonb; v_ranks jsonb; v_medals jsonb; v_certs jsonb;
 v_team int; v_athletes int; v_coaches int; v_a int; v_b int; v_sa int; v_sb int;
 v_expected int; v_i int; v_team_data jsonb; v_count int; v_n int; v_kind text;
 v_reset boolean;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501'; end if;
 select id into strict v_comp from public.sports_competitions where slug='phayao-secondary-group-sports-2569';
 v_admin:=public.sports_stage3_admin(v_comp);
 if p_action is null or p_action not in ('list','read','enable','roster','score','publish','preview_results','preview_event','preview_all','reset_results','reset_event','reset_all') then raise exception 'คำสั่งไม่ถูกต้อง'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',e.sport_name,'code',e.event_code,'type',e.event_type,'enabled',w.event_id is not null) order by e.sport_name,e.event_code,e.id),'[]'::jsonb) into v_result
  from public.sports_events e left join public.sports_practice_workspaces w on w.event_id=e.id
  where e.competition_id=v_comp and (v_admin or public.sports_cert_can_record(e.id));
  return jsonb_build_object('admin',v_admin,'events',v_result);
 end if;
 if p_action in ('preview_all','reset_all') then
  if not v_admin then raise exception 'เฉพาะผู้ดูแลหลัก' using errcode='42501'; end if;
 else
  select * into v_event from public.sports_events where id=p_event and competition_id=v_comp;
  if not found or not (v_admin or public.sports_cert_can_record(p_event)) then raise exception 'ไม่มีสิทธิ์ในรายการนี้' using errcode='42501'; end if;
  if p_action in ('enable','preview_results','preview_event','reset_results','reset_event') and not v_admin then raise exception 'เฉพาะผู้ดูแลหลัก' using errcode='42501'; end if;
 end if;
 -- One short lock for practice writes/preview only. It never locks production rows.
 perform pg_catalog.pg_advisory_xact_lock(3322,39);
 if p_action in ('preview_all','reset_all') then
  -- Only this practice table is included. No production table is deleted or archived.
  select coalesce(jsonb_agg(jsonb_build_object('event_id',w.event_id,'revision',w.revision,'state',w.state) order by w.event_id),'[]'::jsonb) into v_snapshot from public.sports_practice_workspaces w;
  v_token:=pg_catalog.md5('reset_all:'||v_snapshot::text);
  select jsonb_build_object('workspaces',jsonb_array_length(v_snapshot), 'teams',coalesce(sum((s->>'teams')::int),0),'athletes',coalesce(sum((s->>'athletes')::int),0),'coaches',coalesce(sum((s->>'coaches')::int),0),'matches',coalesce(sum((s->>'matches')::int),0),'rankings',coalesce(sum((s->>'rankings')::int),0),'medals',coalesce(sum((s->>'medals')::int),0),'certificates',coalesce(sum((s->>'certificates')::int),0)) into v_summary from jsonb_array_elements(v_snapshot) x cross join lateral (select public.sports_practice_summary(x->'state') s) q;
  if p_action='preview_all' then return jsonb_build_object('token',v_token,'summary',v_summary,'snapshot',v_snapshot); end if;
  if p_revision is distinct from v_token or p_payload->>'confirm' is distinct from 'ลบเฉพาะ TEST' then raise exception 'ข้อมูลเปลี่ยนหรือคำยืนยันไม่ถูกต้อง กรุณาตรวจรายการใหม่'; end if;
  delete from public.sports_practice_workspaces;
  insert into public.sports_practice_reset_audit(event_id,action,actor,summary) values(null,p_action,auth.uid(),v_summary);
  return jsonb_build_object('success',true,'summary',v_summary);
 end if;
 select * into v_row from public.sports_practice_workspaces where event_id=p_event;
 if p_action='enable' then
  if v_row.event_id is not null then raise exception 'เปิดพื้นที่ทดสอบแล้ว กรุณาโหลดข้อมูลใหม่'; end if;
  v_count:=case when v_event.event_type='team' then 5 else 1 end;
  select jsonb_build_object('teams',jsonb_agg(jsonb_build_object('id',i,'name','โรงเรียนจำลอง '||i,'athletes',v_count,'coaches',1) order by i),'matches','[]'::jsonb,'rankings','[]'::jsonb,'medals','[]'::jsonb,'certificates','[]'::jsonb) into v_state from generate_series(1,4) i;
  insert into public.sports_practice_workspaces(event_id,state) values(p_event,v_state) returning * into v_row;
 elsif p_action='read' and v_row.event_id is null then
  return jsonb_build_object('enabled',false,'admin',v_admin);
 elsif v_row.event_id is null then raise exception 'ยังไม่ได้เปิดพื้นที่ทดสอบรายการนี้';
 elsif p_action='read' then null;
 elsif p_action in ('preview_results','preview_event','reset_results','reset_event') then
  v_reset:=p_action in ('preview_results','reset_results');
  v_token:=pg_catalog.md5((case when v_reset then 'reset_results:' else 'reset_event:' end)||p_event::text||':'||v_row.revision::text);
  v_summary:=public.sports_practice_summary(v_row.state);
  if v_reset then v_summary:=v_summary-'teams'-'athletes'-'coaches'; end if;
  if p_action in ('preview_results','preview_event') then return jsonb_build_object('token',v_token,'summary',v_summary,'snapshot',jsonb_build_object('event_id',p_event,'revision',v_row.revision,'state',v_row.state)); end if;
  if p_revision is distinct from v_token or p_payload->>'confirm' is distinct from 'ลบเฉพาะ TEST' then raise exception 'ข้อมูลเปลี่ยนหรือคำยืนยันไม่ถูกต้อง กรุณาตรวจรายการใหม่'; end if;
  if v_reset then
   update public.sports_practice_workspaces set state=state||jsonb_build_object('matches','[]'::jsonb,'rankings','[]'::jsonb,'medals','[]'::jsonb,'certificates','[]'::jsonb,'published_at',null),revision=gen_random_uuid(),updated_at=now() where event_id=p_event;
  else delete from public.sports_practice_workspaces where event_id=p_event; end if;
  insert into public.sports_practice_reset_audit(event_id,action,actor,summary) values(p_event,p_action,auth.uid(),v_summary);
  return jsonb_build_object('success',true,'summary',v_summary);
 else
  if p_revision is distinct from v_row.revision::text then raise exception 'ข้อมูลถูกแก้ไขจากอีกเครื่อง กรุณาโหลดล่าสุด'; end if;
  v_state:=v_row.state;
  if jsonb_array_length(v_state->'rankings')>0 then raise exception 'ประกาศผล TEST แล้ว ผู้ดูแลต้องล้างผล TEST ก่อนแก้ไข'; end if;
  if p_action='roster' then
   v_team:=(p_payload->>'team')::int; v_athletes:=(p_payload->>'athletes')::int; v_coaches:=(p_payload->>'coaches')::int;
   if v_team is null or v_team not between 1 and 4 or v_athletes is null or v_athletes not between 1 and 30 or v_coaches is null or v_coaches not between 0 and 5 then raise exception 'จำนวนผู้เล่นหรือทีมจำลองไม่ถูกต้อง'; end if;
   v_state:=jsonb_set(v_state,array['teams',(v_team-1)::text,'athletes'],to_jsonb(v_athletes));
   v_state:=jsonb_set(v_state,array['teams',(v_team-1)::text,'coaches'],to_jsonb(v_coaches));
  elsif p_action='score' then
   v_a:=(p_payload->>'a')::int; v_b:=(p_payload->>'b')::int; v_sa:=(p_payload->>'sa')::int; v_sb:=(p_payload->>'sb')::int;
   if v_a is null or v_b is null or v_a not between 1 and 4 or v_b not between 1 and 4 or v_a>=v_b or v_sa is null or v_sb is null or v_sa not between 0 and 999 or v_sb not between 0 and 999 then raise exception 'คะแนนหรือคู่แข่งขันไม่ถูกต้อง (ทีม A ต้องน้อยกว่าทีม B)'; end if;
   select coalesce(jsonb_agg(m),'[]'::jsonb) into v_result from jsonb_array_elements(v_state->'matches') m where (m->>'a')::int<>v_a or (m->>'b')::int<>v_b;
   v_state:=jsonb_set(v_state,'{matches}',v_result||jsonb_build_array(jsonb_build_object('a',v_a,'b',v_b,'sa',v_sa,'sb',v_sb)));
  elsif p_action='publish' then
   v_ranks:=p_payload->'teams'; v_expected:=case when v_event.event_type='athletics' then 3 else 4 end;
   if v_ranks is null or jsonb_typeof(v_ranks)<>'array' then raise exception 'อันดับไม่ถูกต้อง'; end if;
   if jsonb_array_length(v_ranks)<>v_expected then raise exception 'จำนวนอันดับไม่ครบ'; end if;
   if exists(select 1 from jsonb_array_elements(v_ranks) x where jsonb_typeof(x)<>'number' or x::text not in ('1','2','3','4')) or (select count(distinct x) from jsonb_array_elements(v_ranks) x)<>v_expected then raise exception 'อันดับซ้ำหรือทีมไม่ถูกต้อง'; end if;
   v_result:='[]'; v_medals:='[]'; v_certs:='[]';
   for v_i in 0..v_expected-1 loop
    v_team:=(v_ranks->>v_i)::int; v_team_data:=v_state->'teams'->(v_team-1);
    v_result:=v_result||jsonb_build_array(jsonb_build_object('rank',least(v_i+1,3),'slot',case when v_i=3 then 2 else 1 end,'team',v_team));
    v_medals:=v_medals||jsonb_build_array(jsonb_build_object('team',v_team,'medal',case v_i when 0 then 'gold' when 1 then 'silver' else 'bronze' end));
    foreach v_kind in array array['athletes','coaches'] loop
     v_n:=(v_team_data->>v_kind)::int;
     for v_count in 1..v_n loop
      v_certs:=v_certs||jsonb_build_array(jsonb_build_object('team',v_team,'rank',least(v_i+1,3),'role',v_kind,'number',v_count,'name',case when v_kind='athletes' then 'นักกีฬาจำลอง ' else 'ครูจำลอง ' end||v_team||'-'||v_count,'test',true));
     end loop;
    end loop;
   end loop;
   v_state:=v_state||jsonb_build_object('rankings',v_result,'medals',v_medals,'certificates',v_certs,'published_at',now());
  end if;
  update public.sports_practice_workspaces set state=v_state,revision=gen_random_uuid(),updated_at=now() where event_id=p_event returning * into v_row;
 end if;
 return jsonb_build_object('enabled',true,'admin',v_admin,'revision',v_row.revision,'state',v_row.state,'summary',public.sports_practice_summary(v_row.state),'updated_at',v_row.updated_at);
end;
$$;
revoke all on function public.sports_practice_action(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.sports_practice_action(text,uuid,jsonb,text) to authenticated;
commit;
