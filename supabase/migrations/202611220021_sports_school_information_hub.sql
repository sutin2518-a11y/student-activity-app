-- v26 School Information Hub: official communications for every participating school.
-- Install after the v25 migrations, including sports_stage3_admin(uuid).
begin;

create table if not exists public.sports_school_information (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  section text not null check (section in ('parade_map','cheer_stands','parade_order','assembly_points','announcements')),
  title text not null check (length(btrim(title)) between 1 and 160),
  details text not null default '' check (length(details) <= 5000),
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_school_information_attachment_check check (
    (attachment_path is null and attachment_name is null and attachment_mime is null) or
    (attachment_path is not null and attachment_name is not null and attachment_mime in ('application/pdf','image/jpeg','image/png','image/webp'))
  )
);
create index if not exists sports_school_information_filter_idx
  on public.sports_school_information(competition_id,section,is_published,created_at desc);

alter table public.sports_school_information enable row level security;
revoke all on public.sports_school_information from public, anon, authenticated;
grant select on public.sports_school_information to anon, authenticated;
grant insert,update on public.sports_school_information to authenticated;

drop policy if exists sports_school_information_read on public.sports_school_information;
create policy sports_school_information_read on public.sports_school_information for select to anon,authenticated
using (is_published or public.sports_stage3_admin(competition_id));
drop policy if exists sports_school_information_insert on public.sports_school_information;
create policy sports_school_information_insert on public.sports_school_information for insert to authenticated
with check(public.sports_stage3_admin(competition_id) and not is_published);
drop policy if exists sports_school_information_update on public.sports_school_information;
create policy sports_school_information_update on public.sports_school_information for update to authenticated
using(public.sports_stage3_admin(competition_id))
with check(public.sports_stage3_admin(competition_id));
-- No browser deletes: withdraw publication instead and preserve historic revisions.

create or replace function public.sports_school_information_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.is_published then
    if tg_op = 'INSERT' then new.published_at := now();
    elsif not old.is_published then new.published_at := now();
    end if;
  end if;
  if not new.is_published then new.published_at := null; end if;
  return new;
end;
$$;
drop trigger if exists sports_school_information_touch on public.sports_school_information;
create trigger sports_school_information_touch before insert or update on public.sports_school_information
for each row execute function public.sports_school_information_touch();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sports-school-information','sports-school-information',false,12582912,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=12582912,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

-- Storage object names: <competition UUID>/<information UUID>/<random UUID>.(pdf|jpg|png|webp).
-- A file must be associated with an existing record. Draft files are visible only to competition admins.
create or replace function public.sports_school_information_file_allowed(p_path text,p_write boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_comp uuid; v_notice uuid; v_published boolean;
begin
  if p_path !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$' then return false; end if;
  v_comp := split_part(p_path,'/',1)::uuid;
  v_notice := split_part(p_path,'/',2)::uuid;
  select is_published into v_published from public.sports_school_information
    where competition_id=v_comp and id=v_notice;
  if not found then return false; end if;
  if public.sports_stage3_admin(v_comp) then return true; end if;
  return not p_write and v_published;
end;
$$;
revoke all on function public.sports_school_information_file_allowed(text,boolean) from public,anon;
grant execute on function public.sports_school_information_file_allowed(text,boolean) to anon,authenticated;

drop policy if exists sports_school_information_file_read on storage.objects;
create policy sports_school_information_file_read on storage.objects for select to anon,authenticated
using (bucket_id='sports-school-information' and public.sports_school_information_file_allowed(name,false));
drop policy if exists sports_school_information_file_insert on storage.objects;
create policy sports_school_information_file_insert on storage.objects for insert to authenticated
with check (bucket_id='sports-school-information' and public.sports_school_information_file_allowed(name,true));
-- Editing an existing attachment writes a NEW object, leaving the old object for audit; no client update/delete policy.
commit;
