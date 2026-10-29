-- Security hardening (29 Oct 2026)
-- 1. Login / password-reset attempts for lockouts (server only).
-- 2. Once the CEO turns on 2-step verification, the database treats them as CEO only
--    when their session passed that step (aal2). A stolen password alone shows nothing.
-- 3. current_viewer(): profile + whether 2-step is on, in one call.
-- 4. Only active agents or the CEO can upload payment proofs.

create table public.auth_attempts (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('login', 'reset')),
  email_hash  text not null,
  ip_hash     text not null,
  success     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index auth_attempts_email on public.auth_attempts (kind, email_hash, created_at desc);
create index auth_attempts_ip on public.auth_attempts (kind, ip_hash, created_at desc);
alter table public.auth_attempts enable row level security;
revoke all on public.auth_attempts from public, anon, authenticated;

create or replace function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ceo' and is_active)
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     )
$$;

create or replace function public.current_viewer()
returns table (id uuid, full_name text, email text, role public.user_role, is_active boolean, mfa_enrolled boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.role, p.is_active,
         exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified')
  from public.profiles p
  where p.id = auth.uid()
$$;
revoke all on function public.current_viewer() from public, anon;
grant execute on function public.current_viewer() to authenticated;

drop policy if exists payment_proofs_insert on storage.objects;
create policy payment_proofs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select public.is_active_agent()) or (select public.is_ceo()))
  );
