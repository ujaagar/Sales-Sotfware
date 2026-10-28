// All commission logic lives here (see CLAUDE.md). Pure functions, no database access.
// Money is whole rupees (integers). Months are "YYYY-MM-01" strings, dates "YYYY-MM-DD" (Karachi).
import { formatMonth, formatPKR, monthOf, addMonths } from "../format";

export type TierKind = "new_sale" | "recurring";
export type DealType = "one_time" | "monthly";
export type EntryKind = "new_sale" | "recurring" | "adjustment";

export type Tier = {
  id: string;
  kind: TierKind;
  min: number;
  max: number | null;
  rate: number;
  effectiveFrom: string;
};

export type DealTerms = {
  type: DealType;
  totalAmount?: number | null;
  monthlyFee?: number | null;
};

export type RateSnapshot = {
  newSaleRate: number;
  newSaleTierId: string;
  recurringRate: number | null;
  recurringTierId: string | null;
};

export type OwnerPeriod = { agentId: string; fromDate: string; toDate: string | null };

export type CommissionEntry = {
  deal_id: string;
  agent_id: string;
  month: string;
  kind: EntryKind;
  base_amount_pkr: number;
  rate_percent: number;
  amount_pkr: number;
  description: string;
  note: string | null;
  adjusts_entry_id: string | null;
};

/** Commission for an amount at a percentage, rounded to the nearest rupee. Integer maths only. */
export function commissionFor(amount: number, ratePercent: number): number {
  const basisPoints = Math.round(ratePercent * 100); // 13.5% -> 1350
  const raw = amount * basisPoints; // stays an exact integer for realistic amounts
  const sign = raw < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(raw) / 10000);
}

/** The rate set in force for a kind on a date: the rows with the latest effective_from not after that date. */
export function tiersInEffect(all: Tier[], kind: TierKind, onDate: string): Tier[] {
  const candidates = all.filter((t) => t.kind === kind && t.effectiveFrom <= onDate);
  if (candidates.length === 0) return [];
  const latest = candidates.reduce((m, t) => (t.effectiveFrom > m ? t.effectiveFrom : m), "");
  return candidates.filter((t) => t.effectiveFrom === latest).sort((a, b) => a.min - b.min);
}

/** The tier whose range holds the amount (boundaries inclusive). */
export function pickTier(tiers: Tier[], amount: number): Tier | null {
  return tiers.find((t) => amount >= t.min && (t.max === null || amount <= t.max)) ?? null;
}

/** The amount that decides the slab: deal total for one-time, monthly fee for monthly. */
export function slabBase(deal: DealTerms): number {
  const v = deal.type === "one_time" ? deal.totalAmount : deal.monthlyFee;
  if (!v || v <= 0) throw new Error("Deal amount is missing.");
  return v;
}

/** Rates to lock onto a deal when the CEO approves it. */
export function rateSnapshot(deal: DealTerms, allTiers: Tier[], approvalDate: string): RateSnapshot {
  const base = slabBase(deal);
  const ns = pickTier(tiersInEffect(allTiers, "new_sale", approvalDate), base);
  if (!ns) throw new Error("No new-sale rate covers this amount. Check the commission rates.");
  if (deal.type === "one_time") {
    return { newSaleRate: ns.rate, newSaleTierId: ns.id, recurringRate: null, recurringTierId: null };
  }
  const rec = pickTier(tiersInEffect(allTiers, "recurring", approvalDate), base);
  if (!rec) throw new Error("No monthly (recurring) rate covers this fee. Check the commission rates.");
  return { newSaleRate: ns.rate, newSaleTierId: ns.id, recurringRate: rec.rate, recurringTierId: rec.id };
}

/** "Rs 100,001 – Rs 200,000" or "Above Rs 300,000" */
export function slabLabel(t: Pick<Tier, "min" | "max">): string {
  if (t.max === null) return t.min <= 1 ? "Any amount" : `Above ${formatPKR(t.min - 1)}`;
  return `${formatPKR(t.min)} – ${formatPKR(t.max)}`;
}

/** What the agent can expect, shown on the CEO's approval screen. */
export function expectedCommission(deal: DealTerms, snap: Pick<RateSnapshot, "newSaleRate" | "recurringRate">) {
  const base = slabBase(deal);
  if (deal.type === "one_time") {
    return { total: commissionFor(base, snap.newSaleRate), firstMonth: null, laterMonths: null };
  }
  return {
    total: null,
    firstMonth: commissionFor(base, snap.newSaleRate),
    laterMonths: snap.recurringRate === null ? null : commissionFor(base, snap.recurringRate),
  };
}

/** Who owned the client on a date. Before the first record, the earliest owner. */
export function ownerOn(history: OwnerPeriod[], date: string): string | null {
  const sorted = [...history].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  const hit = sorted.filter((h) => h.fromDate <= date && (h.toDate === null || h.toDate >= date)).at(-1);
  return hit?.agentId ?? sorted[0]?.agentId ?? null;
}

/** First month from `month` onwards that is not locked for the agent. */
export function firstOpenMonth(agentId: string, month: string, isLocked: (agentId: string, month: string) => boolean): string {
  let m = month;
  for (let i = 0; i < 120 && isLocked(agentId, m); i++) m = addMonths(m, 1);
  return m;
}

