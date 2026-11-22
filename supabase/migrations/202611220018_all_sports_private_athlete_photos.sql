begin;

-- v23: reuse existing PRIVATE sports-athlete-photos bucket for every sport.
-- Do not change or delete existing RoV object keys or photos.
-- The key always includes a registered entry UUID, 1-based roster position
-- and a short identity digest, never a student's personal data in the path.
create or replace function public.sports_photo_object_permitted(p_path text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  candidate_entry uuid;
  entry_record record;
begin
  if auth.uid() is null then return false; end if;
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([1-9]|[1-9][0-9]|1[0-9][0-9]|200)-[0-9a-f]{20}\.jpg$'
  then return false; end if;
  candidate_entry := split_part(p_path,'/',1)::uuid;
  select en.competition_id, en.school_id, en.status
    into entry_record
    from public.sports_entries en
    join public.sports_events ev on ev.id = en.event_id
   where en.id = candidate_entry;
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

-- Existing SELECT/INSERT/UPDATE Storage policies from migration 0016 continue
-- to call this function; its authorization remains scoped to school/competition.
commit;
