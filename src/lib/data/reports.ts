import "server-only";
import { addMonths, currentMonth, isDate, karachiDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type ReportFilters = { from: string; to: string; agent: string; service: string; status: string };

export function parseFilters(sp: Record<string, string | undefined>): ReportFilters {
  const from = isDate(sp.from) ? sp.from! : addMonths(currentMonth(), -2);
  const to = isDate(sp.to) ? sp.to! : karachiDate();
  return { from, to, agent: sp.agent ?? "", service: sp.service ?? "", status: sp.status ?? "" };
}

export type PaymentReportRow = {
  paidOn: string;
  agent: string;
  client: string;
  service: string;
  dealType: string;
  method: string;
  amount: number;
  commission: number;
  status: string;
};

export type DealReportRow = {
  createdAt: string;
  agent: string;
  client: string;
  service: string;
  dealType: string;
  amount: number;
  status: string;
  rate: number | null;
};

export async function getReport(f: ReportFilters) {
  const supabase = await createClient();
  let pq = supabase
    .from("client_payments")
    .select(
      "id, paid_on, amount_pkr, method, status, agent_id, agent:profiles!client_payments_agent_id_fkey(full_name), deals!inner(deal_type, service_id, status, services(name), clients(name, business_name)), commission_entries(amount_pkr)",
    )
    .gte("paid_on", f.from)
    .lte("paid_on", f.to)
    .order("paid_on", { ascending: false });
  if (f.agent) pq = pq.eq("agent_id", f.agent);
  if (f.service) pq = pq.eq("deals.service_id", f.service);
  if (f.status) pq = pq.eq("deals.status", f.status as "approved");

  let dq = supabase
    .from("deals")
    .select(
      "id, created_at, deal_type, total_amount_pkr, monthly_fee_pkr, status, new_sale_rate_percent, agent:profiles!deals_agent_id_fkey(full_name), services(name), clients(name, business_name)",
    )
    .gte("created_at", `${f.from}T00:00:00+05:00`)
    .lte("created_at", `${f.to}T23:59:59+05:00`)
    .order("created_at", { ascending: false });
  if (f.agent) dq = dq.eq("agent_id", f.agent);
  if (f.service) dq = dq.eq("service_id", f.service);
  if (f.status) dq = dq.eq("status", f.status as "approved");

  const [{ data: pays }, { data: deals }] = await Promise.all([pq, dq]);

  type Pay = {
    paid_on: string;
    amount_pkr: number;
    method: string;
    status: string;
    agent: { full_name: string } | null;
    deals: { deal_type: string; services: { name: string } | null; clients: { name: string; business_name: string | null } | null } | null;
    commission_entries: { amount_pkr: number }[];
  };
  const payments: PaymentReportRow[] = ((pays ?? []) as unknown as Pay[]).map((p) => ({
    paidOn: p.paid_on,
    agent: p.agent?.full_name ?? "—",
    client: p.deals?.clients?.business_name ?? p.deals?.clients?.name ?? "—",
    service: p.deals?.services?.name ?? "—",
    dealType: p.deals?.deal_type === "monthly" ? "Monthly" : "One-time",
    method: p.method,
    amount: Number(p.amount_pkr),
    commission: (p.commission_entries ?? []).reduce((s, e) => s + Number(e.amount_pkr), 0),
    status: p.status,
  }));

  type Deal = {
    created_at: string;
    deal_type: string;
    total_amount_pkr: number | null;
    monthly_fee_pkr: number | null;
    status: string;
    new_sale_rate_percent: number | null;
    agent: { full_name: string } | null;
    services: { name: string } | null;
    clients: { name: string; business_name: string | null } | null;
  };
  const dealRows: DealReportRow[] = ((deals ?? []) as unknown as Deal[]).map((d) => ({
    createdAt: d.created_at,
    agent: d.agent?.full_name ?? "—",
    client: d.clients?.business_name ?? d.clients?.name ?? "—",
    service: d.services?.name ?? "—",
    dealType: d.deal_type === "monthly" ? "Monthly" : "One-time",
    amount: Number(d.deal_type === "monthly" ? d.monthly_fee_pkr : d.total_amount_pkr) || 0,
    status: d.status,
    rate: d.new_sale_rate_percent === null ? null : Number(d.new_sale_rate_percent),
  }));

  const verified = payments.filter((p) => p.status === "verified");
  return {
    payments,
    deals: dealRows,
    totals: {
      collected: verified.reduce((s, p) => s + p.amount, 0),
      commission: verified.reduce((s, p) => s + p.commission, 0),
      deals: dealRows.length,
      dealValue: dealRows.filter((d) => d.status !== "rejected" && d.status !== "cancelled").reduce((s, d) => s + d.amount, 0),
    },
  };
}
