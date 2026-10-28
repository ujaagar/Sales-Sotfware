-- Ujaagar Sales: role helpers, business-rule triggers, notifications, audit log, RPCs.

-- ---------- Role helpers ----------
-- Server-side privileged contexts: migrations, SQL editor, service-role key, and SECURITY DEFINER functions.
create or replace function public.is_service() returns boolean
language sql stable as $$ select current_user in ('postgres', 'service_role', 'supabase_admin') $$;

create or replace function public.is_ceo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ceo' and is_active)
$$;

create or replace function public.is_active_agent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'agent' and is_active)
$$;

create or replace function public.ceo_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where role = 'ceo' limit 1
$$;

create or replace function public.fmt_pkr(v bigint) returns text
language sql immutable as $$ select 'Rs ' || to_char(v, 'FM999,999,999,999,990') $$;

-- ---------- Notifications ----------
create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, link)
  select p_user, p_type, p_title, p_body, p_link where p_user is not null
$$;

-- ---------- Profiles: one CEO, roles fixed ----------
create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'ceo' and not public.is_service() then
      raise exception 'A CEO account can only be created by the setup script.';
    end if;
    if new.role = 'agent' and not (public.is_service() or public.is_ceo()) then
      raise exception 'Only the CEO can add agents.';
    end if;
    new.email := lower(new.email);
    return new;
  end if;

  if new.id <> old.id or new.role is distinct from old.role then
    raise exception 'Roles cannot be changed.';
  end if;
  if not (public.is_service() or public.is_ceo()) then
    if new.is_active is distinct from old.is_active or new.email is distinct from old.email then
      raise exception 'You cannot change this field.';
    end if;
  end if;
  if old.role = 'ceo' and not new.is_active then
    raise exception 'The CEO account cannot be deactivated.';
  end if;
  return new;
end $$;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- Leads & clients: ownership and duplicates ----------
-- Runs as owner so it can see every agent's contacts (RLS would hide them from the caller).
create or replace function public.phone_owned_by_other(p_phone text, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients where phone_normalized = public.normalize_phone(p_phone) and owner_agent_id <> p_owner
    union all
    select 1 from public.leads where phone_normalized = public.normalize_phone(p_phone) and owner_agent_id <> p_owner)
$$;
revoke execute on function public.phone_owned_by_other(text, uuid) from public, anon, authenticated;
grant execute on function public.phone_owned_by_other(text, uuid) to authenticated;

create or replace function public.contact_guard() returns trigger
language plpgsql as $$
declare
  priv boolean := public.is_service() or public.is_ceo();
begin
  if tg_op = 'INSERT' then
    if not priv and new.owner_agent_id is distinct from auth.uid() then
      raise exception 'You can only add contacts for yourself.';
    end if;
  elsif new.owner_agent_id is distinct from old.owner_agent_id and not priv then
    raise exception 'Only the CEO can reassign contacts.';
  end if;

  -- Same phone owned by someone else: blocked for agents (the CEO is told via check_contact()).
  if not priv and (tg_op = 'INSERT' or public.normalize_phone(new.phone) is distinct from public.normalize_phone(old.phone))
     and public.phone_owned_by_other(new.phone, new.owner_agent_id) then
    raise exception 'This contact is already registered. Contact the CEO.';
  end if;
  return new;
end $$;
create trigger leads_guard before insert or update on public.leads
  for each row execute function public.contact_guard();
create trigger clients_guard before insert or update on public.clients
  for each row execute function public.contact_guard();

-- Ownership history; reassignment moves open deals to the new owner from today.
create or replace function public.clients_owner_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare d date := public.karachi_today();
begin
  if tg_op = 'INSERT' then
    insert into public.client_owner_history (client_id, agent_id, from_date)
    values (new.id, new.owner_agent_id, (new.created_at at time zone 'Asia/Karachi')::date);
  elsif new.owner_agent_id is distinct from old.owner_agent_id then
    update public.client_owner_history set to_date = d - 1 where client_id = new.id and to_date is null;
    insert into public.client_owner_history (client_id, agent_id, from_date) values (new.id, new.owner_agent_id, d);
    update public.deals set agent_id = new.owner_agent_id
      where client_id = new.id and status in ('pending_approval', 'approved', 'rejected');
  end if;
  return null;
