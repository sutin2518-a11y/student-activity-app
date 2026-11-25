-- v33.35.1: official basketball registration does not require birth date or grade.
-- Only replaces matching validation clauses in the currently deployed basketball RPC.
-- No table/data updates, no changes to other sports, roles, policies, or grants.
begin;
do $patch$
declare
  v_def text;
  v_old text := $old$or coalesce(a->>'grade_level','') !~ '^ม\.[1-6]$' or nullif(a->>'birth_date','') is null or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')$old$;
  v_new text := $new$or (nullif(a->>'grade_level','') is not null and a->>'grade_level' !~ '^ม\.[1-6]$') or coalesce(a->>'jersey_number','') !~ '^([0-9]|[1-9][0-9])$')$new$;
  v_old_birth text := $oldbirth$if exists(select 1 from jsonb_array_elements(p_players) a where (a->>'birth_date')::date>current_date or (a->>'birth_date')::date<'1900-01-01' or (v_event.event_code in ('GS3-BB-15M','GS3-BB-15F') and (a->>'birth_date')::date<'2011-01-01')) then raise exception 'วันเกิดไม่ถูกต้อง หรือไม่ผ่านเกณฑ์รุ่น 15 ปี'; end if;$oldbirth$;
  v_new_birth text := $newbirth$if exists(select 1 from jsonb_array_elements(p_players) a where nullif(a->>'birth_date','')::date>current_date or nullif(a->>'birth_date','')::date<'1900-01-01' or (v_event.event_code in ('GS3-BB-15M','GS3-BB-15F') and nullif(a->>'birth_date','')::date<'2011-01-01')) then raise exception 'วันเกิดไม่ถูกต้อง หรือไม่ผ่านเกณฑ์รุ่น 15 ปี'; end if;$newbirth$;
begin
  v_def := pg_catalog.pg_get_functiondef('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'::regprocedure);
  if strpos(v_def,v_new)>0 and strpos(v_def,v_new_birth)>0 and strpos(v_def,'กรุณากรอกชื่อและเบอร์เสื้อทุกคน')>0 then
    raise notice 'v33.35.1 already installed'; return;
  end if;
  if strpos(v_def,v_old)=0 or strpos(v_def,v_old_birth)=0 or strpos(v_def,'กรุณากรอกชื่อ วันเกิด และเบอร์เสื้อทุกคน')=0 then
    raise exception 'STOP: basketball RPC differs from expected version; no changes made';
  end if;
  v_def := replace(v_def,v_old,v_new);
  v_def := replace(v_def,v_old_birth,v_new_birth);
  v_def := replace(v_def,'กรุณากรอกชื่อ วันเกิด และเบอร์เสื้อทุกคน','กรุณากรอกชื่อและเบอร์เสื้อทุกคน');
  execute v_def;
end;
$patch$;
commit;
