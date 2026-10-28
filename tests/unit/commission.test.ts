import { describe, expect, test } from "vitest";
import {
  balance,
  commissionFor,
  entryForPayment,
  expectedCommission,
  ownerOn,
  pickTier,
  rateSnapshot,
  refundAdjustments,
  slabLabel,
  tiersInEffect,
  type DealInput,
  type EntryContext,
  type Tier,
} from "@/lib/commission";
import { currentMonth, formatPKR, karachiDate } from "@/lib/format";

const T = (kind: Tier["kind"], min: number, max: number | null, rate: number, eff = "2026-01-01"): Tier => ({
  id: `${kind}-${min}-${eff}`,
  kind,
  min,
  max,
  rate,
  effectiveFrom: eff,
});

const DEFAULT: Tier[] = [
  T("new_sale", 0, 50000, 10),
  T("new_sale", 50001, 100000, 12),
  T("new_sale", 100001, 200000, 13.5),
  T("new_sale", 200001, 300000, 15),
  T("new_sale", 300001, null, 18),
  T("recurring", 0, 150000, 1.5),
  T("recurring", 150001, null, 2),
];

const ALI = "ali";
const SARA = "sara";
const CEO = "ceo";

function ctx(over: Partial<EntryContext> = {}): EntryContext {
  return {
    owners: [{ agentId: ALI, fromDate: "2026-01-01", toDate: null }],
    agents: { [ALI]: { active: true, isCeo: false }, [SARA]: { active: true, isCeo: false }, [CEO]: { active: true, isCeo: true } },
    recurringStopsWhenInactive: true,
    isLocked: () => false,
    currentMonth: "2026-11-01",
    ...over,
  };
}

function monthlyDeal(fee: number, over: Partial<DealInput> = {}): DealInput {
  const snap = rateSnapshot({ type: "monthly", monthlyFee: fee }, DEFAULT, "2026-09-01");
  return {
    id: "d1",
    type: "monthly",
    monthlyFee: fee,
    startMonth: "2026-09-01",
    originalAgentId: ALI,
    newSaleRate: snap.newSaleRate,
    recurringRate: snap.recurringRate,
    label: "Bilal Foods · SMM",
    ...over,
  };
}

function oneTimeDeal(total: number, over: Partial<DealInput> = {}): DealInput {
  const snap = rateSnapshot({ type: "one_time", totalAmount: total }, DEFAULT, "2026-09-01");
  return {
    id: "d2",
    type: "one_time",
    totalAmount: total,
    startMonth: null,
    originalAgentId: ALI,
    newSaleRate: snap.newSaleRate,
    recurringRate: null,
    label: "Shop · Website",
    ...over,
  };
}

describe("slab boundaries (inclusive, whole amount)", () => {
  const cases: [number, number][] = [
    [0, 10],
    [1, 10],
    [50000, 10],
    [50001, 12],
    [100000, 12],
    [100001, 13.5],
    [200000, 13.5],
    [200001, 15],
    [300000, 15],
    [300001, 18],
    [5_000_000, 18],
  ];
  test.each(cases)("new sale %i → %d%%", (amount, rate) => {
    expect(pickTier(tiersInEffect(DEFAULT, "new_sale", "2026-10-01"), amount)?.rate).toBe(rate);
  });
  test.each([
    [150000, 1.5],
    [150001, 2],
    [1, 1.5],
  ])("recurring fee %i → %d%%", (fee, rate) => {
    expect(pickTier(tiersInEffect(DEFAULT, "recurring", "2026-10-01"), fee)?.rate).toBe(rate);
  });
});

describe("commission maths uses integers", () => {
  test("13.5% of 150,000 is exactly 20,250", () => expect(commissionFor(150000, 13.5)).toBe(20250));
  test("1.5% of 80,000 is 1,200", () => expect(commissionFor(80000, 1.5)).toBe(1200));
  test("rounds to nearest rupee", () => expect(commissionFor(33333, 13.5)).toBe(4500));
  test("negative amounts round symmetrically", () => expect(commissionFor(-33333, 13.5)).toBe(-4500));
});

