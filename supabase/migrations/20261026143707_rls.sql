-- Ujaagar Sales: Row Level Security. The CEO sees everything; agents see only their own rows.
-- Tables without policies for a role are invisible to that role. The service role bypasses RLS
-- and is used only in server code (account creation, invites, public application form, cron).

do $$
declare t text;
begin
  foreach t in array array['profiles','agent_applications','agent_invites','application_attempts','services',
    'app_settings','leads','clients','client_owner_history','commission_tiers','deals','deal_notes','client_payments',
    'commission_periods','commission_entries','commission_payouts','agent_targets','monthly_due_alerts',
    'notifications','activity_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_ceo());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.is_ceo() and role = 'agent');
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_ceo())
  with check (id = auth.uid() or public.is_ceo());

-- agent applications (public form writes through the server with the service role)
create policy agent_applications_ceo on public.agent_applications for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- agent_invites, application_attempts, monthly_due_alerts writes: service role only (no policies).
create policy monthly_due_alerts_ceo on public.monthly_due_alerts for select to authenticated
  using (public.is_ceo());

-- services: everyone signed in can read; the CEO manages.
create policy services_select on public.services for select to authenticated using (true);
create policy services_write on public.services for insert to authenticated with check (public.is_ceo());
create policy services_update on public.services for update to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- settings and commission rates: CEO only.
create policy app_settings_ceo on public.app_settings for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());
create policy commission_tiers_select on public.commission_tiers for select to authenticated using (public.is_ceo());
create policy commission_tiers_insert on public.commission_tiers for insert to authenticated with check (public.is_ceo());

-- leads
create policy leads_select on public.leads for select to authenticated
  using (owner_agent_id = auth.uid() or public.is_ceo());
create policy leads_insert on public.leads for insert to authenticated
  with check ((owner_agent_id = auth.uid() and (public.is_active_agent() or public.is_ceo())) or public.is_ceo());
create policy leads_update on public.leads for update to authenticated
  using (owner_agent_id = auth.uid() or public.is_ceo())
  with check (owner_agent_id = auth.uid() or public.is_ceo());

-- clients
create policy clients_select on public.clients for select to authenticated
  using (owner_agent_id = auth.uid() or public.is_ceo());
create policy clients_insert on public.clients for insert to authenticated
  with check ((owner_agent_id = auth.uid() and (public.is_active_agent() or public.is_ceo())) or public.is_ceo());
create policy clients_update on public.clients for update to authenticated
  using (owner_agent_id = auth.uid() or public.is_ceo())
  with check (owner_agent_id = auth.uid() or public.is_ceo());

create policy client_owner_history_select on public.client_owner_history for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());

-- deals
create policy deals_select on public.deals for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());
create policy deals_insert on public.deals for insert to authenticated
  with check ((agent_id = auth.uid() and (public.is_active_agent() or public.is_ceo())) or public.is_ceo());
create policy deals_update on public.deals for update to authenticated
  using (agent_id = auth.uid() or public.is_ceo())
  with check (agent_id = auth.uid() or public.is_ceo());

-- notes: visible with the parent lead/deal (parent RLS applies inside the subquery).
create policy deal_notes_select on public.deal_notes for select to authenticated
  using (
    public.is_ceo()
    or (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id))
    or (lead_id is not null and exists (select 1 from public.leads l where l.id = lead_id)));
create policy deal_notes_insert on public.deal_notes for insert to authenticated
  with check (
    author_id = auth.uid() and (
      public.is_ceo()
      or (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id))
      or (lead_id is not null and exists (select 1 from public.leads l where l.id = lead_id))));

-- payments: visible to whoever currently manages the deal.
create policy client_payments_select on public.client_payments for select to authenticated
  using (public.is_ceo() or exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = auth.uid()));
create policy client_payments_insert on public.client_payments for insert to authenticated
  with check (public.is_ceo() or (public.is_active_agent()
    and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = auth.uid())));
create policy client_payments_update on public.client_payments for update to authenticated
  using (public.is_ceo() or (status = 'pending_verification'
    and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = auth.uid())))
  with check (public.is_ceo() or exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = auth.uid()));

-- commission
create policy commission_entries_select on public.commission_entries for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());
create policy commission_entries_insert on public.commission_entries for insert to authenticated
  with check (public.is_ceo());
create policy commission_periods_select on public.commission_periods for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());
create policy commission_periods_update on public.commission_periods for update to authenticated
  using (public.is_ceo()) with check (public.is_ceo());
create policy commission_payouts_select on public.commission_payouts for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());
create policy commission_payouts_insert on public.commission_payouts for insert to authenticated
  with check (public.is_ceo() and recorded_by = auth.uid());
create policy agent_targets_select on public.agent_targets for select to authenticated
  using (agent_id = auth.uid() or public.is_ceo());
create policy agent_targets_write on public.agent_targets for insert to authenticated with check (public.is_ceo());
create policy agent_targets_update on public.agent_targets for update to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- notifications: own only; users can only mark them read.
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- activity log: CEO reads; written only by triggers.
create policy activity_log_select on public.activity_log for select to authenticated using (public.is_ceo());