end $$;
create trigger clients_owner_history after insert or update of owner_agent_id on public.clients
  for each row execute function public.clients_owner_history();

-- ---------- Deals ----------
create or replace function public.deals_guard() returns trigger
language plpgsql as $$
declare
  priv boolean := public.is_service() or public.is_ceo();
  client_owner uuid;
begin
  if tg_op = 'INSERT' then
    new.original_agent_id := new.agent_id;
    select owner_agent_id into client_owner from public.clients where id = new.client_id;
    if client_owner is distinct from new.agent_id then
      raise exception 'Deals can only be created by the client''s owner.';
    end if;
    if new.deal_type = 'one_time' then
      new.start_month := null;
      new.end_month := null;
    end if;
    if not priv then
      if new.agent_id is distinct from auth.uid() then
        raise exception 'You can only create your own deals.';
      end if;
      new.status := 'pending_approval';
      new.approved_by := null; new.approved_at := null; new.cancelled_at := null; new.completed_at := null;
      new.new_sale_rate_percent := null; new.recurring_rate_percent := null;
      new.new_sale_tier_id := null; new.recurring_tier_id := null; new.rejection_reason := null;
    end if;
    return new;
  end if;

  if new.original_agent_id <> old.original_agent_id or new.client_id <> old.client_id then
    raise exception 'This deal field cannot be changed.';
  end if;

  -- Rate snapshot and amounts are frozen once approved.
  if old.approved_at is not null and (
       new.approved_at is distinct from old.approved_at
    or new.new_sale_rate_percent is distinct from old.new_sale_rate_percent
    or new.recurring_rate_percent is distinct from old.recurring_rate_percent
    or new.new_sale_tier_id is distinct from old.new_sale_tier_id
    or new.recurring_tier_id is distinct from old.recurring_tier_id
    or new.deal_type is distinct from old.deal_type
    or new.total_amount_pkr is distinct from old.total_amount_pkr
    or new.monthly_fee_pkr is distinct from old.monthly_fee_pkr
    or new.start_month is distinct from old.start_month
    or new.service_id is distinct from old.service_id) then
    raise exception 'An approved deal''s amount and commission rates are locked.';
  end if;

  if not priv then
    if new.agent_id is distinct from old.agent_id then
      raise exception 'Only the CEO can reassign deals.';
    end if;
    if old.status in ('pending_approval', 'rejected') then
      -- Agent edits or resubmits; anything else stays as the CEO left it.
      new.status := 'pending_approval';
      new.rejection_reason := null;
      new.approved_by := null; new.approved_at := null;
      new.new_sale_rate_percent := null; new.recurring_rate_percent := null;
      new.new_sale_tier_id := null; new.recurring_tier_id := null;
      new.cancelled_at := old.cancelled_at; new.completed_at := old.completed_at;
    elsif new.next_follow_up_at is distinct from old.next_follow_up_at
      and (to_jsonb(new) - 'next_follow_up_at' - 'follow_up_notified_at' - 'updated_at')
        = (to_jsonb(old) - 'next_follow_up_at' - 'follow_up_notified_at' - 'updated_at') then
      -- Agents may still change the follow-up date on approved deals.
      new.follow_up_notified_at := null;
    else
      raise exception 'Approved deals cannot be edited.';
    end if;
  end if;

  if new.status = 'approved' and old.status <> 'approved' and new.approved_at is null then
    raise exception 'Approve deals through the approval screen so the rates are recorded.';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    if new.deal_type <> 'one_time' then raise exception 'Monthly deals end by setting an end month.'; end if;
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if new.end_month is distinct from old.end_month and new.deal_type = 'monthly'
     and new.end_month is not null and new.end_month < new.start_month then
    raise exception 'End month cannot be before the start month.';
  end if;
  return new;
end $$;
create trigger deals_guard before insert or update on public.deals
  for each row execute function public.deals_guard();

-- ---------- Payments ----------
create or replace function public.payments_guard() returns trigger
language plpgsql as $$
declare
  priv boolean := public.is_service() or public.is_ceo();
  d public.deals%rowtype;
  v_sum bigint;
  p_sum bigint;
