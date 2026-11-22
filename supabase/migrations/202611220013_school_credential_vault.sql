-- v10: optional, privileged encrypted credential retrieval for organizers.
-- Apply after v7 migration 202611220012_sports_school_accounts.sql.
-- Store ciphertext only: the decryption key stays in the Vercel server environment.
begin;

create table if not exists public.sports_school_credential_vault (
  account_id uuid primary key references public.sports_school_accounts(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.sports_school_credential_vault enable row level security;
revoke all on public.sports_school_credential_vault from public, anon, authenticated;
grant select, insert, update, delete on public.sports_school_credential_vault to service_role;

create table if not exists public.sports_school_credential_audit (
  id bigint generated always as identity primary key,
  account_id uuid references public.sports_school_accounts(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'reset_password', 'reveal_password')),
  created_at timestamptz not null default now()
);
create index if not exists sports_school_credential_audit_account_date_idx
  on public.sports_school_credential_audit (account_id, created_at desc);
alter table public.sports_school_credential_audit enable row level security;
revoke all on public.sports_school_credential_audit from public, anon, authenticated;
grant select, insert on public.sports_school_credential_audit to service_role;

commit;
