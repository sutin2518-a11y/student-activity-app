-- v7: admin-provisioned school accounts, separate from the CKW Google login.
-- Apply AFTER 202611210011_all_sports_roster_import.sql.
-- The password hash and sessions are managed by Supabase Auth, never by this table.
begin;

create table if not exists public.sports_school_accounts (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  school_id uuid not null references public.sports_schools(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  auth_email text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_school_accounts_username_format check (username ~ '^[a-z][a-z0-9._-]{3,31}$'),
  constraint sports_school_accounts_unique_school unique (competition_id, school_id),
  constraint sports_school_accounts_unique_username unique (competition_id, username)
);

create index if not exists sports_school_accounts_lookup_idx on public.sports_school_accounts (competition_id, username, is_active);
alter table public.sports_school_accounts enable row level security;
-- Explicit deny to all browser roles. Server API alone uses the service role.
revoke all on public.sports_school_accounts from public, anon, authenticated;
grant select,insert,update,delete on public.sports_school_accounts to service_role;

-- Failed login throttling: never store plaintext IPs or account identifiers.
create table if not exists public.sports_school_login_throttle (
  fingerprint text primary key,
  failures integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.sports_school_login_throttle enable row level security;
revoke all on public.sports_school_login_throttle from public, anon, authenticated;
grant select,insert,update,delete on public.sports_school_login_throttle to service_role;

-- Atomic check/record functions; only service-role API can invoke them.
create or replace function public.sports_school_login_allowed(p_fingerprint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_blocked timestamptz;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
 if p_fingerprint is null or length(p_fingerprint) <> 64 then return false; end if;
 delete from public.sports_school_login_throttle where updated_at < now() - interval '2 days';
 select blocked_until into v_blocked from public.sports_school_login_throttle where fingerprint = p_fingerprint;
 return v_blocked is null or v_blocked <= now();
end $$;

create or replace function public.sports_school_login_record(p_fingerprint text, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
 if p_fingerprint is null or length(p_fingerprint) <> 64 then return; end if;
 if p_success then
   delete from public.sports_school_login_throttle where fingerprint = p_fingerprint;
 else
   insert into public.sports_school_login_throttle(fingerprint,failures,blocked_until,updated_at)
   values (p_fingerprint,1,null,now())
   on conflict(fingerprint) do update set
     failures = case when public.sports_school_login_throttle.updated_at < now() - interval '15 minutes' or public.sports_school_login_throttle.blocked_until <= now() then 1 else public.sports_school_login_throttle.failures + 1 end,
     blocked_until = case
       when public.sports_school_login_throttle.updated_at < now() - interval '15 minutes' or public.sports_school_login_throttle.blocked_until <= now() then null
       when public.sports_school_login_throttle.failures + 1 >= 5 then now() + interval '15 minutes'
       else public.sports_school_login_throttle.blocked_until end,
     updated_at = now();
 end if;
end $$;

revoke all on function public.sports_school_login_allowed(text), public.sports_school_login_record(text,boolean) from public, anon, authenticated;
grant execute on function public.sports_school_login_allowed(text), public.sports_school_login_record(text,boolean) to service_role;
commit;
