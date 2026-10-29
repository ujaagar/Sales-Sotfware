"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAttempts } from "@/lib/attempts";
import { requireCeo } from "@/lib/auth";
import { cleanOtp, LOGIN_LIMIT } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

// CEO 2-step verification with an authenticator app (Google Authenticator, Microsoft Authenticator…).

export type Result = { error?: string; ok?: boolean };
export type Setup = { error?: string; factorId?: string; qr?: string; secret?: string };

/** Step 1 of setup: makes a new secret and QR code. Clears any half-finished setup first. */
export async function startTwoStep(): Promise<Setup> {
  await requireCeo();
  const supabase = await createClient();
  const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Could not start the setup. Please try again." };
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Ujaagar Sales",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
  });
  if (error || !data) return { error: "Could not start the setup. Please try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 2 of setup: the first code from the app proves it is set up correctly. */
export async function confirmTwoStep(factorId: string, code: string): Promise<Result> {
  const me = await requireCeo();
  const otp = cleanOtp(code);
  if (!otp) return { error: "Enter the 6-digit code from the app." };
  const gate = await checkAttempts("login", `2step:${me.email}`, LOGIN_LIMIT);
  if (gate.locked) return { error: "Too many wrong codes. Wait 15 minutes and try again." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: otp });
  await gate.record(!error);
  if (error) return { error: "That code didn't work. Check the phone's time is automatic, then try the newest code." };
  revalidatePath("/ceo", "layout");
  return { ok: true };
}

/** After the password: the CEO enters the current code to open the portal. */
export async function verifyTwoStep(code: string): Promise<Result> {
  const me = await requireCeo({ allowMfaPending: true });
  const otp = cleanOtp(code);
  if (!otp) return { error: "Enter the 6-digit code from the app." };
  const gate = await checkAttempts("login", `2step:${me.email}`, LOGIN_LIMIT);
  if (gate.locked) return { error: "Too many wrong codes. Wait 15 minutes and try again." };
  const supabase = await createClient();
  const { data: list } = await supabase.auth.mfa.listFactors();
  const factor = list?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect("/ceo");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: otp });
  await gate.record(!error);
  if (error) return { error: "That code didn't work. Use the newest code in the app." };
  redirect("/ceo");
}
