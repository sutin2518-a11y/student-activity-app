-- 056: fix NULL individual-athletics quota ONLY in the admin move RPC.
-- Run after 055. No registration, event, athlete, or photo rows are changed.
begin;
set local lock_timeout = '3s';
do $patch$
declare
  fn regprocedure := to_regprocedure('public.sports_admin_move_athletics_entry(uuid,uuid,uuid,timestamptz,text,boolean)');
  def text;
  old_pattern constant text := 'coalesce[[:space:]]*\([[:space:]]*dst\.max_athletes_per_entry[[:space:]]*,[[:space:]]*0[[:space:]]*\)[[:space:]]*<[[:space:]]*player_count';
  new_expr constant text := 'coalesce(dst.max_athletes_per_entry, case when dst_relay then 0 else 1 end)<player_count';
  n int;
begin
  if fn is null then
    raise exception 'STOP: SQL 055 move function not found; no changes';
  end if;
  def := pg_get_functiondef(fn::oid);
  select count(*) into n from regexp_matches(def, old_pattern, 'gi');
  if n=0 and strpos(def,new_expr)>0 then
    raise notice '056 already applied';
  elsif n=1 and strpos(def,new_expr)=0 then
    -- Preserve the live function body, owner, grants and all other safeguards.
    def := regexp_replace(def, old_pattern, new_expr, 'i');
    execute def;
  else
    raise exception 'STOP: unexpected move RPC definition; no changes';
  end if;
  if strpos(pg_get_functiondef(fn::oid),new_expr)=0 then
    raise exception 'STOP: verification failed; no changes';
  end if;
end
$patch$;
notify pgrst, 'reload schema';
commit;
select case when strpos(pg_get_functiondef(to_regprocedure(
  'public.sports_admin_move_athletics_entry(uuid,uuid,uuid,timestamptz,text,boolean)'
)::oid),
'coalesce(dst.max_athletes_per_entry, case when dst_relay then 0 else 1 end)<player_count')>0
then 'READY' else 'CHECK' end as athletics_null_quota_fix;
