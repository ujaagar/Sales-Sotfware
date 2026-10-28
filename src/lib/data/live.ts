import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  expectedCommission,
  pickTier,
  rateSnapshot,
  slabLabel,
  tiersInEffect,
  type Tier,
} from "@/lib/commission";
import { addMonths, currentMonth, karachiDate, karachiDay } from "@/lib/format";
import type {
  AgentDashboard,
  ApprovalDetail,
  CeoDashboard,
  DealRow,
  FollowUp,
  LeadRow,
  LeaderboardRow,
  PaymentRow,
  Viewer,
} from "./types";

// Real data from Supabase. Every query runs as the signed-in user, so RLS limits what comes back.

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  other: "Other",
};

const monthEnd = (month: string) => addMonths(month, 1);

/**
 * The signed-in user's profile, or null. Cached per request.
 * getClaims checks the token's signature locally (ES256 keys), so no extra trip to the auth server;
 * the profile query below still blocks deactivated accounts straight away.
 */
export const getViewerLive = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data: p } = await supabase.from("profiles").select("id, full_name, email, role, is_active").eq("id", userId).maybeSingle();
  if (!p || !p.is_active) return null;
  return { id: p.id, name: p.full_name, email: p.email, role: p.role };
});

type DealJoin = {
  id: string;
  agent_id: string;
  deal_type: "one_time" | "monthly";
  total_amount_pkr: number | null;
  monthly_fee_pkr: number | null;
  start_month: string | null;
  status: DealRow["status"];
  created_at: string;
  clients: { name: string; business_name: string | null } | null;
  services: { name: string } | null;
  agent: { full_name: string } | null;
};

const DEAL_SELECT =
  "id, agent_id, deal_type, total_amount_pkr, monthly_fee_pkr, start_month, status, created_at, clients(name, business_name), services(name), agent:profiles!deals_agent_id_fkey(full_name)";

function toDealRow(d: DealJoin, collected: Map<string, number>): DealRow {
  return {
    id: d.id,
    clientName: d.clients?.name ?? "—",
    businessName: d.clients?.business_name ?? null,
    agentName: d.agent?.full_name ?? "—",
    service: d.services?.name ?? "—",
    type: d.deal_type,
    amount: Number(d.deal_type === "one_time" ? d.total_amount_pkr : d.monthly_fee_pkr) || 0,
    startMonth: d.start_month,
    status: d.status,
    createdAt: d.created_at,
    collected: collected.get(d.id) ?? 0,
  };
}

async function verifiedByDeal(dealIds: string[]) {
  const map = new Map<string, number>();
  if (dealIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("client_payments").select("deal_id, amount_pkr").in("deal_id", dealIds).eq("status", "verified");
  for (const p of data ?? []) map.set(p.deal_id, (map.get(p.deal_id) ?? 0) + Number(p.amount_pkr));
  return map;
}

type PaymentJoin = {
  id: string;
  deal_id: string;
  amount_pkr: number;
  paid_on: string;
  method: string;
  status: PaymentRow["status"];
  agent: { full_name: string } | null;
  deals: { clients: { name: string; business_name: string | null } | null } | null;
};

const PAYMENT_SELECT =
  "id, deal_id, amount_pkr, paid_on, method, status, agent:profiles!client_payments_agent_id_fkey(full_name), deals(clients(name, business_name))";

function toPaymentRow(p: PaymentJoin): PaymentRow {
  return {
    id: p.id,
    dealId: p.deal_id,
    clientName: p.deals?.clients?.business_name ?? p.deals?.clients?.name ?? "—",
    agentName: p.agent?.full_name ?? "—",
    amount: Number(p.amount_pkr),
    paidOn: p.paid_on,
    method: METHOD_LABEL[p.method] ?? p.method,
    status: p.status,
  };
}

export async function getLeadsLive(viewer: Viewer): Promise<LeadRow[]> {
  const supabase = await createClient();
  const [{ data: leads }, { data: services }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, client_name, business_name, phone, city, status, next_follow_up_at, interested_services")
      .eq("owner_agent_id", viewer.id)
      .order("updated_at", { ascending: false }),
    supabase.from("services").select("id, name"),
  ]);
  const names = new Map((services ?? []).map((s) => [s.id, s.name]));
  return (leads ?? []).map((l) => ({
    id: l.id,
    clientName: l.client_name,
    businessName: l.business_name,
    phone: l.phone,
    city: l.city,
    status: l.status,
    nextFollowUpAt: l.next_follow_up_at,
    services: (l.interested_services ?? []).map((id) => names.get(id) ?? "").filter(Boolean),
  }));
}

