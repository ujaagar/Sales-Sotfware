import "server-only";
import { balance } from "@/lib/commission";
import { createClient } from "@/lib/supabase/server";

// An agent's commission ledger: months (Estimated/Final), entries and payouts.
// The CEO can read any agent's ledger; an agent only their own (RLS).

export type LedgerEntry = {
  id: string;
  month: string;
  kind: "new_sale" | "recurring" | "adjustment";
  description: string;
  base: number;
  rate: number;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type LedgerMonth = {
  month: string;
  status: "open" | "locked";
  lockedAt: string | null;
  collected: number;
  commission: number;
  entries: LedgerEntry[];
};

export type Payout = { id: string; amount: number; paidOn: string; method: string; reference: string | null; note: string | null };

export type Ledger = {
  agent: { id: string; name: string; email: string; cnic: string | null };
  months: LedgerMonth[];
  payouts: Payout[];
  balance: ReturnType<typeof balance>;
};

export async function getLedger(agentId: string): Promise<Ledger | null> {
  const supabase = await createClient();
  const [{ data: agent }, { data: periods }, { data: entries }, { data: payouts }, { data: acc }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("id", agentId).maybeSingle(),
    supabase.from("commission_periods").select("month, status, locked_at, collected_amount_pkr, commission_amount_pkr").eq("agent_id", agentId).order("month", { ascending: false }),
    supabase
      .from("commission_entries")
      .select("id, month, kind, description, base_amount_pkr, rate_percent, amount_pkr, note, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true }),
    supabase.from("commission_payouts").select("id, amount_pkr, paid_on, method, reference, note").eq("agent_id", agentId).order("paid_on", { ascending: false }),
    supabase.from("policy_acceptances").select("cnic").eq("agent_id", agentId).order("accepted_at", { ascending: false }).limit(1),
  ]);
  if (!agent) return null;
  const byMonth = new Map<string, LedgerEntry[]>();
  for (const e of entries ?? []) {
    const list = byMonth.get(e.month) ?? [];
    list.push({
      id: e.id,
      month: e.month,
      kind: e.kind,
      description: e.description,
      base: Number(e.base_amount_pkr),
      rate: Number(e.rate_percent),
      amount: Number(e.amount_pkr),
      note: e.note,
      createdAt: e.created_at,
    });
    byMonth.set(e.month, list);
  }
  const months: LedgerMonth[] = (periods ?? []).map((p) => ({
    month: p.month,
    status: p.status,
    lockedAt: p.locked_at,
    collected: Number(p.collected_amount_pkr),
    commission: Number(p.commission_amount_pkr),
    entries: byMonth.get(p.month) ?? [],
  }));
  const pays: Payout[] = (payouts ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount_pkr),
    paidOn: p.paid_on,
    method: p.method,
    reference: p.reference,
    note: p.note,
  }));
  return {
    agent: { id: agent.id, name: agent.full_name, email: agent.email, cnic: acc?.[0]?.cnic ?? null },
    months,
    payouts: pays,
    balance: balance(
      months.map((m) => ({ commission: m.commission, locked: m.status === "locked" })),
      pays.map((p) => p.amount),
    ),
  };
}

export const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  other: "Other",
};

export const KIND_LABEL: Record<LedgerEntry["kind"], string> = {
  new_sale: "New sale",
  recurring: "Monthly",
  adjustment: "Adjustment",
};
