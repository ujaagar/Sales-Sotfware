import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import { createInvite } from "@/lib/invites";

export type AgentDetails = { full_name: string; email: string; phone: string; whatsapp?: string | null; city?: string | null };

/** 0300-1234567, +92 300 1234567, 923001234567 → 3001234567 (same rule as the database). */
export function normalizePhone(p: string | null | undefined): string {
  return (p ?? "").replace(/\D/g, "").replace(/^92/, "").replace(/^0/, "");
}

/** Is this email or phone already used by an agent/CEO or an open application? */
export async function findDuplicate(email: string, phone: string, ignoreApplicationId?: string): Promise<string | null> {
  const admin = createAdminClient();
  const e = email.trim().toLowerCase();
  const n = normalizePhone(phone);
  const [{ data: byEmail }, { data: profiles }, { data: apps }] = await Promise.all([
    admin.from("profiles").select("id").ilike("email", e).limit(1),
    admin.from("profiles").select("phone"),
    admin.from("agent_applications").select("id, email, phone_normalized").neq("status", "rejected"),
  ]);
  if ((byEmail ?? []).length) return "This email already has an account.";
  if (n && (profiles ?? []).some((p) => normalizePhone(p.phone) === n)) return "This phone number already has an account.";
  const open = (apps ?? []).filter((a) => a.id !== ignoreApplicationId);
  if (open.some((a) => a.email.toLowerCase() === e)) return "An application with this email is already waiting.";
  if (n && open.some((a) => a.phone_normalized === n)) return "An application with this phone number is already waiting.";
  return null;
}

/**
 * Creates the agent's login (no password yet) and profile, then a 7-day invite link.
 * `ceoClient` is the CEO's own session so the activity log records who did it.
 */
export async function provisionAgent(
  details: AgentDetails,
  ceoId: string,
  ceoClient: SupabaseClient<Database>,
): Promise<{ profileId: string; inviteUrl: string; expiresAt: string }> {
  const admin = createAdminClient();
  const email = details.email.trim().toLowerCase();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "agent" },
    user_metadata: { full_name: details.full_name },
  });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "unknown error";
    throw new Error(/already.*registered|exists/i.test(msg) ? "This email already has an account." : `Could not create the login: ${msg}`);
  }
  const id = created.data.user.id;
  const { error } = await ceoClient.from("profiles").insert({
    id,
    full_name: details.full_name.trim(),
    email,
    phone: details.phone,
    whatsapp: details.whatsapp || null,
    city: details.city || null,
    role: "agent",
  });
  if (error) {
    await admin.auth.admin.deleteUser(id);
    throw new Error(`Could not create the agent profile: ${error.message}`);
  }
  const invite = await createInvite(id, ceoId);
  return { profileId: id, inviteUrl: invite.url, expiresAt: invite.expiresAt };
}