export async function getDealsLive(viewer: Viewer): Promise<DealRow[]> {
  const supabase = await createClient();
  let q = supabase.from("deals").select(DEAL_SELECT).order("created_at", { ascending: false });
  if (viewer.role === "agent") q = q.eq("agent_id", viewer.id);
  const { data } = await q.returns<DealJoin[]>();
  const rows = data ?? [];
  const collected = await verifiedByDeal(rows.map((d) => d.id));
  return rows.map((d) => toDealRow(d, collected));
}

export async function getLeaderboardLive(viewer: Viewer): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("leaderboard", { p_month: currentMonth() });
  return (data ?? []).map((r) => ({
    rank: r.rank,
    agentId: r.agent_id,
    name: r.full_name,
    collected: r.collected_pkr === null ? null : Number(r.collected_pkr),
    sharePercent: Number(r.share_percent),
    isMe: r.agent_id === viewer.id,
  }));
}

export async function getAgentDashboardLive(viewer: Viewer): Promise<AgentDashboard> {
  const supabase = await createClient();
  const month = currentMonth();
  const endOfToday = new Date(`${karachiDate()}T23:59:59+05:00`).toISOString();

  const [periods, payouts, target, board, leads, deals, payments, dealFollowUps] = await Promise.all([
    supabase.from("commission_periods").select("month, collected_amount_pkr, commission_amount_pkr, status").eq("agent_id", viewer.id),
    supabase.from("commission_payouts").select("amount_pkr").eq("agent_id", viewer.id),
    supabase.from("agent_targets").select("target_amount_pkr").eq("agent_id", viewer.id).eq("month", month).maybeSingle(),
    getLeaderboardLive(viewer),
    getLeadsLive(viewer),
    getDealsLive(viewer),
    supabase
      .from("client_payments")
      .select(PAYMENT_SELECT)
      .is("refund_of", null)
      .order("paid_on", { ascending: false })
      .limit(8)
      .returns<PaymentJoin[]>(),
    supabase
      .from("deals")
      .select("id, next_follow_up_at, clients(name, business_name, phone)")
      .eq("agent_id", viewer.id)
      .lte("next_follow_up_at", endOfToday)
      .in("status", ["pending_approval", "approved"]),
  ]);

  const ps = periods.data ?? [];
  const earnedLocked = ps.filter((p) => p.status === "locked").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
  const earnedEstimated = ps.filter((p) => p.status === "open").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
  const paid = (payouts.data ?? []).reduce((s, p) => s + Number(p.amount_pkr), 0);
  const thisMonth = ps.find((p) => p.month === month);

  const followUps: FollowUp[] = [
    ...leads
      .filter((l) => l.nextFollowUpAt && l.nextFollowUpAt <= endOfToday && !["converted", "lost", "not_interested"].includes(l.status))
      .map((l) => ({ id: l.id, kind: "lead" as const, name: l.clientName, business: l.businessName, at: l.nextFollowUpAt!, phone: l.phone })),
    ...((dealFollowUps.data ?? []) as unknown as { id: string; next_follow_up_at: string; clients: { name: string; business_name: string | null; phone: string } | null }[]).map(
      (d) => ({ id: d.id, kind: "deal" as const, name: d.clients?.name ?? "—", business: d.clients?.business_name ?? null, at: d.next_follow_up_at, phone: d.clients?.phone ?? "" }),
    ),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    month,
    collectedThisMonth: Number(thisMonth?.collected_amount_pkr ?? 0),
    commissionThisMonth: Number(thisMonth?.commission_amount_pkr ?? 0),
    target: target.data ? Number(target.data.target_amount_pkr) : null,
    rank: board.find((r) => r.isMe)?.rank ?? null,
    balance: { earnedLocked, earnedEstimated, earned: earnedLocked + earnedEstimated, paid, pending: earnedLocked + earnedEstimated - paid },
    followUpsToday: followUps,
    leads,
    deals,
    recentPayments: (payments.data ?? []).map(toPaymentRow),
  };
}

