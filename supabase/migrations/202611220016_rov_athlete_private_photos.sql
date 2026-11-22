begin;

-- v20: PRIVATE ID photographs linked to the official RoV application.
-- Files are stored as: entry UUID / roster-position - short SHA-256 identity hash .jpg
-- Neither names nor student numbers appear in the object path. The form keeps
-- photos out of public URLs and never requires a privileged server API key.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('sports-athlete-photos','sports-athlete-photos',false,3145728,array['image/jpeg'])
on conflict (id) do update set
  public=false, file_size_limit=3145728, allowed_mime_types=array['image/jpeg'];

create or replace function public.sports_photo_object_permitted(p_path text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  candidate_entry uuid;
  entry_record record;
begin
  if auth.uid() is null then return false; end if;
  -- Guard the cast; object keys must be exactly entry-id/index-identity.jpg
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-7]-[0-9a-f]{20}\.jpg$'
  then return false; end if;
  candidate_entry := split_part(p_path,'/',1)::uuid;
  select en.competition_id, en.school_id, en.status
  into entry_record
  from public.sports_entries en
  join public.sports_events ev on ev.id = en.event_id
  where en.id = candidate_entry and ev.event_code in ('GS3-ES-SM','GS3-ES-SF');
  if not found then return false; end if;
  if public.sports_stage3_admin(entry_record.competition_id) then return true; end if;
  if p_write and entry_record.status not in ('submitted','rejected','approved') then return false; end if;
  return exists (
    select 1 from public.sports_user_roles r
    where r.user_id = auth.uid() and r.is_active = true
      and r.role = 'school_manager' and r.school_id = entry_record.school_id
      and (r.competition_id is null or r.competition_id = entry_record.competition_id)
  );
end; $$;

revoke all on function public.sports_photo_object_permitted(text,boolean) from public, anon;
grant execute on function public.sports_photo_object_permitted(text,boolean) to authenticated;

drop policy if exists sports_rov_photo_read on storage.objects;
drop policy if exists sports_rov_photo_insert on storage.objects;
drop policy if exists sports_rov_photo_update on storage.objects;
drop policy if exists sports_rov_photo_delete on storage.objects;
create policy sports_rov_photo_read on storage.objects for select to authenticated
  using (bucket_id='sports-athlete-photos' and public.sports_photo_object_permitted(name,false));
create policy sports_rov_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id='sports-athlete-photos' and public.sports_photo_object_permitted(name,true));
create policy sports_rov_photo_update on storage.objects for update to authenticated
  using (bucket_id='sports-athlete-photos' and public.sports_photo_object_permitted(name,true))
  with check (bucket_id='sports-athlete-photos' and public.sports_photo_object_permitted(name,true));
-- No deletion policy for schools; old photo blobs may be reviewed/cleaned by a service administrator.
commit;
