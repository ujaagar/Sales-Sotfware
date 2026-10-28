import "server-only";
import { createClient } from "@/lib/supabase/server";

// CEO-only summaries (the CEO can read every row under RLS).

export type AgentBalance = { id: string; name: string; email: string; active: boolean; earnedLocked: number; earnedOpen: number; paid: number; pending: number };

export async function getAgentBalances(): Promise<AgentBalance[]> {
  const supabase = await createClient();
  const [{ data: agents }, { data: periods }, { data: payouts }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_active").eq("role", "agent").order("full_name"),
    supabase.from("commission_periods").select("agent_id, status, commission_amount_pkr"),
    supabase.from("commission_payouts").select("agent_id, amount_pkr"),
  ]);
  return (agents ?? []).map((a) => {
    const ps = (periods ?? []).filter((p) => p.agent_id === a.id);
    const earnedLocked = ps.filter((p) => p.status === "locked").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
    const earnedOpen = ps.filter((p) => p.status === "open").reduce((s, p) => s + Number(p.commission_amount_pkr), 0);
    const paid = (payouts ?? []).filter((p) => p.agent_id === a.id).reduce((s, p) => s + Number(p.amount_pkr), 0);
    return { id: a.id, name: a.full_name, email: a.email, active: a.is_active, earnedLocked, earnedOpen, paid, pending: earnedLocked + earnedOpen - paid };
  });
}

export type RecentPayout = { id: string; agentName: string; amount: number; paidOn: string; method: string; reference: string | null; note: string | null };

export async function getRecentPayouts(limit = 30): Promise<RecentPayout[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commission_payouts")
    .select("id, amount_pkr, paid_on, method, reference, note, agent:profiles!commission_payouts_agent_id_fkey(full_name)")
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((p) => ({
    id: p.id,
    agentName: (p.agent as unknown as { full_name: string } | null)?.full_name ?? "—",
    amount: Number(p.amount_pkr),
    paidOn: p.paid_on,
    method: p.method,
    reference: p.reference,
    note: p.note,
  }));
}

export type PeriodRow = { agentId: string; agentName: string; month: string; status: "open" | "locked"; collected: number; commission: number; lockedAt: string | null };

export async function getPeriods(): Promise<PeriodRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commission_periods")
    .select("agent_id, month, status, collected_amount_pkr, commission_amount_pkr, locked_at, agent:profiles!commission_periods_agent_id_fkey(full_name)")
    .order("month", { ascending: false });
  return (data ?? []).map((p) => ({
    agentId: p.agent_id,
    agentName: (p.agent as unknown as { full_name: string } | null)?.full_name ?? "—",
    month: p.month,
    status: p.status,
    collected: Number(p.collected_amount_pkr),
    commission: Number(p.commission_amount_pkr),
    lockedAt: p.locked_at,
  }));
}

export async function getActiveAgents(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "agent").eq("is_active", true).order("full_name");
  return (data ?? []).map((a) => ({ id: a.id, name: a.full_name }));
}
