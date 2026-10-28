-- Ujaagar Sales: performance fixes from the Supabase advisor.
-- Wrapping auth.uid() / is_ceo() in (select ...) makes Postgres evaluate them once per query, not per row.

alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or (select public.is_ceo()));
alter policy profiles_update on public.profiles
  using (id = (select auth.uid()) or (select public.is_ceo()))
  with check (id = (select auth.uid()) or (select public.is_ceo()));

alter policy leads_select on public.leads
  using (owner_agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy leads_insert on public.leads
  with check ((owner_agent_id = (select auth.uid()) and ((select public.is_active_agent()) or (select public.is_ceo())))
              or (select public.is_ceo()));
alter policy leads_update on public.leads
  using (owner_agent_id = (select auth.uid()) or (select public.is_ceo()))
  with check (owner_agent_id = (select auth.uid()) or (select public.is_ceo()));

alter policy clients_select on public.clients
  using (owner_agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy clients_insert on public.clients
  with check ((owner_agent_id = (select auth.uid()) and ((select public.is_active_agent()) or (select public.is_ceo())))
              or (select public.is_ceo()));
alter policy clients_update on public.clients
  using (owner_agent_id = (select auth.uid()) or (select public.is_ceo()))
  with check (owner_agent_id = (select auth.uid()) or (select public.is_ceo()));

alter policy client_owner_history_select on public.client_owner_history
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));

alter policy deals_select on public.deals
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy deals_insert on public.deals
  with check ((agent_id = (select auth.uid()) and ((select public.is_active_agent()) or (select public.is_ceo())))
              or (select public.is_ceo()));
alter policy deals_update on public.deals
  using (agent_id = (select auth.uid()) or (select public.is_ceo()))
  with check (agent_id = (select auth.uid()) or (select public.is_ceo()));

alter policy deal_notes_insert on public.deal_notes
  with check (
    author_id = (select auth.uid()) and (
      (select public.is_ceo())
      or (deal_id is not null and exists (select 1 from public.deals d where d.id = deal_id))
      or (lead_id is not null and exists (select 1 from public.leads l where l.id = lead_id))));

alter policy client_payments_select on public.client_payments
  using ((select public.is_ceo())
         or exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid())));
alter policy client_payments_insert on public.client_payments
  with check ((select public.is_ceo()) or ((select public.is_active_agent())
    and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid()))));
alter policy client_payments_update on public.client_payments
  using ((select public.is_ceo()) or (status = 'pending_verification'
    and exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid()))))
  with check ((select public.is_ceo())
    or exists (select 1 from public.deals d where d.id = deal_id and d.agent_id = (select auth.uid())));

alter policy commission_entries_select on public.commission_entries
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy commission_periods_select on public.commission_periods
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy commission_payouts_select on public.commission_payouts
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));
alter policy commission_payouts_insert on public.commission_payouts
  with check ((select public.is_ceo()) and recorded_by = (select auth.uid()));
alter policy agent_targets_select on public.agent_targets
  using (agent_id = (select auth.uid()) or (select public.is_ceo()));

alter policy notifications_select on public.notifications
  using (user_id = (select auth.uid()));
alter policy notifications_update on public.notifications
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Indexes for the leaderboard, statements and owner lookups.
create index if not exists client_payments_agent_paid_on on public.client_payments (agent_id, paid_on);
create index if not exists client_payments_refund_of on public.client_payments (refund_of) where refund_of is not null;
create index if not exists commission_entries_deal on public.commission_entries (deal_id);
create index if not exists client_owner_history_agent on public.client_owner_history (agent_id);
create index if not exists deals_original_agent on public.deals (original_agent_id);
create index if not exists deals_service on public.deals (service_id);
