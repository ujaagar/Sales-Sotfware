-- Ujaagar Sales: record of each agent accepting the Sales Agent Policy (one row per policy version).

create table public.policy_acceptances (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references public.profiles (id),
  policy_version  text not null,
  language        text not null check (language in ('en', 'ur')),
  typed_name      text not null check (length(btrim(typed_name)) between 2 and 120),
  cnic            text not null check (cnic ~ '^\d{5}-\d{7}-\d$'),
  ip_address      text,
  user_agent      text,
  accepted_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (agent_id, policy_version)
);
create index policy_acceptances_agent on public.policy_acceptances (agent_id);

create trigger policy_acceptances_updated_at before update on public.policy_acceptances
  for each row execute function public.set_updated_at();
-- A signed acceptance is evidence: it can't be edited or deleted.
create trigger policy_acceptances_append_only before update on public.policy_acceptances
  for each row execute function public.append_only();
create trigger policy_acceptances_no_delete before delete on public.policy_acceptances
  for each row execute function public.no_delete();
create trigger policy_acceptances_log after insert on public.policy_acceptances
  for each row execute function public.log_activity();

alter table public.policy_acceptances enable row level security;
revoke all on public.policy_acceptances from anon;

create policy policy_acceptances_select on public.policy_acceptances for select to authenticated
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));
create policy policy_acceptances_insert on public.policy_acceptances for insert to authenticated
  with check (agent_id = (select auth.uid()) and (select public.is_active_agent()));