describe("rate snapshot", () => {
  test("one-time deal uses the total", () => {
    expect(rateSnapshot({ type: "one_time", totalAmount: 250000 }, DEFAULT, "2026-10-01")).toMatchObject({
      newSaleRate: 15,
      recurringRate: null,
    });
  });
  test("monthly deal uses the monthly fee for both rates", () => {
    expect(rateSnapshot({ type: "monthly", monthlyFee: 160000 }, DEFAULT, "2026-10-01")).toMatchObject({
      newSaleRate: 13.5,
      recurringRate: 2,
    });
  });
  test("later rate changes only affect deals approved after them", () => {
    const withChange = [...DEFAULT, T("new_sale", 0, 100000, 20, "2026-11-01"), T("new_sale", 100001, null, 25, "2026-11-01")];
    expect(rateSnapshot({ type: "one_time", totalAmount: 80000 }, withChange, "2026-10-31").newSaleRate).toBe(12);
    expect(rateSnapshot({ type: "one_time", totalAmount: 80000 }, withChange, "2026-11-01").newSaleRate).toBe(20);
    // A payment on the October deal still uses its locked 12%:
    const deal = oneTimeDeal(80000);
    expect(entryForPayment({ amount: 80000, paidOn: "2026-12-05", billingMonth: null }, deal, ctx())?.rate_percent).toBe(12);
  });
  test("missing rates for an amount is an error", () => {
    expect(() => rateSnapshot({ type: "one_time", totalAmount: 10 }, [T("new_sale", 100, null, 5)], "2026-10-01")).toThrow();
  });
  test("labels", () => {
    expect(slabLabel({ min: 100001, max: 200000 })).toBe("Rs 100,001 – Rs 200,000");
    expect(slabLabel({ min: 300001, max: null })).toBe("Above Rs 300,000");
  });
  test("expected commission for the approval screen", () => {
    expect(expectedCommission({ type: "monthly", monthlyFee: 80000 }, { newSaleRate: 12, recurringRate: 1.5 })).toEqual({
      total: null,
      firstMonth: 9600,
      laterMonths: 1200,
    });
    expect(expectedCommission({ type: "one_time", totalAmount: 400000 }, { newSaleRate: 18, recurringRate: null }).total).toBe(72000);
  });
});

describe("entries for payments", () => {
  test("one-time deal: every instalment at the deal's new-sale rate (not the instalment size)", () => {
    const deal = oneTimeDeal(200000); // 13.5%
    const e = entryForPayment({ amount: 50000, paidOn: "2026-10-03", billingMonth: null }, deal, ctx());
    expect(e).toMatchObject({ kind: "new_sale", rate_percent: 13.5, amount_pkr: 6750, month: "2026-10-01", agent_id: ALI });
  });

  test("monthly deal: first month is a new sale, later months recurring", () => {
    const deal = monthlyDeal(80000);
    const first = entryForPayment({ amount: 80000, paidOn: "2026-09-05", billingMonth: "2026-09-01" }, deal, ctx());
    const second = entryForPayment({ amount: 80000, paidOn: "2026-10-05", billingMonth: "2026-10-01" }, deal, ctx());
    expect(first).toMatchObject({ kind: "new_sale", rate_percent: 12, amount_pkr: 9600 });
    expect(second).toMatchObject({ kind: "recurring", rate_percent: 1.5, amount_pkr: 1200 });
  });

  test("late first-month payment still counts as the new sale (billing month decides)", () => {
    const e = entryForPayment({ amount: 80000, paidOn: "2026-10-02", billingMonth: "2026-09-01" }, monthlyDeal(80000), ctx());
    expect(e).toMatchObject({ kind: "new_sale", month: "2026-10-01" });
  });

  test("recurring threshold is per deal fee", () => {
    const big = monthlyDeal(150001);
    expect(entryForPayment({ amount: 150001, paidOn: "2026-10-05", billingMonth: "2026-10-01" }, big, ctx())?.rate_percent).toBe(2);
    const edge = monthlyDeal(150000);
    expect(entryForPayment({ amount: 150000, paidOn: "2026-10-05", billingMonth: "2026-10-01" }, edge, ctx())?.rate_percent).toBe(1.5);
  });

  test("reassignment: recurring goes to the owner on the payment date; new sale stays with original agent", () => {
    const owners = [
      { agentId: ALI, fromDate: "2026-09-01", toDate: "2026-10-14" },
      { agentId: SARA, fromDate: "2026-10-15", toDate: null },
    ];
    const deal = monthlyDeal(80000);
    const before = entryForPayment({ amount: 80000, paidOn: "2026-10-14", billingMonth: "2026-10-01" }, deal, ctx({ owners }));
    const after = entryForPayment({ amount: 80000, paidOn: "2026-10-15", billingMonth: "2026-10-01" }, deal, ctx({ owners }));
    const lateFirst = entryForPayment({ amount: 80000, paidOn: "2026-10-20", billingMonth: "2026-09-01" }, deal, ctx({ owners }));
    expect(before?.agent_id).toBe(ALI);
    expect(after?.agent_id).toBe(SARA);
    expect(lateFirst?.agent_id).toBe(ALI);
  });

  test("deactivated agent: recurring stops (setting on), new sale still paid", () => {
    const agents = { [ALI]: { active: false, isCeo: false } };
    const deal = monthlyDeal(80000);
    const rec = entryForPayment({ amount: 80000, paidOn: "2026-10-05", billingMonth: "2026-10-01" }, deal, ctx({ agents }));
    expect(rec).toMatchObject({ rate_percent: 0, amount_pkr: 0 });
    expect(rec?.note).toMatch(/inactive/);
    const ns = entryForPayment({ amount: 80000, paidOn: "2026-09-05", billingMonth: "2026-09-01" }, deal, ctx({ agents }));
    expect(ns?.amount_pkr).toBe(9600);
    const off = entryForPayment(
      { amount: 80000, paidOn: "2026-10-05", billingMonth: "2026-10-01" },
      deal,
      ctx({ agents, recurringStopsWhenInactive: false }),
    );
    expect(off?.amount_pkr).toBe(1200);
  });

  test("CEO's own sales earn no commission", () => {
    const deal = oneTimeDeal(80000, { originalAgentId: CEO });
    expect(entryForPayment({ amount: 80000, paidOn: "2026-10-05", billingMonth: null }, deal, ctx())).toBeNull();
  });

  test("payment in a locked month lands in the first open month", () => {
    const isLocked = (_a: string, m: string) => m <= "2026-10-01";
    const e = entryForPayment({ amount: 80000, paidOn: "2026-09-30", billingMonth: null }, oneTimeDeal(80000), ctx({ isLocked }));
    expect(e?.month).toBe("2026-11-01");
    expect(e?.note).toMatch(/locked/);
  });

  test("unapproved deal is refused", () => {
    expect(() =>
      entryForPayment({ amount: 1, paidOn: "2026-10-05", billingMonth: null }, oneTimeDeal(80000, { newSaleRate: null }), ctx()),
    ).toThrow(/approved/);
  });
});

