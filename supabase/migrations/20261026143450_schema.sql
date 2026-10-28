-- Ujaagar Sales: core schema.
-- Money is integer PKR (bigint). Dates/months use Asia/Karachi.

-- ---------- Types ----------
create type public.user_role as enum ('ceo', 'agent');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.lead_status as enum ('new', 'contacted', 'interested', 'not_interested', 'converted', 'lost');
create type public.deal_type as enum ('one_time', 'monthly');
create type public.deal_status as enum ('pending_approval', 'approved', 'rejected', 'completed', 'cancelled');
create type public.payment_method as enum ('cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'other');
create type public.payment_status as enum ('pending_verification', 'verified', 'rejected');
create type public.tier_kind as enum ('new_sale', 'recurring');
create type public.entry_kind as enum ('new_sale', 'recurring', 'adjustment');
create type public.period_status as enum ('open', 'locked');

-- ---------- Helpers ----------
create or replace function public.karachi_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Karachi')::date $$;

create or replace function public.month_start(d date) returns date
language sql immutable as $$ select date_trunc('month', d)::date $$;

-- 0300-1234567, +92 300 1234567 and 923001234567 all become 3001234567.
create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select nullif(
    regexp_replace(regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^92', ''), '^0', ''),
    '')
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- People ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete restrict,
  full_name   text not null check (length(btrim(full_name)) between 2 and 120),
  email       text not null,
  phone       text,
  whatsapp    text,
  city        text,
  role        public.user_role not null,
  is_active   boolean not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Exactly one CEO, ever.
create unique index profiles_single_ceo on public.profiles (role) where role = 'ceo';
create unique index profiles_email_unique on public.profiles (lower(email));

create table public.agent_applications (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (length(btrim(full_name)) between 2 and 120),
  email             text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone             text not null,
  phone_normalized  text generated always as (public.normalize_phone(phone)) stored,
  whatsapp          text,
  city              text not null,
  cnic              text check (cnic is null or cnic ~ '^\d{5}-\d{7}-\d$'),
  note              text check (note is null or length(note) <= 1000),
  status            public.application_status not null default 'pending',
  source            text not null default 'form' check (source in ('form', 'ceo')),
  rejection_reason  text,
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  profile_id        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index agent_applications_open_email on public.agent_applications (lower(email)) where status <> 'rejected';
create unique index agent_applications_open_phone on public.agent_applications (phone_normalized) where status <> 'rejected';
create index agent_applications_status on public.agent_applications (status, created_at desc);

create table public.agent_invites (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id),
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index agent_invites_profile on public.agent_invites (profile_id);

create table public.application_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index application_attempts_ip on public.application_attempts (ip_hash, created_at desc);

-- ---------- Catalogue & settings ----------
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 80),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index services_name_unique on public.services (lower(name));

create table public.app_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Sales pipeline ----------
create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  owner_agent_id        uuid not null references public.profiles (id),
  client_name           text not null check (length(btrim(client_name)) between 1 and 120),
  business_name         text,
  phone                 text not null,
  phone_normalized      text generated always as (public.normalize_phone(phone)) stored,
  whatsapp              text,
  city                  text,
  source                text,
  interested_services   uuid[] not null default '{}',
  status                public.lead_status not null default 'new',
  next_follow_up_at     timestamptz,
  follow_up_notified_at timestamptz,
  notes                 text,
  client_id             uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index leads_owner on public.leads (owner_agent_id, status);
create index leads_phone on public.leads (phone_normalized);
create index leads_follow_up on public.leads (next_follow_up_at) where next_follow_up_at is not null;

create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  owner_agent_id    uuid not null references public.profiles (id),
  name              text not null check (length(btrim(name)) between 1 and 120),
  business_name     text,
  phone             text not null,
  phone_normalized  text generated always as (public.normalize_phone(phone)) stored,
  whatsapp          text,
  email             text,
  city              text,
  lead_id           uuid references public.leads (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index clients_owner on public.clients (owner_agent_id);
create index clients_phone on public.clients (phone_normalized);
alter table public.leads add constraint leads_client_fk foreign key (client_id) references public.clients (id);

create table public.client_owner_history (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id),
  agent_id    uuid not null references public.profiles (id),
  from_date   date not null,
  to_date     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (to_date is null or to_date >= from_date - 1)
);
create index client_owner_history_client on public.client_owner_history (client_id, from_date);

create table public.commission_tiers (
  id              uuid primary key default gen_random_uuid(),
  kind            public.tier_kind not null,
  min_amount_pkr  bigint not null check (min_amount_pkr >= 0),
  max_amount_pkr  bigint check (max_amount_pkr is null or max_amount_pkr >= min_amount_pkr),
  rate_percent    numeric(5, 2) not null check (rate_percent >= 0 and rate_percent <= 100),
  effective_from  date not null,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (kind, effective_from, min_amount_pkr)
);

create table public.deals (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients (id),
  agent_id                uuid not null references public.profiles (id),
  original_agent_id       uuid not null references public.profiles (id),
  service_id              uuid not null references public.services (id),
  description             text check (description is null or length(description) <= 1000),
  deal_type               public.deal_type not null,
  total_amount_pkr        bigint check (total_amount_pkr is null or total_amount_pkr > 0),
  monthly_fee_pkr         bigint check (monthly_fee_pkr is null or monthly_fee_pkr > 0),
  start_month             date check (start_month is null or start_month = date_trunc('month', start_month)::date),
  end_month               date check (end_month is null or end_month = date_trunc('month', end_month)::date),
  status                  public.deal_status not null default 'pending_approval',
  rejection_reason        text,
  approved_by             uuid references public.profiles (id),
  approved_at             timestamptz,
  cancelled_at            timestamptz,
  completed_at            timestamptz,
  next_follow_up_at       timestamptz,
  follow_up_notified_at   timestamptz,
  -- Rate snapshot, set once when the CEO approves.
  new_sale_rate_percent   numeric(5, 2),
  recurring_rate_percent  numeric(5, 2),
  new_sale_tier_id        uuid references public.commission_tiers (id),
  recurring_tier_id       uuid references public.commission_tiers (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint deals_one_time_shape check (
    deal_type <> 'one_time' or (total_amount_pkr is not null and monthly_fee_pkr is null)),
  constraint deals_monthly_shape check (
    deal_type <> 'monthly' or (monthly_fee_pkr is not null and start_month is not null and total_amount_pkr is null
      and (end_month is null or end_month >= start_month))),
  constraint deals_approved_has_rates check (
    approved_at is null or (new_sale_rate_percent is not null
      and (deal_type = 'one_time' or recurring_rate_percent is not null)))
);
create index deals_agent on public.deals (agent_id, status);
create index deals_client on public.deals (client_id);
create index deals_status on public.deals (status, created_at desc);

create table public.deal_notes (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references public.deals (id),
  lead_id     uuid references public.leads (id),
  author_id   uuid not null references public.profiles (id),
  body        text not null check (length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((deal_id is null) <> (lead_id is null))
);
create index deal_notes_deal on public.deal_notes (deal_id, created_at);
create index deal_notes_lead on public.deal_notes (lead_id, created_at);

create table public.client_payments (
  id                uuid primary key default gen_random_uuid(),
  deal_id           uuid not null references public.deals (id),
  agent_id          uuid not null references public.profiles (id),
  amount_pkr        bigint not null check (amount_pkr <> 0),
  paid_on           date not null,
  billing_month     date check (billing_month is null or billing_month = date_trunc('month', billing_month)::date),
  method            public.payment_method not null,
  proof_file_path   text,
  status            public.payment_status not null default 'pending_verification',
  verified_by       uuid references public.profiles (id),
  verified_at       timestamptz,
  rejection_reason  text,
  refund_of         uuid references public.client_payments (id),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint client_payments_refund_shape check (
    (refund_of is null and amount_pkr > 0 and proof_file_path is not null)
    or (refund_of is not null and amount_pkr < 0))
);
create index client_payments_deal on public.client_payments (deal_id, status);
create index client_payments_status on public.client_payments (status, created_at desc);
create index client_payments_paid_on on public.client_payments (paid_on);

create table public.commission_periods (
  id                     uuid primary key default gen_random_uuid(),
  agent_id               uuid not null references public.profiles (id),
  month                  date not null check (month = date_trunc('month', month)::date),
  collected_amount_pkr   bigint not null default 0,
  commission_amount_pkr  bigint not null default 0,
  status                 public.period_status not null default 'open',
  locked_at              timestamptz,
  locked_by              uuid references public.profiles (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (agent_id, month)
);

create table public.commission_entries (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid not null references public.client_payments (id),
  deal_id          uuid not null references public.deals (id),
  agent_id         uuid not null references public.profiles (id),
  month            date not null check (month = date_trunc('month', month)::date),
  kind             public.entry_kind not null,
  base_amount_pkr  bigint not null,
  rate_percent     numeric(5, 2) not null,
  amount_pkr       bigint not null,
  description      text not null,
  note             text,
  adjusts_entry_id uuid references public.commission_entries (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index commission_entries_agent_month on public.commission_entries (agent_id, month);
create index commission_entries_payment on public.commission_entries (payment_id);

create table public.commission_payouts (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.profiles (id),
  amount_pkr   bigint not null check (amount_pkr > 0),
  paid_on      date not null,
  method       public.payment_method not null,
  reference    text,
  note         text,
  recorded_by  uuid not null references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index commission_payouts_agent on public.commission_payouts (agent_id, paid_on desc);

create table public.agent_targets (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           uuid not null references public.profiles (id),
  month              date not null check (month = date_trunc('month', month)::date),
  target_amount_pkr  bigint not null check (target_amount_pkr > 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (agent_id, month)
);

create table public.monthly_due_alerts (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals (id),
  month       date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (deal_id, month)
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id),
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  emailed_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, read_at, created_at desc);
create index notifications_unemailed on public.notifications (created_at) where emailed_at is null;

create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id),
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index activity_log_created on public.activity_log (created_at desc);
create index activity_log_entity on public.activity_log (entity_type, entity_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','agent_applications','agent_invites','application_attempts','services',
    'app_settings','leads','clients','client_owner_history','commission_tiers','deals','deal_notes','client_payments',
    'commission_periods','commission_entries','commission_payouts','agent_targets','monthly_due_alerts',
    'notifications','activity_log']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;
