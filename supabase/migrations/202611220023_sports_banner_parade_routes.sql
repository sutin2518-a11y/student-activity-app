-- v28: Exactly two official parade approach links in the sports banner.
-- Route 1: Amphoe Chun -> parade tail, 2 committee waypoints (provided by organiser).
-- Route 2: Amphoe Pong -> parade head; placeholder until administrator adds a link.
-- Install AFTER migrations 0021 and 0022.
begin;

create table if not exists public.sports_parade_routes (
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  route_no smallint not null check (route_no in (1, 2)),
  maps_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  primary key (competition_id, route_no),
  constraint sports_parade_routes_maps_url_check check (
    maps_url is null or (
      char_length(maps_url) <= 2048 and
      maps_url ~* '^https://(((www\.)?google\.(com|co\.th)/maps([/?#]|$))|(maps\.google\.(com|co\.th)([/?#]|$))|(maps\.app\.goo\.gl/[^[:space:]]+)|(goo\.gl/maps/[^[:space:]]+))'
    )
  )
);

alter table public.sports_parade_routes enable row level security;
revoke all on public.sports_parade_routes from public, anon, authenticated;
grant select on public.sports_parade_routes to anon, authenticated;
grant insert, update on public.sports_parade_routes to authenticated;

-- Both routes are public information, including the currently blank route 2.
drop policy if exists sports_parade_routes_read on public.sports_parade_routes;
create policy sports_parade_routes_read on public.sports_parade_routes
  for select to anon, authenticated using (true);

drop policy if exists sports_parade_routes_insert on public.sports_parade_routes;
create policy sports_parade_routes_insert on public.sports_parade_routes
  for insert to authenticated with check (public.sports_stage3_admin(competition_id));

drop policy if exists sports_parade_routes_update on public.sports_parade_routes;
create policy sports_parade_routes_update on public.sports_parade_routes
  for update to authenticated
  using (public.sports_stage3_admin(competition_id))
  with check (public.sports_stage3_admin(competition_id));

create or replace function public.sports_parade_routes_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists sports_parade_routes_touch on public.sports_parade_routes;
create trigger sports_parade_routes_touch
  before insert or update on public.sports_parade_routes
  for each row execute function public.sports_parade_routes_touch();

-- Preserve any links an admin has already set. Route 2 deliberately starts empty.
insert into public.sports_parade_routes (competition_id, route_no, maps_url)
select id, 1,
  'https://www.google.com/maps/dir/?api=1&origin=19.3558861%2C100.1479182&destination=19.530361%2C100.295979&waypoints=19.5194041%2C100.3013921%7C19.524234%2C100.3003952&travelmode=driving'
from public.sports_competitions
where slug = 'phayao-secondary-group-sports-2569'
on conflict (competition_id, route_no) do nothing;

insert into public.sports_parade_routes (competition_id, route_no, maps_url)
select id, 2, null
from public.sports_competitions
where slug = 'phayao-secondary-group-sports-2569'
on conflict (competition_id, route_no) do nothing;

commit;
