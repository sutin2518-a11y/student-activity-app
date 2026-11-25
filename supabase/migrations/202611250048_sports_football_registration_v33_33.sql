-- Football only. No data reset, no change to shared registration or storage functions.
begin;
create or replace function public.sports_football_register_v3333(
 p_entry uuid,p_event uuid,p_school uuid,p_players jsonb,p_coaches jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare ev public.sports_events%rowtype; existing uuid; saved uuid;
begin
 select e.* into strict ev from public.sports_events e join public.sports_competitions c on c.id=e.competition_id
 where e.id=p_event and c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF') for share of e;
 if auth.uid() is null or not (public.sports_stage3_admin(ev.competition_id) or exists(select 1 from public.sports_user_roles r where r.user_id=auth.uid() and r.is_active and r.role='school_manager' and r.school_id=p_school and (r.competition_id is null or r.competition_id=ev.competition_id))) then
  raise exception 'ไม่มีสิทธิ์จัดการใบสมัครโรงเรียนนี้' using errcode='42501'; end if;
 if ev.status<>'registration' then raise exception 'รายการนี้ยังไม่เปิดรับสมัคร'; end if;
 if jsonb_typeof(p_coaches) is distinct from 'array' or jsonb_array_length(p_coaches) not between 1 and 30 then raise exception 'ระบุครูผู้ควบคุม 1–30 คน'; end if;
 if length(coalesce(p_coaches->0->>'manager_name',''))>200 or (coalesce(p_coaches->0->>'manager_phone','')<>'' and regexp_replace(p_coaches->0->>'manager_phone','[ ()-]','','g') !~ '^[+]?[0-9]{9,15}$') then raise exception 'ตรวจสอบชื่อหรือโทรศัพท์ผู้จัดการทีม'; end if;
 -- Same lock as the old RPC. A blank form cannot silently replace an existing entry.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event::text),pg_catalog.hashtext(p_school::text));
 select en.id into existing from public.sports_entries en where en.event_id=p_event and en.school_id=p_school and en.status<>'withdrawn' order by en.created_at limit 1 for update;
 if existing is distinct from p_entry then raise exception 'ใบสมัครมีอยู่แล้วหรือเปลี่ยนแปลง กรุณาเปิดใบสมัครเดิมก่อนบันทึก'; end if;
 saved:=public.sports_football_register(p_event,p_school,p_players,p_coaches);
 if existing is not null and saved is distinct from existing then raise exception 'รหัสใบสมัครไม่ตรง'; end if;
 -- Generic registration strips manager fields on first creation. Restore only validated football metadata atomically.
 insert into public.sports_roster_staff(entry_id,coaches) values(saved,p_coaches)
 on conflict(entry_id) do update set coaches=excluded.coaches;
 return saved;
end $$;
revoke all on function public.sports_football_register_v3333(uuid,uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.sports_football_register_v3333(uuid,uuid,uuid,jsonb,jsonb) to authenticated;

-- Permit explicit deletion of a football photo only by the authorized school/admin.
-- Do not change any existing shared policy or permit access to other sports.
create or replace function public.sports_football_photo_delete_allowed(p_path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.sports_photo_object_permitted(p_path,true) then return false; end if;
 return exists(select 1 from public.sports_entries en join public.sports_events e on e.id=en.event_id join public.sports_competitions c on c.id=e.competition_id
 where en.id::text=split_part(p_path,'/',1) and c.slug='phayao-secondary-group-sports-2569' and e.event_code in ('GS3-FB-13M','GS3-FB-15M','GS3-FB-UM','GS3-FB-UF') and en.status<>'withdrawn');
end $$;
revoke all on function public.sports_football_photo_delete_allowed(text) from public,anon;
grant execute on function public.sports_football_photo_delete_allowed(text) to authenticated;
drop policy if exists sports_football_photo_delete_v3333 on storage.objects;
create policy sports_football_photo_delete_v3333 on storage.objects for delete to authenticated
 using(bucket_id='sports-athlete-photos' and public.sports_football_photo_delete_allowed(name));
commit;
notify pgrst,'reload schema';
