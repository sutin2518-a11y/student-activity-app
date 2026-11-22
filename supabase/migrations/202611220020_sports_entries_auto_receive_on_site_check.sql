-- v25: Receipt of an athlete entry is automatic. Physical identity/eligibility
-- verification happens at the venue on competition day, NOT in this screen.
-- This affects sports_entries only. School Word submissions keep their own
-- acceptance/return workflow unchanged.
-- Back up sports_entries before applying: historical 'rejected' rows are
-- reclassified as received to implement the requested no-review workflow.
begin;

create or replace function public.sports_entry_auto_receive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Existing registration RPCs write status='submitted'. Preserve their API,
  -- roster checks and atomic athlete/coach inserts; only normalize the status.
  if new.status = 'submitted' then
    new.status := 'approved';
    new.return_reason := null;
    new.approved_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sports_entry_auto_receive_on_save on public.sports_entries;
create trigger sports_entry_auto_receive_on_save
  before insert or update of status on public.sports_entries
  for each row execute function public.sports_entry_auto_receive();

-- Make existing saved entries eligible for the old schedule/result queries,
-- which currently select status='approved'. Do not touch withdrawn entries.
update public.sports_entries
set status = 'approved',
    approved_by = null,
    updated_at = now()
where status in ('submitted', 'rejected');

-- No online approval or return-to-school actions remain. The legacy review
-- RPC is retained for DB compatibility but no longer callable by clients.
revoke execute on function public.sports_review_roster(uuid,text,text)
  from public, anon, authenticated;

commit;
notify pgrst, 'reload schema';
