"use server";

import { emailSoon } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCeo } from "@/lib/auth";
import { refundAdjustments } from "@/lib/commission";
import { currentMonth, isDate, isMonth, karachiDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok?: boolean; error?: string };
const clean = (m: string) => m.replace(/^.*?ERROR:\s*/i, "");
const METHODS = ["bank_transfer", "cash", "jazzcash", "easypaisa", "other"] as const;
const amountField = z
  .union([z.string(), z.number()])
  .transform((v) => Number(String(v).replace(/[,\s]/g, "")))
  .refine((n) => Number.isInteger(n) && n > 0, "Enter the amount in rupees");

// ---------- Payouts ----------

const payoutSchema = z.object({
  agentId: z.string().uuid("Choose the agent"),
  amount: amountField,
  paidOn: z.string().refine(isDate, "Choose the date"),
  method: z.enum(METHODS),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function recordPayout(raw: unknown): Promise<Result> {
  const me = await requireCeo();
  const p = payoutSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  if (p.data.paidOn > karachiDate()) return { error: "The payout date can't be in the future." };
  const supabase = await createClient();
  const { error } = await supabase.from("commission_payouts").insert({
    agent_id: p.data.agentId,
    amount_pkr: p.data.amount,
    paid_on: p.data.paidOn,
    method: p.data.method,
    reference: p.data.reference || null,
    note: p.data.note || null,
    recorded_by: me.id,
  });
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

// ---------- Month locking ----------

export async function lockMonth(month: string, agentId?: string): Promise<Result> {
  await requireCeo();
  if (!isMonth(month)) return { error: "Choose a month." };
  if (month > currentMonth()) return { error: "You can't lock a future month." };
  const supabase = await createClient();
  let q = supabase.from("commission_periods").update({ status: "locked" }).eq("month", month).eq("status", "open");
  if (agentId) q = q.eq("agent_id", agentId);
  const { error } = await q;
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

// ---------- Rates & targets ----------

type SlabIn = { min: number; max: number | null; rate: number };

function checkSlabs(slabs: SlabIn[], label: string): string | null {
  if (slabs.length === 0) return `${label}: add at least one slab.`;
  if (slabs[0].min !== 0) return `${label}: the first slab must start at Rs 0.`;
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    if (!(s.rate >= 0 && s.rate <= 100)) return `${label}: rates must be between 0 and 100.`;
    const last = i === slabs.length - 1;
    if (last && s.max !== null) return `${label}: leave the last slab's "up to" empty so it covers everything above.`;
    if (!last) {
      if (s.max === null || s.max < s.min) return `${label}: each slab needs an "up to" amount bigger than its start.`;
      if (slabs[i + 1].min !== s.max + 1) return `${label}: slabs must follow on without gaps (next starts at Rs ${s.max + 1}).`;
    }
  }
  return null;
}

export async function saveRates(input: { newSale: SlabIn[]; recurring: SlabIn[]; effectiveFrom: string }): Promise<Result> {
  const me = await requireCeo();
  if (!isDate(input.effectiveFrom)) return { error: "Choose the date the new rates start." };
  if (input.effectiveFrom < karachiDate()) return { error: "New rates can't start in the past." };
  const err = checkSlabs(input.newSale, "New sale") ?? checkSlabs(input.recurring, "Monthly");
  if (err) return { error: err };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("commission_tiers").select("id").eq("effective_from", input.effectiveFrom).limit(1);
  if ((existing ?? []).length) return { error: "A rate set already starts on this date. Pick another date." };
  const rows = [
    ...input.newSale.map((s) => ({ kind: "new_sale" as const, ...s })),
    ...input.recurring.map((s) => ({ kind: "recurring" as const, ...s })),
  ].map((s) => ({
    kind: s.kind,
    min_amount_pkr: s.min,
    max_amount_pkr: s.max,
    rate_percent: s.rate,
    effective_from: input.effectiveFrom,
    created_by: me.id,
  }));
  const { error } = await supabase.from("commission_tiers").insert(rows);
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

export async function setTarget(agentId: string, month: string, amount: number): Promise<Result> {
  await requireCeo();
  if (!isMonth(month)) return { error: "Choose a month." };
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Enter the target in rupees." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_targets")
    .upsert({ agent_id: agentId, month, target_amount_pkr: amount }, { onConflict: "agent_id,month" });
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

// ---------- Services & settings ----------

export async function addService(name: string): Promise<Result> {
  await requireCeo();
  const n = name.trim();
  if (n.length < 2) return { error: "Enter the service name." };
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({ name: n });
  if (error) return { error: /duplicate/i.test(error.message) ? "This service already exists." : clean(error.message) };
  revalidatePath("/ceo/services");
  return { ok: true };
}

export async function setServiceActive(id: string, active: boolean): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ is_active: active }).eq("id", id);
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo/services");
  return { ok: true };
}

export async function renameService(id: string, name: string): Promise<Result> {
  await requireCeo();
  const n = name.trim();
  if (n.length < 2) return { error: "Enter the service name." };
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ name: n }).eq("id", id);
  if (error) return { error: /duplicate/i.test(error.message) ? "This service already exists." : clean(error.message) };
  revalidatePath("/ceo/services");
  return { ok: true };
}

