-- v27: Google Maps navigation destinations for the School Information menu.
-- Requires migration 202611220021. No API key required.
begin;

alter table public.sports_school_information
  drop constraint if exists sports_school_information_section_check;
alter table public.sports_school_information
  add constraint sports_school_information_section_check
  check (section in ('parade_map','cheer_stands','parade_order','assembly_points','navigation','announcements'));

alter table public.sports_school_information
  add column if not exists maps_url text;

alter table public.sports_school_information
  drop constraint if exists sports_school_information_maps_url_check;
alter table public.sports_school_information
  add constraint sports_school_information_maps_url_check check (
    (section <> 'navigation' or maps_url is not null)
    and (maps_url is null or (
      char_length(maps_url) <= 2048 and
      maps_url ~* '^https://(((www\.)?google\.(com|co\.th)/maps([/?#]|$))|(maps\.google\.(com|co\.th)([/?#]|$))|(maps\.app\.goo\.gl/[^[:space:]]+)|(goo\.gl/maps/[^[:space:]]+))'
    ))
  );

-- Existing policies on sports_school_information automatically apply to
-- navigation items. Admins can draft/publish, schools see published only.
commit;