begin
  if tg_op = 'UPDATE' and old.status = 'verified' then
    if new.status is distinct from old.status or new.amount_pkr <> old.amount_pkr or new.paid_on <> old.paid_on
       or new.deal_id <> old.deal_id or new.billing_month is distinct from old.billing_month
       or new.refund_of is distinct from old.refund_of then
      raise exception 'Verified payments cannot be changed. Record a refund instead.';
    end if;
    return new;
  end if;

  select * into d from public.deals where id = new.deal_id;
  if not found then raise exception 'Deal not found.'; end if;

  if tg_op = 'INSERT' then
    new.agent_id := d.agent_id;
    if new.refund_of is null then
      if d.status <> 'approved' then
        raise exception 'Payments can only be recorded on approved deals.';
      end if;
    elsif not priv then
      raise exception 'Only the CEO can record refunds.';
    end if;
    if not priv then
      if d.agent_id is distinct from auth.uid() then
        raise exception 'You can only record payments on your own deals.';
      end if;
      new.status := 'pending_verification';
      new.verified_by := null; new.verified_at := null; new.rejection_reason := null;
    end if;
  else
    if new.deal_id <> old.deal_id or new.refund_of is distinct from old.refund_of then
      raise exception 'This payment field cannot be changed.';
    end if;
    if not priv and (old.status <> 'pending_verification' or new.status <> 'pending_verification') then
      raise exception 'Only payments waiting for verification can be edited.';
    end if;
  end if;

  if new.refund_of is null then
    if d.deal_type = 'monthly' then
      new.billing_month := coalesce(new.billing_month, public.month_start(new.paid_on));
      if new.billing_month < d.start_month or (d.end_month is not null and new.billing_month > d.end_month) then
        raise exception 'This month is outside the deal''s start and end month.';
      end if;
    else
      new.billing_month := null;
    end if;
  end if;

  if new.status = 'verified' then
    new.verified_at := coalesce(new.verified_at, now());
  end if;

  -- One-time deals: payments can never go over the deal total.
  if d.deal_type = 'one_time' and new.refund_of is null and new.status <> 'rejected' then
    select coalesce(sum(amount_pkr) filter (where status = 'verified'), 0),
           coalesce(sum(amount_pkr) filter (where status = 'pending_verification'), 0)
      into v_sum, p_sum
      from public.client_payments where deal_id = new.deal_id and id <> new.id;
    if new.status = 'verified' and v_sum + new.amount_pkr > d.total_amount_pkr then
      raise exception 'Verified payments would go over the deal total of %.', public.fmt_pkr(d.total_amount_pkr);
    end if;
    if new.status = 'pending_verification' and v_sum + p_sum + new.amount_pkr > d.total_amount_pkr then
      raise exception 'This payment would go over the deal total of % (% already recorded).',
        public.fmt_pkr(d.total_amount_pkr), public.fmt_pkr(v_sum + p_sum);
    end if;
  end if;
  return new;
end $$;
create trigger payments_guard before insert or update on public.client_payments
  for each row execute function public.payments_guard();

-- ---------- Commission entries & periods ----------
create or replace function public.entries_guard() returns trigger
language plpgsql as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'Commission entries cannot be changed. Add an adjustment instead.';
  end if;
  if exists (select 1 from public.commission_periods
             where agent_id = new.agent_id and month = new.month and status = 'locked') then
    raise exception 'Commission for % is locked for this agent.', to_char(new.month, 'Mon YYYY');
  end if;
  return new;
end $$;
create trigger entries_guard before insert or update or delete on public.commission_entries
  for each row execute function public.entries_guard();

create or replace function public.entries_rollup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.commission_periods (agent_id, month, collected_amount_pkr, commission_amount_pkr)
  values (new.agent_id, new.month, new.base_amount_pkr, new.amount_pkr)
  on conflict (agent_id, month) do update
    set collected_amount_pkr = public.commission_periods.collected_amount_pkr + excluded.collected_amount_pkr,
        commission_amount_pkr = public.commission_periods.commission_amount_pkr + excluded.commission_amount_pkr;
  return null;
end $$;
create trigger entries_rollup after insert on public.commission_entries
  for each row execute function public.entries_rollup();

create or replace function public.periods_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Commission months cannot be deleted.'; end if;
  if tg_op = 'UPDATE' and old.status = 'locked' then
    raise exception 'Locked commission months cannot be changed.';
  end if;
  if tg_op = 'UPDATE' and new.status = 'locked' then
    new.locked_at := coalesce(new.locked_at, now());
    new.locked_by := coalesce(new.locked_by, auth.uid());
  end if;
  return new;
