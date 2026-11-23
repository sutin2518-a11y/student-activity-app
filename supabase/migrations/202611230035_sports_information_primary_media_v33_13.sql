-- v33.13: one editable primary image/title/details per official ceremony information section.
-- Requires 202611220021 and 202611220022. No existing notices are deleted or unpublished.
-- Published notices may already be edited under the existing admin-only UPDATE RLS policy.
begin;

alter table public.sports_school_information
  add column if not exists is_primary boolean not null default false;

-- Distinguish a section's featured reference image from additional announcements.
-- Admin uploads are kept under the same protected Storage bucket and RLS rules.
create unique index if not exists sports_school_information_primary_unique
  on public.sports_school_information (competition_id, section)
  where is_primary = true;

-- A featured image is meaningful only for these four fixed content keys.
alter table public.sports_school_information
  drop constraint if exists sports_school_information_primary_section_check;
alter table public.sports_school_information
  add constraint sports_school_information_primary_section_check
  check (not is_primary or section in (
    'parade_map', 'cheer_stands', 'parade_order', 'assembly_points'
  ));

-- Existing sports_school_information admin INSERT/UPDATE policies remain unchanged.
-- First create a draft row, upload to storage, then mark that same row as published.
-- No permission is granted to anonymous/school accounts to create or edit.
commit;
notify pgrst, 'reload schema';
