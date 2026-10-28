"use server";

import { appUrl } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok?: boolean; error?: string };

/** Always answers the same way, so nobody can check which emails have accounts. */
export async function requestPasswordReset(email: string): Promise<Result> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: "Enter a valid email." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(e, { redirectTo: `${appUrl()}/auth/callback?next=/reset-password` });
  return { ok: true };
}

export async function setNewPassword(password: string, confirm: string): Promise<Result> {
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This reset link has expired. Ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("weak") ? "Choose a stronger password." : error.message };
  await supabase.auth.signOut();
  return { ok: true };
}
