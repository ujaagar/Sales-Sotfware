"use server";

import { checkAttempts } from "@/lib/attempts";
import { appUrl } from "@/lib/invites";
import { passwordProblem, RESET_LIMIT } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok?: boolean; error?: string };

/**
 * Sends a reset link. Always answers the same way, so nobody can check which emails have accounts.
 * Limited to 3 per email and 10 per network each hour, and protected by the captcha.
 */
export async function requestPasswordReset(email: string, captchaToken: string | null = null): Promise<Result> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: "Enter a valid email." };
  const gate = await checkAttempts("reset", e, RESET_LIMIT);
  if (gate.locked) return { error: "Too many reset requests. Please try again in an hour." };
  await gate.record(true);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
    captchaToken: captchaToken ?? undefined,
  });
  if (error && /captcha/i.test(error.message)) return { error: "The security check failed. Please try again." };
  return { ok: true };
}

export async function setNewPassword(password: string, confirm: string): Promise<Result> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This reset link has expired. Ask for a new one." };
  const problem = passwordProblem(password, data.user.email);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error && /aal|assurance/i.test(error.message)) {
    return { error: "This account has 2-step verification on, so the password can't be reset by email alone. Log in with your code, or reset it from the Supabase dashboard." };
  }
  if (error) return { error: error.message.includes("weak") ? "Choose a stronger password." : error.message };
  // Log out every device, including any session someone else had.
  await supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}
