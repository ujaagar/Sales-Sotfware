-- Ujaagar Sales: hardening after the Supabase security advisor review.

-- 1. Fixed search_path on every function (prevents search_path hijacking).
alter function public.karachi_today() set search_path = public, pg_temp;
alter function public.month_start(date) set search_path = public, pg_temp;
alter function public.normalize_phone(text) set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.is_service() set search_path = public, pg_temp;
alter function public.fmt_pkr(bigint) set search_path = public, pg_temp;
alter function public.profiles_guard() set search_path = public, pg_temp;
alter function public.contact_guard() set search_path = public, pg_temp;
alter function public.deals_guard() set search_path = public, pg_temp;
alter function public.payments_guard() set search_path = public, pg_temp;
alter function public.entries_guard() set search_path = public, pg_temp;
alter function public.periods_guard() set search_path = public, pg_temp;
alter function public.no_delete() set search_path = public, pg_temp;
alter function public.append_only() set search_path = public, pg_temp;

-- 2. Trigger functions and internal helpers are not callable through the API.
--    (Triggers still fire; EXECUTE is only checked when a function is called directly.)
revoke execute on function public.clients_owner_history() from public, anon, authenticated;
revoke execute on function public.entries_rollup() from public, anon, authenticated;
revoke execute on function public.log_activity() from public, anon, authenticated;
revoke execute on function public.notify_deals() from public, anon, authenticated;
revoke execute on function public.notify_payments() from public, anon, authenticated;
revoke execute on function public.notify_payouts() from public, anon, authenticated;
revoke execute on function public.notify_periods() from public, anon, authenticated;
revoke execute on function public.notify_applications() from public, anon, authenticated;
revoke execute on function public.ceo_id() from public, anon, authenticated;

-- 3. Role checks are used by RLS policies for signed-in users only.
revoke execute on function public.is_ceo() from public, anon;
revoke execute on function public.is_active_agent() from public, anon;
grant execute on function public.is_ceo() to authenticated;
grant execute on function public.is_active_agent() to authenticated;