export async function getCeoDashboardLive(): Promise<CeoDashboard> {
  const supabase = await createClient();
  const month = currentMonth();
  const sixAgo = addMonths(month, -5);
  const lastMonth = addMonths(month, -1);
  const day = karachiDay();

  const [payments, periods, payouts, approvals, verifications, applications, agents, targets, monthly] = await Promise.all([
    supabase
      .from("client_payments")
      .select("amount_pkr, paid_on, agent_id, deals(services(name))")
      .eq("status", "verified")
      .gte("paid_on", sixAgo),
    supabase.from("commission_periods").select("agent_id, month, commission_amount_pkr, status"),
    supabase.from("commission_payouts").select("amount_pkr"),
    supabase.from("deals").select(DEAL_SELECT).eq("status", "pending_approval").order("created_at").returns<DealJoin[]>(),
    supabase
      .from("client_payments")
      .select(PAYMENT_SELECT)
      .eq("status", "pending_verification")
      .is("refund_of", null)
      .order("created_at")
      .returns<PaymentJoin[]>(),
    supabase.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id, full_name").eq("role", "agent").eq("is_active", true).order("full_name"),
    supabase.from("agent_targets").select("agent_id, target_amount_pkr").eq("month", month),
    supabase
      .from("deals")
      .select("id, agent_id, monthly_fee_pkr, start_month, end_month, clients(name, business_name), agent:profiles!deals_agent_id_fkey(full_name)")
      .eq("deal_type", "monthly")
      .eq("status", "approved")
      .lte("start_month", month),
  ]);

  type P = { amount_pkr: number; paid_on: string; agent_id: string; deals: { services: { name: string } | null } | null };
  const verified = (payments.data ?? []) as unknown as P[];
  const inMonth = (m: string) => (p: P) => p.paid_on >= m && p.paid_on < monthEnd(m);
  const thisMonthPays = verified.filter(inMonth(month));
  const collected = thisMonthPays.reduce((s, p) => s + Number(p.amount_pkr), 0);
  const lastSoFar = verified
    .filter((p) => p.paid_on >= lastMonth && p.paid_on < month && Number(p.paid_on.slice(8, 10)) <= day)
    .reduce((s, p) => s + Number(p.amount_pkr), 0);

  const ps = periods.data ?? [];
  const estimated = ps.filter((p) => p.status === "open").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
  const locked = ps.filter((p) => p.status === "locked").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
  const paid = (payouts.data ?? []).reduce((s, p) => s + Number(p.amount_pkr), 0);

  const byService = new Map<string, number>();
  for (const p of thisMonthPays) {
    const name = p.deals?.services?.name ?? "Other";
    byService.set(name, (byService.get(name) ?? 0) + Number(p.amount_pkr));
  }

  const targetMap = new Map((targets.data ?? []).map((t) => [t.agent_id, Number(t.target_amount_pkr)]));
  const approvedDeals = await supabase.from("deals").select("agent_id").eq("status", "approved");
  const activeCount = new Map<string, number>();
  for (const d of approvedDeals.data ?? []) activeCount.set(d.agent_id, (activeCount.get(d.agent_id) ?? 0) + 1);

  // Monthly packages this month: paid (any payment recorded for this billing month), due (before the 10th) or missed.
  type M = { id: string; agent_id: string; monthly_fee_pkr: number; end_month: string | null; clients: { name: string; business_name: string | null } | null; agent: { full_name: string } | null };
  const monthlyDeals = ((monthly.data ?? []) as unknown as M[]).filter((d) => !d.end_month || d.end_month >= month);
  const recorded = monthlyDeals.length
    ? await supabase
        .from("client_payments")
        .select("deal_id")
        .in("deal_id", monthlyDeals.map((d) => d.id))
        .eq("billing_month", month)
        .neq("status", "rejected")
    : { data: [] as { deal_id: string }[] };
  const recordedSet = new Set((recorded.data ?? []).map((r) => r.deal_id));

  const approvalRows = approvals.data ?? [];
  return {
    month,
    collected,
    collectedLastMonth: lastSoFar,
    commission: { estimated, locked, paid, liability: estimated + locked - paid },
    pendingApprovals: approvalRows.length,
    pendingVerifications: (verifications.data ?? []).length,
    pendingApplications: applications.count ?? 0,
    agents: (agents.data ?? [])
      .map((a) => ({
        id: a.id,
        name: a.full_name,
        collected: thisMonthPays.filter((p) => p.agent_id === a.id).reduce((s, p) => s + Number(p.amount_pkr), 0),
        target: targetMap.get(a.id) ?? null,
        commission: ps.filter((p) => p.agent_id === a.id && p.month === month).reduce((s, p) => s + Number(p.commission_amount_pkr), 0),
        activeDeals: activeCount.get(a.id) ?? 0,
      }))
      .sort((a, b) => b.collected - a.collected || a.name.localeCompare(b.name)),
    salesByService: [...byService.entries()].map(([service, amount]) => ({ service, amount })).sort((a, b) => b.amount - a.amount),
    collectedByMonth: Array.from({ length: 6 }, (_, i) => addMonths(sixAgo, i)).map((m) => ({
      month: m,
      amount: verified.filter(inMonth(m)).reduce((s, p) => s + Number(p.amount_pkr), 0),
    })),
    monthlyDeals: monthlyDeals.map((d) => ({
      dealId: d.id,
      clientName: d.clients?.business_name ?? d.clients?.name ?? "—",
      agentName: d.agent?.full_name ?? "—",
      fee: Number(d.monthly_fee_pkr),
      state: recordedSet.has(d.id) ? ("paid" as const) : day > 10 ? ("missed" as const) : ("due" as const),
    })),
    approvals: approvalRows.map((d) => toDealRow(d, new Map())),
    verifications: (verifications.data ?? []).map(toPaymentRow),
  };
}