end $$;
create trigger periods_guard before update or delete on public.commission_periods
  for each row execute function public.periods_guard();

-- ---------- Nothing financial is hard-deleted ----------
create or replace function public.no_delete() returns trigger
language plpgsql as $$
begin
  raise exception '% records cannot be deleted.', tg_table_name;
end $$;
do $$
declare t text;
begin
  foreach t in array array['deals','client_payments','commission_payouts','commission_tiers','deal_notes',
    'activity_log','client_owner_history','agent_applications','clients','profiles']
  loop
    execute format('create trigger %I before delete on public.%I for each row execute function public.no_delete()',
      t || '_no_delete', t);
  end loop;
end $$;

-- Notes and the activity log are append-only.
create or replace function public.append_only() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only.', tg_table_name;
end $$;
create trigger deal_notes_append_only before update on public.deal_notes
  for each row execute function public.append_only();
create trigger activity_log_append_only before update on public.activity_log
  for each row execute function public.append_only();
create trigger commission_payouts_append_only before update on public.commission_payouts
  for each row execute function public.append_only();
create trigger commission_tiers_append_only before update on public.commission_tiers
  for each row execute function public.append_only();

-- ---------- Activity log ----------
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  prev jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  act text;
begin
  act := case
    when tg_op = 'INSERT' then 'created'
    when rec ? 'status' and (rec ->> 'status') is distinct from (prev ->> 'status') then rec ->> 'status'
    when rec ? 'owner_agent_id' and (rec ->> 'owner_agent_id') is distinct from (prev ->> 'owner_agent_id') then 'reassigned'
    when rec ? 'is_active' and (rec ->> 'is_active') is distinct from (prev ->> 'is_active') then
      case when (rec ->> 'is_active')::boolean then 'activated' else 'deactivated' end
    else 'updated' end;
  insert into public.activity_log (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), tg_table_name || '.' || act, tg_table_name, (rec ->> 'id')::uuid, prev, rec);
  return null;
end $$;

create trigger deals_log after insert or update on public.deals for each row execute function public.log_activity();
create trigger client_payments_log after insert or update on public.client_payments for each row execute function public.log_activity();
create trigger commission_tiers_log after insert on public.commission_tiers for each row execute function public.log_activity();
create trigger commission_entries_log after insert on public.commission_entries for each row execute function public.log_activity();
create trigger commission_periods_log after update of status on public.commission_periods for each row execute function public.log_activity();
create trigger commission_payouts_log after insert on public.commission_payouts for each row execute function public.log_activity();
create trigger agent_applications_log after insert or update on public.agent_applications for each row execute function public.log_activity();
create trigger agent_targets_log after insert or update on public.agent_targets for each row execute function public.log_activity();
create trigger app_settings_log after insert or update on public.app_settings for each row execute function public.log_activity();
create trigger services_log after insert or update on public.services for each row execute function public.log_activity();
create trigger profiles_log after insert or update of is_active, full_name on public.profiles for each row execute function public.log_activity();
create trigger clients_log after update of owner_agent_id on public.clients for each row execute function public.log_activity();
create trigger leads_log after update of owner_agent_id on public.leads for each row execute function public.log_activity();

-- ---------- Notification triggers ----------
create or replace function public.notify_deals() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ceo uuid := public.ceo_id();
  agent_name text;
  client_name text;
  amount text;
begin
  select full_name into agent_name from public.profiles where id = new.agent_id;
  select name into client_name from public.clients where id = new.client_id;
  amount := case when new.deal_type = 'monthly'
    then public.fmt_pkr(new.monthly_fee_pkr) || '/month' else public.fmt_pkr(new.total_amount_pkr) end;

  if new.agent_id = ceo then return null; end if; -- CEO's own sales

  if tg_op = 'INSERT' or (old.status <> 'pending_approval' and new.status = 'pending_approval') then
    perform public.notify(ceo, 'deal_submitted',
      case when tg_op = 'INSERT' then 'New deal to approve' else 'Deal resubmitted' end,
      agent_name || ' · ' || client_name || ' · ' || amount, '/ceo/approvals/' || new.id);
  elsif new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.notify(new.agent_id, 'deal_approved', 'Deal approved', client_name || ' · ' || amount, '/deals/' || new.id);
    elsif new.status = 'rejected' then
      perform public.notify(new.agent_id, 'deal_rejected', 'Deal rejected',
        client_name || coalesce(': ' || new.rejection_reason, ''), '/deals/' || new.id);
    elsif new.status = 'cancelled' then
      perform public.notify(new.agent_id, 'deal_cancelled', 'Deal cancelled', client_name, '/deals/' || new.id);
    end if;
  end if;
  return null;
