"use server";

import { emailSoon } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { requireCeo } from "@/lib/auth";
import { rateSnapshot } from "@/lib/commission";
import { computePaymentEntry } from "@/lib/commission/server";
import { getTiersLive } from "@/lib/data/live";
import { isPreview } from "@/lib/env";
import { karachiDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok?: boolean; preview?: boolean; error?: string };

const friendly = (msg: string) => msg.replace(/^.*?ERROR:\s*/i, "");

export async function approveDeal(dealId: string): Promise<Result> {
  const me = await requireCeo();
  if (isPreview) return { preview: true };
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deals")
    .select("id, status, deal_type, total_amount_pkr, monthly_fee_pkr")
    .eq("id", dealId)
    .maybeSingle();
  if (!d) return { error: "Deal not found." };
  if (d.status !== "pending_approval") return { error: "This deal isn't waiting for approval." };
  let snap;
  try {
    snap = rateSnapshot(
      { type: d.deal_type, totalAmount: d.total_amount_pkr === null ? null : Number(d.total_amount_pkr), monthlyFee: d.monthly_fee_pkr === null ? null : Number(d.monthly_fee_pkr) },
      await getTiersLive(),
      karachiDate(),
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await supabase
    .from("deals")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: me.id,
      new_sale_rate_percent: snap.newSaleRate,
      recurring_rate_percent: snap.recurringRate,
      new_sale_tier_id: snap.newSaleTierId,
      recurring_tier_id: snap.recurringTierId,
      rejection_reason: null,
    })
    .eq("id", dealId)
    .eq("status", "pending_approval");
  if (error) return { error: friendly(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

export async function rejectDeal(dealId: string, reason: string): Promise<Result> {
  await requireCeo();
  if (reason.trim().length < 3) return { error: "Write a short reason." };
  if (isPreview) return { preview: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({ status: "rejected", rejection_reason: reason.trim().slice(0, 500) })
    .eq("id", dealId)
    .eq("status", "pending_approval");
  if (error) return { error: friendly(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

export async function verifyPayment(paymentId: string): Promise<Result> {
  await requireCeo();
  if (isPreview) return { preview: true };
  const supabase = await createClient();
  try {
    const { payment, entry } = await computePaymentEntry(supabase, paymentId);
    if (payment.status !== "pending_verification") return { error: "This payment isn't waiting for verification." };
    const { error } = await supabase.rpc("verify_payment", { p_payment_id: paymentId, p_entries: entry ? [entry] : [] });
    if (error) return { error: friendly(error.message) };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}

export async function rejectPayment(paymentId: string, reason: string): Promise<Result> {
  await requireCeo();
  if (reason.trim().length < 3) return { error: "Write a short reason." };
  if (isPreview) return { preview: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_payments")
    .update({ status: "rejected", rejection_reason: reason.trim().slice(0, 500) })
    .eq("id", paymentId)
    .eq("status", "pending_verification");
  if (error) return { error: friendly(error.message) };
  revalidatePath("/ceo", "layout");
  emailSoon();
  return { ok: true };
}
