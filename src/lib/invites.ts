import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Agent invite links: our own tokens (Supabase's links expire within 24h; ours last 7 days).
// Only a SHA-256 hash of the token is stored, so a database leak can't be turned into a login.

const INVITE_DAYS = 7;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Issues a fresh invite for the agent, revoking any older unused ones. Returns the link. */
export async function createInvite(profileId: string, createdBy: string): Promise<{ url: string; expiresAt: string }> {
  const admin = createAdminClient();
  const now = new Date();
  await admin
    .from("agent_invites")
    .update({ revoked_at: now.toISOString() })
    .eq("profile_id", profileId)
    .is("used_at", null)
    .is("revoked_at", null);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString();
  const { error } = await admin
    .from("agent_invites")
    .insert({ profile_id: profileId, token_hash: hashToken(token), expires_at: expiresAt, created_by: createdBy });
  if (error) throw new Error(`Could not create the invite: ${error.message}`);
  return { url: `${appUrl()}/set-password?token=${token}`, expiresAt };
}

export type InviteCheck =
  | { ok: true; inviteId: string; profileId: string; name: string; email: string }
  | { ok: false; reason: "missing" | "invalid" | "used" | "revoked" | "expired" | "inactive" };

/** Checks an invite token without using it up. */
export async function checkInvite(token: string | null | undefined): Promise<InviteCheck> {
  if (!token || token.length < 20) return { ok: false, reason: "missing" };
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_invites")
    .select("id, profile_id, expires_at, used_at, revoked_at, profiles!agent_invites_profile_id_fkey(full_name, email, is_active, role)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return { ok: false, reason: "invalid" };
  if (data.used_at) return { ok: false, reason: "used" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  const p = data.profiles as unknown as { full_name: string; email: string; is_active: boolean; role: string } | null;
  if (!p || !p.is_active || p.role !== "agent") return { ok: false, reason: "inactive" };
  return { ok: true, inviteId: data.id, profileId: data.profile_id, name: p.full_name, email: p.email };
}

/** Latest invite state per agent, for the CEO's Agents screen. */
export async function inviteStatus(profileIds: string[]) {
  const map = new Map<string, { state: "pending" | "expired" | "used"; expiresAt: string }>();
  if (profileIds.length === 0) return map;
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_invites")
    .select("profile_id, expires_at, used_at, revoked_at, created_at")
    .in("profile_id", profileIds)
    .order("created_at", { ascending: false });
  for (const inv of data ?? []) {
    if (map.has(inv.profile_id)) continue;
    if (inv.used_at) map.set(inv.profile_id, { state: "used", expiresAt: inv.expires_at });
    else if (inv.revoked_at || new Date(inv.expires_at).getTime() < Date.now())
      map.set(inv.profile_id, { state: "expired", expiresAt: inv.expires_at });
    else map.set(inv.profile_id, { state: "pending", expiresAt: inv.expires_at });
  }
  return map;
}