end $$;
create trigger deals_notify after insert or update of status on public.deals
  for each row execute function public.notify_deals();

create or replace function public.notify_payments() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ceo uuid := public.ceo_id();
  agent_name text;
  client_name text;
begin
  if new.refund_of is not null or new.agent_id = ceo then return null; end if;
  select p.full_name, c.name into agent_name, client_name
    from public.deals d join public.clients c on c.id = d.client_id join public.profiles p on p.id = new.agent_id
    where d.id = new.deal_id;
  if tg_op = 'INSERT' then
    perform public.notify(ceo, 'payment_submitted', 'Payment to verify',
      agent_name || ' · ' || client_name || ' · ' || public.fmt_pkr(new.amount_pkr), '/ceo/payments/' || new.id);
  elsif new.status is distinct from old.status then
    if new.status = 'verified' then
      perform public.notify(new.agent_id, 'payment_verified', 'Payment verified',
        client_name || ' · ' || public.fmt_pkr(new.amount_pkr), '/deals/' || new.deal_id);
    elsif new.status = 'rejected' then
      perform public.notify(new.agent_id, 'payment_rejected', 'Payment rejected',
        client_name || ' · ' || public.fmt_pkr(new.amount_pkr) || coalesce(': ' || new.rejection_reason, ''),
        '/deals/' || new.deal_id);
    end if;
  end if;
  return null;
end $$;
create trigger client_payments_notify after insert or update of status on public.client_payments
  for each row execute function public.notify_payments();

create or replace function public.notify_payouts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.agent_id, 'payout_recorded', 'Commission paid',
    public.fmt_pkr(new.amount_pkr) || ' on ' || to_char(new.paid_on, 'DD Mon YYYY'), '/payouts');
  return null;
end $$;
create trigger commission_payouts_notify after insert on public.commission_payouts
  for each row execute function public.notify_payouts();

create or replace function public.notify_periods() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'locked' and old.status <> 'locked' then
    perform public.notify(new.agent_id, 'month_locked', to_char(new.month, 'FMMonth YYYY') || ' commission is final',
      'Final commission: ' || public.fmt_pkr(new.commission_amount_pkr), '/commissions');
  end if;
  return null;
end $$;
create trigger commission_periods_notify after update of status on public.commission_periods
  for each row execute function public.notify_periods();

create or replace function public.notify_applications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'form' then
    perform public.notify(public.ceo_id(), 'application_submitted', 'New agent application',
      new.full_name || ' · ' || new.city, '/ceo/applications');
  end if;
  return null;
end $$;
create trigger agent_applications_notify after insert on public.agent_applications
  for each row execute function public.notify_applications();