export type PaymentInput = {
  amount: number;
  paidOn: string;
  billingMonth: string | null;
};

export type DealInput = DealTerms & {
  id: string;
  startMonth: string | null;
  originalAgentId: string;
  newSaleRate: number | null;
  recurringRate: number | null;
  label: string; // e.g. "Bilal Foods · Meta Ads"
};

export type AgentInfo = { active: boolean; isCeo: boolean };

export type EntryContext = {
  owners: OwnerPeriod[];
  agents: Record<string, AgentInfo>;
  recurringStopsWhenInactive: boolean;
  isLocked: (agentId: string, month: string) => boolean;
  /** Current Karachi month, used when the payment's month is already locked. */
  currentMonth: string;
};

/** The commission entry for one verified payment, or null when none is due (e.g. the CEO's own sale). */
export function entryForPayment(payment: PaymentInput, deal: DealInput, ctx: EntryContext): CommissionEntry | null {
  if (deal.newSaleRate === null) throw new Error("This deal has no locked rates. It must be approved first.");
  if (payment.amount <= 0) throw new Error("Use refundAdjustments for refunds.");

  const isRecurring =
    deal.type === "monthly" &&
    deal.startMonth !== null &&
    (payment.billingMonth ?? monthOf(payment.paidOn)) > deal.startMonth;

  const agentId = isRecurring ? ownerOn(ctx.owners, payment.paidOn) ?? deal.originalAgentId : deal.originalAgentId;
  const agent = ctx.agents[agentId];
  if (!agent || agent.isCeo) return null;

  let rate = isRecurring ? deal.recurringRate : deal.newSaleRate;
  if (rate === null) throw new Error("This monthly deal has no recurring rate.");
  const notes: string[] = [];
  if (isRecurring && !agent.active && ctx.recurringStopsWhenInactive) {
    rate = 0;
    notes.push("Agent inactive: no monthly commission.");
  }

  const paidMonth = monthOf(payment.paidOn);
  let month = paidMonth;
  if (ctx.isLocked(agentId, paidMonth)) {
    month = firstOpenMonth(agentId, paidMonth < ctx.currentMonth ? ctx.currentMonth : paidMonth, ctx.isLocked);
    notes.push(`Paid in ${formatMonth(paidMonth, true)} (already locked), counted in ${formatMonth(month, true)}.`);
  }

  const billed = deal.type === "monthly" ? ` (${formatMonth(payment.billingMonth ?? paidMonth, true)})` : "";
  return {
    deal_id: deal.id,
    agent_id: agentId,
    month,
    kind: isRecurring ? "recurring" : "new_sale",
    base_amount_pkr: payment.amount,
    rate_percent: rate,
    amount_pkr: commissionFor(payment.amount, rate),
    description: `${deal.label}${billed}`,
    note: notes.length ? notes.join(" ") : null,
    adjusts_entry_id: null,
  };
}

export type ExistingEntry = {
  id: string;
  deal_id: string;
  agent_id: string;
  kind: EntryKind;
  base_amount_pkr: number;
  rate_percent: number;
  amount_pkr: number;
  description: string;
};

/**
 * Negative adjustments for a refund of part or all of a payment. Each original entry is reversed in
 * proportion. Goes into the refund's month, or the first open month if that one is locked.
 */
export function refundAdjustments(
  refund: { amount: number; paidOn: string; originalAmount: number },
  originalEntries: ExistingEntry[],
  ctx: Pick<EntryContext, "isLocked" | "currentMonth">,
): CommissionEntry[] {
  if (refund.amount <= 0) throw new Error("Refund amount must be more than zero.");
  if (refund.amount > refund.originalAmount) throw new Error("Refund is bigger than the payment.");
  const refundMonth = monthOf(refund.paidOn);
  return originalEntries
    .filter((e) => e.kind !== "adjustment")
    .map((e) => {
      const share = Math.round((e.amount_pkr * refund.amount) / refund.originalAmount);
      let month = refundMonth;
      let note = `Refund of ${formatPKR(refund.amount)}.`;
      if (ctx.isLocked(e.agent_id, refundMonth)) {
        month = firstOpenMonth(e.agent_id, refundMonth < ctx.currentMonth ? ctx.currentMonth : refundMonth, ctx.isLocked);
        note += ` ${formatMonth(refundMonth, true)} is locked, adjusted in ${formatMonth(month, true)}.`;
      }
      return {
        deal_id: e.deal_id,
        agent_id: e.agent_id,
        month,
        kind: "adjustment" as const,
        base_amount_pkr: -refund.amount,
        rate_percent: e.rate_percent,
        amount_pkr: -share,
        description: `Refund · ${e.description}`,
        note,
        adjusts_entry_id: e.id,
      };
    });
}

/** Earned / Paid / Pending for an agent. */
export function balance(periods: { commission: number; locked: boolean }[], payouts: number[]) {
  const locked = periods.filter((p) => p.locked).reduce((s, p) => s + p.commission, 0);
  const estimated = periods.filter((p) => !p.locked).reduce((s, p) => s + p.commission, 0);
  const paid = payouts.reduce((s, p) => s + p, 0);
  return { earnedLocked: locked, earnedEstimated: estimated, earned: locked + estimated, paid, pending: locked + estimated - paid };
}
