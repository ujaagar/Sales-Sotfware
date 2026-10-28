// Sample data for preview mode only (used while Supabase isn't configured).
// Commission figures come from the real commission module so the preview shows real maths.
import { commissionFor, expectedCommission, pickTier, rateSnapshot, slabLabel, tiersInEffect, type Tier } from "@/lib/commission";
import { addMonths, currentMonth, karachiDate } from "@/lib/format";
import type {
  AgentDashboard,
  ApprovalDetail,
  CeoDashboard,
  DealRow,
  LeadRow,
  LeaderboardRow,
  PaymentRow,
  Viewer,
} from "@/lib/data/types";

const M = currentMonth();
const M1 = addMonths(M, -1);
const today = karachiDate();
const day = (month: string, d: number) => `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;
const soon = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();

export const SAMPLE_TIERS: Tier[] = [
  { id: "t1", kind: "new_sale", min: 0, max: 50000, rate: 10, effectiveFrom: "2026-01-01" },
  { id: "t2", kind: "new_sale", min: 50001, max: 100000, rate: 12, effectiveFrom: "2026-01-01" },
  { id: "t3", kind: "new_sale", min: 100001, max: 200000, rate: 13.5, effectiveFrom: "2026-01-01" },
  { id: "t4", kind: "new_sale", min: 200001, max: 300000, rate: 15, effectiveFrom: "2026-01-01" },
  { id: "t5", kind: "new_sale", min: 300001, max: null, rate: 18, effectiveFrom: "2026-01-01" },
  { id: "t6", kind: "recurring", min: 0, max: 150000, rate: 1.5, effectiveFrom: "2026-01-01" },
  { id: "t7", kind: "recurring", min: 150001, max: null, rate: 2, effectiveFrom: "2026-01-01" },
];

export const SAMPLE_CEO: Viewer = { id: "ceo", name: "Ahmed Mujtaba", email: "ceo@ujaagar.pk", role: "ceo" };
export const SAMPLE_AGENT: Viewer = { id: "ali", name: "Ali Khan", email: "ali@ujaagar.pk", role: "agent" };

const AGENTS = [
  { id: "ali", name: "Ali Khan" },
  { id: "sara", name: "Sara Ahmed" },
  { id: "usman", name: "Usman Tariq" },
];

const DEALS: (DealRow & { agentId: string; description: string; phone: string })[] = [
  { id: "d1", agentId: "ali", clientName: "Bilal Ahmed", businessName: "Bilal Foods", agentName: "Ali Khan", service: "Social Media Management", type: "monthly", amount: 80000, startMonth: M1, status: "approved", createdAt: day(M1, 2), collected: 160000, description: "Monthly SMM package: 20 posts + 8 reels", phone: "0300-1234567" },
  { id: "d2", agentId: "ali", clientName: "Hina Siddiqui", businessName: "Karachi Bakers", agentName: "Ali Khan", service: "Website Development", type: "one_time", amount: 250000, startMonth: null, status: "approved", createdAt: day(M1, 12), collected: 150000, description: "E-commerce website with WhatsApp ordering", phone: "0321-7654321" },
  { id: "d3", agentId: "sara", clientName: "Ayesha Malik", businessName: "Style Studio", agentName: "Sara Ahmed", service: "Meta Ads", type: "monthly", amount: 160000, startMonth: M1, status: "approved", createdAt: day(M1, 4), collected: 160000, description: "Meta ads management", phone: "0333-1112223" },
  { id: "d4", agentId: "sara", clientName: "Faraz Ali", businessName: "Iron Gym", agentName: "Sara Ahmed", service: "Video Editing", type: "one_time", amount: 45000, startMonth: null, status: "approved", createdAt: day(M, 1), collected: 45000, description: "5 promo reels", phone: "0345-9998887" },
  { id: "d5", agentId: "usman", clientName: "Kamran Shah", businessName: "Tech Hub", agentName: "Usman Tariq", service: "SEO", type: "monthly", amount: 60000, startMonth: M, status: "pending_approval", createdAt: today, collected: 0, description: "Local SEO, 3 months minimum", phone: "0301-4445556" },
  { id: "d6", agentId: "ali", clientName: "Zain Abbas", businessName: "Zain Motors", agentName: "Ali Khan", service: "Meta Ads", type: "one_time", amount: 120000, startMonth: null, status: "pending_approval", createdAt: today, collected: 0, description: "Launch campaign for new showroom, 6 weeks", phone: "0300-5551110" },
  { id: "d7", agentId: "usman", clientName: "Nadia Khan", businessName: "Chai Cafe", agentName: "Usman Tariq", service: "Branding & Design", type: "one_time", amount: 35000, startMonth: null, status: "rejected", createdAt: day(M, 2), collected: 0, description: "Logo and menu design", phone: "0302-1231231" },
];

const PAYMENTS: (PaymentRow & { agentId: string; kind: "new_sale" | "recurring" })[] = [
  { id: "p1", dealId: "d1", agentId: "ali", clientName: "Bilal Foods", agentName: "Ali Khan", amount: 80000, paidOn: day(M1, 5), method: "Bank transfer", status: "verified", kind: "new_sale" },
  { id: "p2", dealId: "d2", agentId: "ali", clientName: "Karachi Bakers", agentName: "Ali Khan", amount: 150000, paidOn: day(M1, 18), method: "Bank transfer", status: "verified", kind: "new_sale" },
  { id: "p3", dealId: "d1", agentId: "ali", clientName: "Bilal Foods", agentName: "Ali Khan", amount: 80000, paidOn: day(M, 3), method: "JazzCash", status: "verified", kind: "recurring" },
  { id: "p4", dealId: "d2", agentId: "ali", clientName: "Karachi Bakers", agentName: "Ali Khan", amount: 100000, paidOn: today, method: "Cash", status: "pending_verification", kind: "new_sale" },
  { id: "p5", dealId: "d3", agentId: "sara", clientName: "Style Studio", agentName: "Sara Ahmed", amount: 160000, paidOn: day(M1, 10), method: "Bank transfer", status: "verified", kind: "new_sale" },
  { id: "p6", dealId: "d3", agentId: "sara", clientName: "Style Studio", agentName: "Sara Ahmed", amount: 160000, paidOn: today, method: "Bank transfer", status: "pending_verification", kind: "recurring" },
  { id: "p7", dealId: "d4", agentId: "sara", clientName: "Iron Gym", agentName: "Sara Ahmed", amount: 45000, paidOn: day(M, 2), method: "EasyPaisa", status: "verified", kind: "new_sale" },
];

function commissionOf(p: (typeof PAYMENTS)[number]) {
  const d = DEALS.find((x) => x.id === p.dealId)!;
  const snap = rateSnapshot({ type: d.type, totalAmount: d.amount, monthlyFee: d.amount }, SAMPLE_TIERS, d.createdAt);
  return commissionFor(p.amount, p.kind === "recurring" ? snap.recurringRate! : snap.newSaleRate);
}

const verifiedIn = (month: string, agentId?: string) =>
  PAYMENTS.filter((p) => p.status === "verified" && p.paidOn.startsWith(month.slice(0, 7)) && (!agentId || p.agentId === agentId));

const LEADS: (LeadRow & { agentId: string })[] = [
  { id: "l1", agentId: "ali", clientName: "Zain Abbas", businessName: "Zain Motors", phone: "0300-5551110", city: "Karachi", status: "converted", nextFollowUpAt: null, services: ["Meta Ads"] },
  { id: "l2", agentId: "ali", clientName: "Mariam Qureshi", businessName: "MQ Boutique", phone: "0300-5551111", city: "Karachi", status: "interested", nextFollowUpAt: soon(2), services: ["Social Media Management"] },
  { id: "l3", agentId: "ali", clientName: "Owais Raza", businessName: "Owais Traders", phone: "0300-5551112", city: "Hyderabad", status: "new", nextFollowUpAt: soon(5), services: ["Website Development"] },
  { id: "l4", agentId: "ali", clientName: "Fatima Noor", businessName: "Noor Skincare", phone: "0300-5551117", city: "Karachi", status: "contacted", nextFollowUpAt: soon(30), services: ["Meta Ads", "Video Editing"] },
  { id: "l5", agentId: "ali", clientName: "Imran Butt", businessName: "Butt Karahi", phone: "0300-5551118", city: "Lahore", status: "not_interested", nextFollowUpAt: null, services: ["SEO"] },
  { id: "l6", agentId: "ali", clientName: "Saad Mirza", businessName: "Mirza Tiles", phone: "0300-5551119", city: "Karachi", status: "lost", nextFollowUpAt: null, services: ["Website Development"] },
];

export function sampleAgentDashboard(agentId = "ali"): AgentDashboard {
  const mine = PAYMENTS.filter((p) => p.agentId === agentId && p.status === "verified");
  const earnedLocked = mine.filter((p) => p.paidOn.startsWith(M1.slice(0, 7))).reduce((s, p) => s + commissionOf(p), 0);
  const earnedEstimated = mine.filter((p) => p.paidOn.startsWith(M.slice(0, 7))).reduce((s, p) => s + commissionOf(p), 0);
  const paid = 15000;
  const collectedThisMonth = verifiedIn(M, agentId).reduce((s, p) => s + p.amount, 0);
  const board = sampleLeaderboard(agentId);
  return {
    month: M,
    collectedThisMonth,
    commissionThisMonth: earnedEstimated,
    target: 300000,
    rank: board.find((r) => r.isMe)?.rank ?? null,
    balance: { earnedLocked, earnedEstimated, earned: earnedLocked + earnedEstimated, paid, pending: earnedLocked + earnedEstimated - paid },
    followUpsToday: LEADS.filter(
      (l) => l.agentId === agentId && l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() - Date.now() < 12 * 3600_000,
    )
      .map((l) => ({ id: l.id, kind: "lead" as const, name: l.clientName, business: l.businessName, at: l.nextFollowUpAt!, phone: l.phone })),
    leads: LEADS.filter((l) => l.agentId === agentId),
    deals: DEALS.filter((d) => d.agentId === agentId),
    recentPayments: PAYMENTS.filter((p) => p.agentId === agentId).sort((a, b) => b.paidOn.localeCompare(a.paidOn)),
  };
}

export function sampleLeads(agentId = "ali"): LeadRow[] {
  return LEADS.filter((l) => l.agentId === agentId);
}

export function sampleDeals(agentId?: string): DealRow[] {
  return DEALS.filter((d) => !agentId || d.agentId === agentId);
}

export function sampleLeaderboard(viewerId: string | null): LeaderboardRow[] {
  const totals = AGENTS.map((a) => ({ ...a, total: verifiedIn(M, a.id).reduce((s, p) => s + p.amount, 0) })).sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
  const max = Math.max(1, ...totals.map((t) => t.total));
  return totals.map((t, i) => ({
    rank: i + 1,
    agentId: t.id,
    name: t.name,
    collected: viewerId === null || viewerId === t.id ? t.total : null,
    sharePercent: Math.round((t.total * 1000) / max) / 10,
    isMe: viewerId === t.id,
  }));
}

export function sampleCeoDashboard(): CeoDashboard {
  const collected = verifiedIn(M).reduce((s, p) => s + p.amount, 0);
  const collectedLastMonth = verifiedIn(M1).reduce((s, p) => s + p.amount, 0);
  const locked = verifiedIn(M1).reduce((s, p) => s + commissionOf(p), 0);
  const estimated = verifiedIn(M).reduce((s, p) => s + commissionOf(p), 0);
  const paid = 15000 + 21600;
  const byService = new Map<string, number>();
  for (const p of verifiedIn(M)) {
    const s = DEALS.find((d) => d.id === p.dealId)!.service;
    byService.set(s, (byService.get(s) ?? 0) + p.amount);
  }
  // A fuller picture for the chart: add pending-verification money as not counted.
  const history = [-5, -4, -3, -2, -1, 0].map((i) => addMonths(M, i));
  const past = [180000, 245000, 210000, 320000];
  return {
    month: M,
    collected,
    collectedLastMonth,
    commission: { estimated, locked, paid, liability: estimated + locked - paid },
    pendingApprovals: DEALS.filter((d) => d.status === "pending_approval").length,
    pendingVerifications: PAYMENTS.filter((p) => p.status === "pending_verification").length,
    pendingApplications: 2,
    agents: AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      collected: verifiedIn(M, a.id).reduce((s, p) => s + p.amount, 0),
      target: a.id === "usman" ? 150000 : 300000,
      commission: verifiedIn(M, a.id).reduce((s, p) => s + commissionOf(p), 0),
      activeDeals: DEALS.filter((d) => d.agentId === a.id && d.status === "approved").length,
    })).sort((a, b) => b.collected - a.collected),
    salesByService: [...byService.entries()].map(([service, amount]) => ({ service, amount })).sort((a, b) => b.amount - a.amount),
    collectedByMonth: history.map((m, i) => ({ month: m, amount: i < 4 ? past[i] : i === 4 ? collectedLastMonth : collected })),
    monthlyDeals: [
      { dealId: "d1", clientName: "Bilal Foods", agentName: "Ali Khan", fee: 80000, state: "paid" },
      { dealId: "d3", clientName: "Style Studio", agentName: "Sara Ahmed", fee: 160000, state: Number(today.slice(8)) > 10 ? "missed" : "due" },
    ],
    approvals: DEALS.filter((d) => d.status === "pending_approval"),
    verifications: PAYMENTS.filter((p) => p.status === "pending_verification"),
  };
}

export function sampleApproval(id: string): ApprovalDetail | null {
  const d = DEALS.find((x) => x.id === id);
  if (!d) return null;
  const terms = { type: d.type, totalAmount: d.amount, monthlyFee: d.amount };
  const snap = rateSnapshot(terms, SAMPLE_TIERS, today);
  const ns = pickTier(tiersInEffect(SAMPLE_TIERS, "new_sale", today), d.amount)!;
  const rec = d.type === "monthly" ? pickTier(tiersInEffect(SAMPLE_TIERS, "recurring", today), d.amount) : null;
  return {
    ...d,
    clientPhone: d.phone,
    agentEmail: `${d.agentId}@ujaagar.pk`,
    slabLabel: slabLabel(ns),
    newSaleRate: snap.newSaleRate,
    recurringSlabLabel: rec ? slabLabel(rec) : null,
    recurringRate: snap.recurringRate,
    expected: expectedCommission(terms, snap),
  };
}

export function samplePaymentDetail(id: string): import("@/lib/data/types").PaymentDetail | null {
  const p = PAYMENTS.find((x) => x.id === id);
  if (!p) return null;
  const d = DEALS.find((x) => x.id === p.dealId)!;
  const snap = rateSnapshot({ type: d.type, totalAmount: d.amount, monthlyFee: d.amount }, SAMPLE_TIERS, d.createdAt);
  const rate = p.kind === "recurring" ? snap.recurringRate! : snap.newSaleRate;
  return {
    ...p,
    billingMonth: d.type === "monthly" ? `${p.paidOn.slice(0, 7)}-01` : null,
    note: null,
    createdAt: p.paidOn,
    proofUrl: null,
    proofIsPdf: false,
    dealType: d.type,
    dealAmount: d.amount,
    dealCollected: d.collected,
    service: d.service,
    newSaleRate: snap.newSaleRate,
    recurringRate: snap.recurringRate,
    commission: { kind: p.kind, rate, amount: commissionFor(p.amount, rate), agentName: p.agentName, note: null },
  };
}