describe("refunds", () => {
  const original = {
    id: "e1",
    deal_id: "d2",
    agent_id: ALI,
    kind: "new_sale" as const,
    base_amount_pkr: 80000,
    rate_percent: 12,
    amount_pkr: 9600,
    description: "Shop · Website",
  };
  test("partial refund reverses commission in proportion", () => {
    const [adj] = refundAdjustments({ amount: 20000, paidOn: "2026-10-20", originalAmount: 80000 }, [original], ctx());
    expect(adj).toMatchObject({ kind: "adjustment", amount_pkr: -2400, base_amount_pkr: -20000, month: "2026-10-01", adjusts_entry_id: "e1" });
  });
  test("refund into a locked month goes to the current open month", () => {
    const isLocked = (_a: string, m: string) => m === "2026-10-01";
    const [adj] = refundAdjustments({ amount: 80000, paidOn: "2026-10-20", originalAmount: 80000 }, [original], ctx({ isLocked }));
    expect(adj).toMatchObject({ month: "2026-11-01", amount_pkr: -9600 });
  });
  test("refund larger than the payment is refused", () => {
    expect(() => refundAdjustments({ amount: 90000, paidOn: "2026-10-20", originalAmount: 80000 }, [original], ctx())).toThrow();
  });
});

describe("balances, owners and months", () => {
  test("empty month and no payouts", () => {
    expect(balance([], [])).toEqual({ earnedLocked: 0, earnedEstimated: 0, earned: 0, paid: 0, pending: 0 });
  });
  test("earned, paid and pending", () => {
    expect(
      balance(
        [
          { commission: 9600, locked: true },
          { commission: 1200, locked: false },
        ],
        [5000],
      ),
    ).toEqual({ earnedLocked: 9600, earnedEstimated: 1200, earned: 10800, paid: 5000, pending: 5800 });
  });
  test("owner before the first history row falls back to the earliest owner", () => {
    expect(ownerOn([{ agentId: ALI, fromDate: "2026-10-10", toDate: null }], "2026-10-01")).toBe(ALI);
  });
  test("month crossing at midnight Karachi time", () => {
    expect(karachiDate(new Date("2026-10-31T18:59:59Z"))).toBe("2026-10-31");
    expect(karachiDate(new Date("2026-10-31T19:00:00Z"))).toBe("2026-11-01");
    expect(currentMonth(new Date("2026-10-31T19:00:00Z"))).toBe("2026-11-01");
  });
  test("money format", () => {
    expect(formatPKR(125000)).toBe("Rs 125,000");
    expect(formatPKR(-2400)).toBe("−Rs 2,400");
  });
});
