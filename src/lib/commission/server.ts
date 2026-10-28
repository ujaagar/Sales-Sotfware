import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { currentMonth } from "@/lib/format";
import { entryForPayment, type CommissionEntry } from "./index";

// Loads everything the commission module needs for one payment and returns its entry.
// Runs with the CEO's session (the CEO can read all rows under RLS).

export type PaymentForVerify = {
  id: string;
  status: Database["public"]["Enums"]["payment_status"];
  amount: number;
  paidOn: string;
  billingMonth: string | null;
  dealId: string;
};

export async function computePaymentEntry(
  supabase: SupabaseClient<Database>,
  paymentId: string,
): Promise<{ payment: PaymentForVerify; entry: CommissionEntry | null }> {
  const { data: p, error } = await supabase
    .from("client_payments")
    .select(
      "id, status, amount_pkr, paid_on, billing_month, deal_id, deals(id, client_id, deal_type, total_amount_pkr, monthly_fee_pkr, start_month, original_agent_id, new_sale_rate_percent, recurring_rate_percent, clients(name, business_name), services(name))",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !p) throw new Error("Payment not found.");
  const deal = p.deals as unknown as {
    id: string;
    client_id: string;
    deal_type: "one_time" | "monthly";
    total_amount_pkr: number | null;
    monthly_fee_pkr: number | null;
    start_month: string | null;
    original_agent_id: string;
    new_sale_rate_percent: number | null;
    recurring_rate_percent: number | null;
    clients: { name: string; business_name: string | null } | null;
    services: { name: string } | null;
  };

  const [{ data: owners }, { data: setting }] = await Promise.all([
    supabase.from("client_owner_history").select("agent_id, from_date, to_date").eq("client_id", deal.client_id),
    supabase.from("app_settings").select("value").eq("key", "recurring_stops_when_agent_inactive").maybeSingle(),
  ]);
  const agentIds = [...new Set([deal.original_agent_id, ...(owners ?? []).map((o) => o.agent_id)])];
  const [{ data: profiles }, { data: locked }] = await Promise.all([
    supabase.from("profiles").select("id, role, is_active").in("id", agentIds),
    supabase.from("commission_periods").select("agent_id, month").in("agent_id", agentIds).eq("status", "locked"),
  ]);
  const lockedSet = new Set((locked ?? []).map((l) => `${l.agent_id}|${l.month}`));

  const payment: PaymentForVerify = {
    id: p.id,
    status: p.status,
    amount: Number(p.amount_pkr),
    paidOn: p.paid_on,
    billingMonth: p.billing_month,
    dealId: p.deal_id,
  };

  const entry = entryForPayment(
    { amount: payment.amount, paidOn: payment.paidOn, billingMonth: payment.billingMonth },
    {
      id: deal.id,
      type: deal.deal_type,
      totalAmount: deal.total_amount_pkr === null ? null : Number(deal.total_amount_pkr),
      monthlyFee: deal.monthly_fee_pkr === null ? null : Number(deal.monthly_fee_pkr),
      startMonth: deal.start_month,
      originalAgentId: deal.original_agent_id,
      newSaleRate: deal.new_sale_rate_percent === null ? null : Number(deal.new_sale_rate_percent),
      recurringRate: deal.recurring_rate_percent === null ? null : Number(deal.recurring_rate_percent),
      label: `${deal.clients?.business_name ?? deal.clients?.name ?? "Client"} · ${deal.services?.name ?? "Service"}`,
    },
    {
      owners: (owners ?? []).map((o) => ({ agentId: o.agent_id, fromDate: o.from_date, toDate: o.to_date })),
      agents: Object.fromEntries((profiles ?? []).map((a) => [a.id, { active: a.is_active, isCeo: a.role === "ceo" }])),
      recurringStopsWhenInactive: setting?.value !== false,
      isLocked: (agentId, month) => lockedSet.has(`${agentId}|${month}`),
      currentMonth: currentMonth(),
    },
  );
  return { payment, entry };
}
