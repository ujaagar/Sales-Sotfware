"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findDuplicate } from "@/lib/agents";
import { isPreview } from "@/lib/env";
import { checkAttempts } from "@/lib/attempts";
import { checkInvite } from "@/lib/invites";
import { LOGIN_LIMIT, passwordProblem } from "@/lib/security";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { applySchema, loginSchema } from "@/lib/validation";

export type ActionResult = { error?: string; ok?: boolean; preview?: boolean };

export async function signIn(portal: "agent" | "ceo", raw: unknown, captchaToken: string | null = null): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  if (isPreview) redirect(portal === "ceo" ? "/ceo" : "/dashboard");

  // Brute-force guard: 5 wrong passwords for one email, or 20 from one network, in 15 minutes.
  const gate = await checkAttempts("login", parsed.data.email, LOGIN_LIMIT);
  if (gate.locked) return { error: "Too many wrong tries. Wait 15 minutes, or reset your password." };

  const supabase = await createClient();
  // The captcha token is checked by Supabase itself once captcha protection is on there.
  const { data, error } = await supabase.auth.signInWithPassword({ ...parsed.data, options: { captchaToken: captchaToken ?? undefined } });
  if (error && /captcha/i.test(error.message)) return { error: "The security check failed. Please try again." };
  if (error && (error.code === "user_banned" || /banned/i.test(error.message))) {
    await gate.record(false);
    return { error: "This account isn't active. Please contact the CEO." };
  }
  if (error || !data.user) {
    await gate.record(false);
    if (gate.emailFailures + 1 === LOGIN_LIMIT.perEmail) await alertCeoLockout(parsed.data.email);
    return { error: "Wrong email or password." };
  }
  await gate.record(true);

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account isn't active. Please contact the CEO." };
  }
  if (portal === "ceo" && profile.role !== "ceo") {
    await supabase.auth.signOut();
    return { error: "This is the CEO portal. Sales agents log in at the agent portal (/login)." };
  }
  if (portal === "agent" && profile.role !== "agent") {
    await supabase.auth.signOut();
    return { error: "This is the agent portal. CEO, please use the CEO portal (/ceo/login)." };
  }
  redirect(portal === "ceo" ? "/ceo" : "/dashboard");
}

/** Tells the CEO (in the app) when a real account gets locked by wrong passwords. Not exported. */
async function alertCeoLockout(email: string) {
  try {
    const admin = createAdminClient();
    const [{ data: target }, { data: ceo }] = await Promise.all([
      admin.from("profiles").select("full_name, role").eq("email", email.trim().toLowerCase()).maybeSingle(),
      admin.from("profiles").select("id").eq("role", "ceo").maybeSingle(),
    ]);
    if (!target || !ceo) return;
    await admin.from("notifications").insert({
      user_id: ceo.id,
      type: "security_alert",
      title: "Login locked after wrong passwords",
      body: `${LOGIN_LIMIT.perEmail} wrong passwords for ${target.full_name} (${target.role === "ceo" ? "your CEO account" : email}). Login is paused for 15 minutes. If this wasn't them, someone may be guessing the password.`,
      link: target.role === "ceo" ? "/ceo/security" : "/ceo/agents",
    });
  } catch {
    // An alert failing must never break the login page.
  }
}

export async function signOut(): Promise<void> {
  if (!isPreview) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

const MAX_ATTEMPTS_PER_HOUR = 5;

export async function submitApplication(raw: unknown, turnstileToken: string | null): Promise<ActionResult> {
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  if (isPreview) return { ok: true };

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
  if (!(await verifyTurnstile(turnstileToken, ip))) return { error: "The security check failed. Please try it again." };

  const admin = createAdminClient();
  const ipHash = createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip ?? "unknown"}`).digest("hex");
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from("application_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) return { error: "Too many attempts. Please try again in an hour." };
  await admin.from("application_attempts").insert({ ip_hash: ipHash });

  const v = parsed.data;
  const dup = await findDuplicate(v.email, v.phone);
  if (dup) return { error: dup.replace("already has an account", "is already registered").replace("is already waiting", "has already been sent. The CEO will review it.") };

  const { error } = await admin.from("agent_applications").insert({
    full_name: v.fullName,
    email: v.email,
    phone: v.phone,
    whatsapp: v.whatsapp || null,
    city: v.city,
    cnic: v.cnic || null,
    note: v.note || null,
    source: "form",
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) return { error: "An application with this email or phone has already been sent." };
    return { error: "Could not send your application. Please try again." };
  }
  return { ok: true };
}

export async function setPassword(token: string, password: string, confirm: string): Promise<ActionResult> {
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const invite = await checkInvite(token);
  if (!invite.ok) return { error: "This link is no longer valid. Ask the CEO for a new one." };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(invite.profileId, { password });
  if (error) return { error: error.message.includes("weak") ? "Choose a stronger password." : `Could not set the password: ${error.message}` };
  await admin.from("agent_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.inviteId);
  return { ok: true };
}
