-- Targeted staff optionality patch: no table or existing row changes.
begin;
do $patch$
declare v_def text; v_old text; v_new text;
begin
  v_def := replace(pg_catalog.pg_get_functiondef('public.sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n');
  if strpos(v_def,$new0$if nullif(btrim(p_staff->1->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;
 for a in select value from jsonb_array_elements(p_staff) loop
   if jsonb_typeof(a) is distinct from 'object' or length(coalesce(a->>'name',''))>160 or (nullif(btrim(a->>'name'),'') is null and nullif(btrim(a->>'birth_date'),'') is not null) then raise exception 'ข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;$new0$)>0 and strpos(v_def,$new1$jsonb_build_object('name',coalesce(btrim(c->>'name'),''),'phone'$new1$)>0 then
    raise notice 'Already applied: sports_takraw_save_form(uuid,uuid,uuid,jsonb,jsonb)';
  else
    v_old := $old0$for a in select value from jsonb_array_elements(p_staff) loop
   if nullif(btrim(a->>'name'),'') is null or length(a->>'name')>160 then raise exception 'กรอกชื่อเจ้าหน้าที่ทั้ง 3 ตำแหน่ง'; end if;$old0$;
    v_new := $new0$if nullif(btrim(p_staff->1->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;
 for a in select value from jsonb_array_elements(p_staff) loop
   if jsonb_typeof(a) is distinct from 'object' or length(coalesce(a->>'name',''))>160 or (nullif(btrim(a->>'name'),'') is null and nullif(btrim(a->>'birth_date'),'') is not null) then raise exception 'ข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;$new0$;
    if (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old) <> 1 then raise exception 'STOP: unexpected RPC definition; no changes committed'; end if;
    v_def := replace(v_def,v_old,v_new);
    v_old := $old1$jsonb_build_object('name',btrim(c->>'name'),'phone'$old1$;
    v_new := $new1$jsonb_build_object('name',coalesce(btrim(c->>'name'),''),'phone'$new1$;
    if (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old) <> 1 then raise exception 'STOP: unexpected RPC definition; no changes committed'; end if;
    v_def := replace(v_def,v_old,v_new);
    execute v_def;
  end if;
  v_def := replace(pg_catalog.pg_get_functiondef('public.sports_basketball_register(uuid,uuid,jsonb,jsonb)'::regprocedure), E'\r\n', E'\n');
  if strpos(v_def,'กรุณากรอกชื่อและเบอร์เสื้อทุกคน')=0 then raise exception 'STOP: migration 049 not detected'; end if;
  if strpos(v_def,$new0$if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<>2 then raise exception 'รูปแบบข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;
 if nullif(btrim(p_coaches->0->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;$new0$)>0 and strpos(v_def,$new1$if exists(select 1 from jsonb_array_elements(p_coaches) c where jsonb_typeof(c) is distinct from 'object' or ((nullif(btrim(c->>'name'),'') is not null or nullif(btrim(c->>'phone'),'') is not null) and (nullif(btrim(c->>'name'),'') is null or regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')))
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์เจ้าหน้าที่ที่ระบุให้ครบ'; end if;$new1$)>0 and strpos(v_def,$new2$if (nullif(btrim(p_coaches->0->>'manager_name'),'') is not null or nullif(btrim(p_coaches->0->>'manager_phone'),'') is not null) and (nullif(btrim(p_coaches->0->>'manager_name'),'') is null or regexp_replace(coalesce(p_coaches->0->>'manager_phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$') then raise exception 'หากระบุผู้จัดการทีม กรุณากรอกชื่อและเบอร์โทรให้ครบ'; end if;$new2$)>0 then
    raise notice 'Already applied: sports_basketball_register(uuid,uuid,jsonb,jsonb)';
  else
    v_old := $old0$if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<>2 then raise exception 'ต้องมีผู้ฝึกสอนและผู้ช่วยผู้ฝึกสอน 2 คน'; end if;$old0$;
    v_new := $new0$if p_coaches is null or jsonb_typeof(p_coaches)<>'array' or jsonb_array_length(p_coaches)<>2 then raise exception 'รูปแบบข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'; end if;
 if nullif(btrim(p_coaches->0->>'name'),'') is null then raise exception 'กรุณากรอกชื่อผู้ฝึกสอนอย่างน้อย 1 คน'; end if;$new0$;
    if (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old) <> 1 then raise exception 'STOP: unexpected RPC definition; no changes committed'; end if;
    v_def := replace(v_def,v_old,v_new);
    v_old := $old1$if exists(select 1 from jsonb_array_elements(p_coaches) c where nullif(btrim(c->>'name'),'') is null or
    regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์ครูผู้ควบคุมให้ครบ'; end if;$old1$;
    v_new := $new1$if exists(select 1 from jsonb_array_elements(p_coaches) c where jsonb_typeof(c) is distinct from 'object' or ((nullif(btrim(c->>'name'),'') is not null or nullif(btrim(c->>'phone'),'') is not null) and (nullif(btrim(c->>'name'),'') is null or regexp_replace(coalesce(c->>'phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$')))
  then raise exception 'กรุณากรอกชื่อและเบอร์โทรศัพท์เจ้าหน้าที่ที่ระบุให้ครบ'; end if;$new1$;
    if (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old) <> 1 then raise exception 'STOP: unexpected RPC definition; no changes committed'; end if;
    v_def := replace(v_def,v_old,v_new);
    v_old := $old2$if nullif(btrim(p_coaches->0->>'manager_name'),'') is null or regexp_replace(coalesce(p_coaches->0->>'manager_phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$' then raise exception 'กรอกผู้จัดการทีมและเบอร์โทรให้ครบ'; end if;$old2$;
    v_new := $new2$if (nullif(btrim(p_coaches->0->>'manager_name'),'') is not null or nullif(btrim(p_coaches->0->>'manager_phone'),'') is not null) and (nullif(btrim(p_coaches->0->>'manager_name'),'') is null or regexp_replace(coalesce(p_coaches->0->>'manager_phone',''),'[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$') then raise exception 'หากระบุผู้จัดการทีม กรุณากรอกชื่อและเบอร์โทรให้ครบ'; end if;$new2$;
    if (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old) <> 1 then raise exception 'STOP: unexpected RPC definition; no changes committed'; end if;
    v_def := replace(v_def,v_old,v_new);
    execute v_def;
  end if;
end;
$patch$;
notify pgrst, 'reload schema';
commit;