export async function setRecurringStops(on: boolean): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ value: on }).eq("key", "recurring_stops_when_agent_inactive");
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo/settings");
  return { ok: true };
}

// ---------- Deals ----------

export async function cancelDeal(id: string, reason: string): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({ status: "cancelled", rejection_reason: reason.trim() || null })
    .eq("id", id)
    .in("status", ["pending_approval", "approved"]);
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

export async function completeDeal(id: string): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ status: "completed" }).eq("id", id).eq("status", "approved");
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

export async function setEndMonth(id: string, month: string | null): Promise<Result> {
  await requireCeo();
  if (month !== null && !isMonth(month)) return { error: "Choose a month." };
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ end_month: month }).eq("id", id).eq("deal_type", "monthly");
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

// ---------- Reassignment ----------

export async function reassignClient(clientId: string, agentId: string): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { data: a } = await supabase.from("profiles").select("role, is_active").eq("id", agentId).maybeSingle();
  if (!a || a.role !== "agent" || !a.is_active) return { error: "Choose an active agent." };
  const { error } = await supabase.from("clients").update({ owner_agent_id: agentId }).eq("id", clientId);
  if (error) return { error: clean(error.message) };
  await supabase.from("leads").update({ owner_agent_id: agentId }).eq("client_id", clientId);
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

export async function reassignLead(leadId: string, agentId: string): Promise<Result> {
  await requireCeo();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ owner_agent_id: agentId }).eq("id", leadId);
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

// ---------- Refunds ----------

export async function recordRefund(paymentId: string, raw: { amount: string; paidOn: string; method: string; note: string }): Promise<Result> {
  await requireCeo();
  const amount = Number(String(raw.amount).replace(/[,\s]/g, ""));
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Enter the refund amount in rupees." };
  if (!isDate(raw.paidOn)) return { error: "Choose the refund date." };
  if (!(METHODS as readonly string[]).includes(raw.method)) return { error: "Choose how the money was returned." };
  const supabase = await createClient();
  const { data: orig } = await supabase.from("client_payments").select("id, amount_pkr, status, refund_of").eq("id", paymentId).maybeSingle();
  if (!orig || orig.status !== "verified" || orig.refund_of) return { error: "Only verified payments can be refunded." };
  const [{ data: entries }, { data: refunds }] = await Promise.all([
    supabase.from("commission_entries").select("id, deal_id, agent_id, kind, base_amount_pkr, rate_percent, amount_pkr, description").eq("payment_id", paymentId),
    supabase.from("client_payments").select("amount_pkr").eq("refund_of", paymentId),
  ]);
  const already = (refunds ?? []).reduce((s, r) => s - Number(r.amount_pkr), 0);
  if (already + amount > Number(orig.amount_pkr)) return { error: "That's more than is left to refund on this payment." };
  const agentIds = [...new Set((entries ?? []).map((e) => e.agent_id))];
  const { data: locked } = agentIds.length
    ? await supabase.from("commission_periods").select("agent_id, month").in("agent_id", agentIds).eq("status", "locked")
    : { data: [] as { agent_id: string; month: string }[] };
  const lockedSet = new Set((locked ?? []).map((l) => `${l.agent_id}|${l.month}`));
  const adjustments = refundAdjustments(
    { amount, paidOn: raw.paidOn, originalAmount: Number(orig.amount_pkr) },
    (entries ?? []).map((e) => ({ ...e, base_amount_pkr: Number(e.base_amount_pkr), rate_percent: Number(e.rate_percent), amount_pkr: Number(e.amount_pkr) })),
    { isLocked: (a, m) => lockedSet.has(`${a}|${m}`), currentMonth: currentMonth() },
  );
  const { error } = await supabase.rpc("record_refund", {
    p_original: paymentId,
    p_amount: amount,
    p_paid_on: raw.paidOn,
    p_method: raw.method as (typeof METHODS)[number],
    p_note: raw.note.trim() || "",
    p_entries: adjustments,
  });
  if (error) return { error: clean(error.message) };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}