-- ---------- RPCs ----------
-- Duplicate-contact check before adding a lead/client. Never reveals who owns it.
create or replace function public.check_contact(p_phone text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n text := public.normalize_phone(p_phone);
  owner uuid;
  me_name text;
begin
  if me is null then raise exception 'Not signed in.'; end if;
  if n is null or length(n) < 7 then return 'none'; end if;
  select owner_agent_id into owner from (
    select owner_agent_id from public.clients where phone_normalized = n
    union all
    select owner_agent_id from public.leads where phone_normalized = n
  ) x order by (owner_agent_id = me) desc limit 1;
  if owner is null then return 'none'; end if;
  if owner = me then return 'mine'; end if;
  if not public.is_ceo() then
    select full_name into me_name from public.profiles where id = me;
    perform public.notify(public.ceo_id(), 'duplicate_contact', 'Duplicate contact attempt',
      me_name || ' tried to add ' || p_phone || ', which is already registered with another agent.', '/ceo/activity');
  end if;
  return 'other';
end $$;

-- Leaderboard: other agents' amounts only as a share of the top amount.
create or replace function public.leaderboard(p_month date)
returns table (rank int, agent_id uuid, full_name text, collected_pkr bigint, share_percent numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  with totals as (
    select p.id, p.full_name,
      coalesce(sum(cp.amount_pkr) filter (
        where cp.status = 'verified' and public.month_start(cp.paid_on) = public.month_start(p_month)), 0)::bigint as total
    from public.profiles p
    left join public.client_payments cp on cp.agent_id = p.id
    where p.role = 'agent' and p.is_active and auth.uid() is not null
    group by p.id
  ), ranked as (
    select t.*, rank() over (order by t.total desc) as r, max(t.total) over () as mx from totals t
  )
  select r::int, id, full_name,
    case when public.is_ceo() or id = auth.uid() then total end,
    case when mx > 0 then round(total * 100.0 / mx, 1) else 0 end,
    id = auth.uid()
  from ranked order by r, full_name
$$;

-- Verify a payment and write its commission entries (computed in src/lib/commission) in one step.
create or replace function public.verify_payment(p_payment_id uuid, p_entries jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_ceo() then raise exception 'Only the CEO can verify payments.'; end if;
  update public.client_payments
     set status = 'verified', verified_by = auth.uid(), verified_at = now(), rejection_reason = null
   where id = p_payment_id and status = 'pending_verification';
  if not found then raise exception 'This payment is not waiting for verification.'; end if;
  insert into public.commission_entries
    (payment_id, deal_id, agent_id, month, kind, base_amount_pkr, rate_percent, amount_pkr, description, note, adjusts_entry_id)
  select p_payment_id, (e ->> 'deal_id')::uuid, (e ->> 'agent_id')::uuid, (e ->> 'month')::date,
         (e ->> 'kind')::public.entry_kind, (e ->> 'base_amount_pkr')::bigint, (e ->> 'rate_percent')::numeric,
         (e ->> 'amount_pkr')::bigint, e ->> 'description', e ->> 'note', (e ->> 'adjusts_entry_id')::uuid
  from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) e;
end $$;

-- Record a refund (negative, already verified) and its commission adjustments in one step.
create or replace function public.record_refund(
  p_original uuid, p_amount bigint, p_paid_on date, p_method public.payment_method, p_note text, p_entries jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  orig public.client_payments%rowtype;
  refunded bigint;
  new_id uuid;
begin
  if not public.is_ceo() then raise exception 'Only the CEO can record refunds.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Refund amount must be more than zero.'; end if;
  select * into orig from public.client_payments where id = p_original;
  if not found or orig.status <> 'verified' or orig.refund_of is not null then
    raise exception 'Only verified payments can be refunded.';
  end if;
  select coalesce(-sum(amount_pkr), 0) into refunded from public.client_payments where refund_of = p_original;
  if refunded + p_amount > orig.amount_pkr then
    raise exception 'Refunds would exceed the original payment of %.', public.fmt_pkr(orig.amount_pkr);
  end if;
  insert into public.client_payments (deal_id, agent_id, amount_pkr, paid_on, method, status, verified_by, verified_at, refund_of, note)
  values (orig.deal_id, orig.agent_id, -p_amount, p_paid_on, p_method, 'verified', auth.uid(), now(), p_original, p_note)
  returning id into new_id;
  insert into public.commission_entries
    (payment_id, deal_id, agent_id, month, kind, base_amount_pkr, rate_percent, amount_pkr, description, note, adjusts_entry_id)
  select new_id, (e ->> 'deal_id')::uuid, (e ->> 'agent_id')::uuid, (e ->> 'month')::date,
         'adjustment', (e ->> 'base_amount_pkr')::bigint, (e ->> 'rate_percent')::numeric,
         (e ->> 'amount_pkr')::bigint, e ->> 'description', e ->> 'note', (e ->> 'adjusts_entry_id')::uuid
  from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) e;
  return new_id;
end $$;

-- Lock privileges on internal functions. Supabase grants EXECUTE to anon/authenticated directly,
-- so revoking from PUBLIC alone is not enough.
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.verify_payment(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.record_refund(uuid, bigint, date, public.payment_method, text, jsonb) from public, anon, authenticated;
revoke execute on function public.check_contact(text) from public, anon, authenticated;
revoke execute on function public.leaderboard(date) from public, anon, authenticated;
grant execute on function public.verify_payment(uuid, jsonb) to authenticated;
grant execute on function public.record_refund(uuid, bigint, date, public.payment_method, text, jsonb) to authenticated;
grant execute on function public.check_contact(text) to authenticated;
grant execute on function public.leaderboard(date) to authenticated;
