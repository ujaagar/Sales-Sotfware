"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { findDuplicate, provisionAgent } from "@/lib/agents";
import { requireCeo } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

function inviteEmail(email: string, name: string, url: string) {
  return sendEmail(
    email,
    "Welcome to Ujaagar Digital: set your password",
    `Assalam o Alaikum ${name.split(" ")[0]}, your application to sell for Ujaagar Digital is approved. Set your password with the button below (the link works for 7 days), then log in with this email. You'll be asked to read and accept the Sales Agent Policy first.`,
    { label: "Set my password", href: url },
  );
}
import { createInvite } from "@/lib/invites";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { applySchema } from "@/lib/validation";

export type InviteResult = { ok?: boolean; error?: string; inviteUrl?: string; name?: string; phone?: string; expiresAt?: string };

export async function approveApplication(applicationId: string): Promise<InviteResult> {
  const me = await requireCeo();
  const supabase = await createClient();
  const { data: app } = await supabase.from("agent_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!app) return { error: "Application not found." };
  if (app.status !== "pending") return { error: "This application has already been handled." };
  const dup = await findDuplicate(app.email, app.phone, app.id);
  if (dup) return { error: dup };
  try {
    const res = await provisionAgent(
      { full_name: app.full_name, email: app.email, phone: app.phone, whatsapp: app.whatsapp, city: app.city },
      me.id,
      supabase,
    );
    const { error } = await supabase
      .from("agent_applications")
      .update({ status: "approved", profile_id: res.profileId, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) return { error: error.message };
    revalidatePath("/ceo", "layout");
    after(() => inviteEmail(app.email, app.full_name, res.inviteUrl));
    return { ok: true, inviteUrl: res.inviteUrl, expiresAt: res.expiresAt, name: app.full_name, phone: app.whatsapp || app.phone };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function rejectApplication(applicationId: string, reason: string): Promise<InviteResult> {
  const me = await requireCeo();
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("agent_applications")
    .update({ status: "rejected", rejection_reason: reason.trim() || null, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("email, full_name")
    .maybeSingle();
  if (error) return { error: error.message };
  revalidatePath("/ceo", "layout");
  if (app) {
    after(() =>
      sendEmail(
        app.email,
        "Your Ujaagar Digital application",
        `Dear ${app.full_name}, thank you for applying to sell for Ujaagar Digital. We can't take your application forward at the moment.${reason.trim() ? ` Note from the CEO: ${reason.trim()}` : ""}`,
      ),
    );
  }
  return { ok: true };
}

/** CEO adds an agent directly: an already-approved application + the same account/invite flow. */
export async function addAgentDirect(raw: unknown): Promise<InviteResult> {
  const me = await requireCeo();
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  const dup = await findDuplicate(v.email, v.phone);
  if (dup) return { error: dup };
  const supabase = await createClient();
  try {
    const res = await provisionAgent({ full_name: v.fullName, email: v.email, phone: v.phone, whatsapp: v.whatsapp, city: v.city }, me.id, supabase);
    await supabase.from("agent_applications").insert({
      full_name: v.fullName,
      email: v.email,
      phone: v.phone,
      whatsapp: v.whatsapp || null,
      city: v.city,
      cnic: v.cnic || null,
      note: v.note || null,
      status: "approved",
      source: "ceo",
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      profile_id: res.profileId,
    });
    revalidatePath("/ceo", "layout");
    after(() => inviteEmail(v.email, v.fullName, res.inviteUrl));
    return { ok: true, inviteUrl: res.inviteUrl, expiresAt: res.expiresAt, name: v.fullName, phone: v.whatsapp || v.phone };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** New invite link (older unused links stop working). */
export async function resendInvite(profileId: string): Promise<InviteResult> {
  const me = await requireCeo();
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("id, full_name, email, phone, whatsapp, role, is_active").eq("id", profileId).maybeSingle();
  if (!p || p.role !== "agent") return { error: "Agent not found." };
  if (!p.is_active) return { error: "Activate this agent first." };
  try {
    const inv = await createInvite(p.id, me.id);
    revalidatePath("/ceo/agents");
    after(() => inviteEmail(p.email, p.full_name, inv.url));
    return { ok: true, inviteUrl: inv.url, expiresAt: inv.expiresAt, name: p.full_name, phone: p.whatsapp || p.phone || undefined };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Deactivate stops login immediately (account banned) and, by default, monthly commission. */
export async function setAgentActive(profileId: string, active: boolean): Promise<InviteResult> {
  await requireCeo();
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (!p || p.role !== "agent") return { error: "Agent not found." };
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", profileId);
  if (error) return { error: error.message };
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/ceo", "layout");
  return { ok: true };
}
