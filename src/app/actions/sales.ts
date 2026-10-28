"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSeller } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clientSchema, dealSchema, LEAD_STATUSES, leadSchema } from "@/lib/validation";

export type Result = { error?: string; ok?: boolean };

const DUP_OTHER = "This contact is already registered. Contact the CEO.";
const clean = (msg: string) => msg.replace(/^.*?ERROR:\s*/i, "");

/** "2026-10-27T15:30" (Karachi wall time from a datetime-local input) → ISO timestamp. */
function karachiToIso(local?: string | null): string | null {
  if (!local) return null;
  const m = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}T${m[2]}:00+05:00`).toISOString();
}

async function checkPhone(phone: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_contact", { p_phone: phone });
  return data === "other" ? DUP_OTHER : null;
}

// ---------- Leads ----------

export async function createLead(raw: unknown): Promise<Result> {
  const me = await requireSeller();
  const p = leadSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const dup = await checkPhone(p.data.phone);
  if (dup) return { error: dup };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      owner_agent_id: me.id,
      client_name: p.data.clientName,
      business_name: p.data.businessName ?? null,
      phone: p.data.phone,
      whatsapp: p.data.whatsapp || null,
      city: p.data.city ?? null,
      source: p.data.source ?? null,
      interested_services: p.data.services,
      next_follow_up_at: karachiToIso(p.data.nextFollowUpAt),
      notes: p.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/leads`);
  redirect(`${me.base}/leads/${data.id}`);
}

export async function updateLead(id: string, raw: unknown): Promise<Result> {
  const me = await requireSeller();
  const p = leadSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      client_name: p.data.clientName,
      business_name: p.data.businessName ?? null,
      phone: p.data.phone,
      whatsapp: p.data.whatsapp || null,
      city: p.data.city ?? null,
      source: p.data.source ?? null,
      interested_services: p.data.services,
      next_follow_up_at: karachiToIso(p.data.nextFollowUpAt),
      follow_up_notified_at: null,
      notes: p.data.notes ?? null,
    })
    .eq("id", id);
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/leads`, "layout");
  return { ok: true };
}

export async function setLeadStatus(id: string, status: string): Promise<Result> {
  const me = await requireSeller();
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number]) || status === "converted") return { error: "Choose a stage." };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status: status as (typeof LEAD_STATUSES)[number] }).eq("id", id);
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/leads`, "layout");
  return { ok: true };
}

/** Turns a lead into a client (same owner) and opens the new-deal form for it. */
export async function convertLead(id: string): Promise<Result> {
  const me = await requireSeller();
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return { error: "Lead not found." };
  if (lead.client_id) redirect(`${me.base}/deals/new?client=${lead.client_id}`);
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      owner_agent_id: lead.owner_agent_id,
      name: lead.client_name,
      business_name: lead.business_name,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      city: lead.city,
      lead_id: lead.id,
    })
    .select("id")
    .single();
  if (error) return { error: clean(error.message) };
  await supabase.from("leads").update({ status: "converted", client_id: client.id }).eq("id", lead.id);
  revalidatePath(`${me.base}/leads`, "layout");
  redirect(`${me.base}/deals/new?client=${client.id}`);
}

export async function addNote(target: { leadId?: string; dealId?: string }, body: string): Promise<Result> {
  const me = await requireSeller();
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > 2000) return { error: "Keep notes under 2000 characters." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("deal_notes")
    .insert({ author_id: me.id, body: text, lead_id: target.leadId ?? null, deal_id: target.dealId ?? null });
  if (error) return { error: clean(error.message) };
  revalidatePath(target.leadId ? `${me.base}/leads/${target.leadId}` : `${me.base}/deals/${target.dealId}`);
  return { ok: true };
}

// ---------- Clients ----------

export async function createClientRecord(raw: unknown): Promise<Result> {
  const me = await requireSeller();
  const p = clientSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const dup = await checkPhone(p.data.phone);
  if (dup) return { error: dup };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_agent_id: me.id,
      name: p.data.name,
      business_name: p.data.businessName ?? null,
      phone: p.data.phone,
      whatsapp: p.data.whatsapp || null,
      email: p.data.email || null,
      city: p.data.city ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/clients`);
  redirect(`${me.base}/clients/${data.id}`);
}

// ---------- Deals ----------

function dealRow(d: ReturnType<typeof dealSchema.parse>) {
  return {
    service_id: d.serviceId,
    deal_type: d.dealType,
    total_amount_pkr: d.dealType === "one_time" ? d.amount : null,
    monthly_fee_pkr: d.dealType === "monthly" ? d.amount : null,
    start_month: d.dealType === "monthly" ? d.startMonth! : null,
    description: d.description ?? null,
    next_follow_up_at: karachiToIso(d.nextFollowUpAt),
  };
}

export async function createDeal(raw: unknown): Promise<Result> {
  const me = await requireSeller();
  const p = dealSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({ client_id: p.data.clientId, agent_id: me.id, original_agent_id: me.id, ...dealRow(p.data) })
    .select("id")
    .single();
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/deals`);
  redirect(`${me.base}/deals/${data.id}`);
}

/** Edit a deal that is still waiting, or fix and resubmit a rejected one. */
export async function resubmitDeal(id: string, raw: unknown): Promise<Result> {
  const me = await requireSeller();
  const p = dealSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { data: d } = await supabase.from("deals").select("status, client_id").eq("id", id).maybeSingle();
  if (!d) return { error: "Deal not found." };
  if (d.status !== "pending_approval" && d.status !== "rejected") return { error: "Approved deals can't be edited. Ask the CEO." };
  const { error } = await supabase
    .from("deals")
    .update({ ...dealRow(p.data), status: "pending_approval", rejection_reason: null })
    .eq("id", id);
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/deals`, "layout");
  return { ok: true };
}

export async function setDealFollowUp(id: string, local: string): Promise<Result> {
  const me = await requireSeller();
  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({ next_follow_up_at: karachiToIso(local), follow_up_notified_at: null })
    .eq("id", id);
  if (error) return { error: clean(error.message) };
  revalidatePath(`${me.base}/deals/${id}`);
  return { ok: true };
}