export async function getTiersLive(): Promise<Tier[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("commission_tiers").select("id, kind, min_amount_pkr, max_amount_pkr, rate_percent, effective_from");
  return (data ?? []).map((t) => ({
    id: t.id,
    kind: t.kind,
    min: Number(t.min_amount_pkr),
    max: t.max_amount_pkr === null ? null : Number(t.max_amount_pkr),
    rate: Number(t.rate_percent),
    effectiveFrom: t.effective_from,
  }));
}

export async function getApprovalLive(id: string): Promise<ApprovalDetail | null> {
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deals")
    .select(
      "id, agent_id, deal_type, total_amount_pkr, monthly_fee_pkr, start_month, status, created_at, description, clients(name, business_name, phone), services(name), agent:profiles!deals_agent_id_fkey(full_name, email)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!d) return null;
  const deal = d as unknown as DealJoin & {
    description: string | null;
    clients: { name: string; business_name: string | null; phone: string } | null;
    agent: { full_name: string; email: string } | null;
  };
  const tiers = await getTiersLive();
  const today = karachiDate();
  const terms = {
    type: deal.deal_type,
    totalAmount: deal.total_amount_pkr === null ? null : Number(deal.total_amount_pkr),
    monthlyFee: deal.monthly_fee_pkr === null ? null : Number(deal.monthly_fee_pkr),
  };
  const amount = Number(deal.deal_type === "one_time" ? deal.total_amount_pkr : deal.monthly_fee_pkr);
  const snap = rateSnapshot(terms, tiers, today);
  const ns = pickTier(tiersInEffect(tiers, "new_sale", today), amount)!;
  const rec = deal.deal_type === "monthly" ? pickTier(tiersInEffect(tiers, "recurring", today), amount) : null;
  return {
    ...toDealRow(deal, new Map()),
    description: deal.description,
    clientPhone: deal.clients?.phone ?? "",
    agentEmail: deal.agent?.email ?? "",
    slabLabel: slabLabel(ns),
    newSaleRate: snap.newSaleRate,
    recurringSlabLabel: rec ? slabLabel(rec) : null,
    recurringRate: snap.recurringRate,
    expected: expectedCommission(terms, snap),
  };
}

export async function getPaymentDetailLive(id: string): Promise<import("./types").PaymentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_payments")
    .select(
      "id, deal_id, amount_pkr, paid_on, billing_month, method, status, note, created_at, proof_file_path, agent:profiles!client_payments_agent_id_fkey(full_name), deals(deal_type, total_amount_pkr, monthly_fee_pkr, new_sale_rate_percent, recurring_rate_percent, clients(name, business_name), services(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as PaymentJoin & {
    billing_month: string | null;
    note: string | null;
    created_at: string;
    proof_file_path: string | null;
    deals: {
      deal_type: "one_time" | "monthly";
      total_amount_pkr: number | null;
      monthly_fee_pkr: number | null;
      new_sale_rate_percent: number | null;
      recurring_rate_percent: number | null;
      clients: { name: string; business_name: string | null } | null;
      services: { name: string } | null;
    } | null;
  };
  const deal = p.deals!;
  let proofUrl: string | null = null;
  if (p.proof_file_path) {
    const signed = await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_file_path, 600);
    proofUrl = signed.data?.signedUrl ?? null;
  }
  const collected = (await verifiedByDeal([p.deal_id])).get(p.deal_id) ?? 0;

  let commission: import("./types").PaymentDetail["commission"] = null;
  try {
    const { computePaymentEntry } = await import("@/lib/commission/server");
    const { entry } = await computePaymentEntry(supabase, id);
    if (entry) {
      const { data: who } = await supabase.from("profiles").select("full_name").eq("id", entry.agent_id).maybeSingle();
      commission = {
        kind: entry.kind === "recurring" ? "recurring" : "new_sale",
        rate: entry.rate_percent,
        amount: entry.amount_pkr,
        agentName: who?.full_name ?? "—",
        note: entry.note,
      };
    }
  } catch {
    commission = null;
  }

  return {
    ...toPaymentRow(p),
    billingMonth: p.billing_month,
    note: p.note,
    createdAt: p.created_at,
    proofUrl,
    proofIsPdf: (p.proof_file_path ?? "").endsWith(".pdf"),
    dealType: deal.deal_type,
    dealAmount: Number(deal.deal_type === "one_time" ? deal.total_amount_pkr : deal.monthly_fee_pkr) || 0,
    dealCollected: collected,
    service: deal.services?.name ?? "—",
    newSaleRate: deal.new_sale_rate_percent === null ? null : Number(deal.new_sale_rate_percent),
    recurringRate: deal.recurring_rate_percent === null ? null : Number(deal.recurring_rate_percent),
    commission,
  };
}

/** Counts for the CEO sidebar badges: three tiny count queries instead of the whole dashboard. */
export async function getCeoBadgesLive(): Promise<{ pendingApplications: number; pendingApprovals: number; pendingVerifications: number }> {
  const supabase = await createClient();
  const [apps, deals, pays] = await Promise.all([
    supabase.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase.from("client_payments").select("id", { count: "exact", head: true }).eq("status", "pending_verification").is("refund_of", null),
  ]);
  return { pendingApplications: apps.count ?? 0, pendingApprovals: deals.count ?? 0, pendingVerifications: pays.count ?? 0 };
}
