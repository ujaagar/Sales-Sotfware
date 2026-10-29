"use server";

import { revalidatePath } from "next/cache";
import { getViewerLive } from "@/lib/data/live";
import { checkAttempts } from "@/lib/attempts";
import { LOGIN_LIMIT, passwordProblem } from "@/lib/security";
import { createClient, createStatelessClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";

export type Result = { error?: string; ok?: boolean };

export async function markAllRead(): Promise<Result> {
  const me = await getViewerLive();
  if (!me) return { error: "Please log in." };
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfile(raw: unknown): Promise<Result> {
  const me = await getViewerLive();
  if (!me) return { error: "Please log in." };
  const p = profileSchema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: p.data.phone, whatsapp: p.data.whatsapp || null, city: p.data.city ?? null })
    .eq("id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(current: string, next: string, confirm: string, captchaToken: string | null): Promise<Result> {
  const me = await getViewerLive();
  if (!me) return { error: "Please log in." };
  if (me.mfaPending) return { error: "Enter your 2-step code first." };
  const problem = passwordProblem(next, me.email);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  if (next === current) return { error: "Choose a password different from the current one." };

  // Check the current password on a throwaway session, with the same limits as the login page.
  const gate = await checkAttempts("login", me.email, LOGIN_LIMIT);
  if (gate.locked) return { error: "Too many wrong tries. Wait 15 minutes and try again." };
  const probe = createStatelessClient();
  const check = await probe.auth.signInWithPassword({ email: me.email, password: current, options: { captchaToken: captchaToken ?? undefined } });
  await gate.record(!check.error);
  if (check.error) {
    return { error: /captcha/i.test(check.error.message) ? "The security check failed. Please try again." : "Your current password is wrong." };
  }
  await probe.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message.includes("weak") ? "Choose a stronger password." : error.message };
  // Anyone else logged in to this account (another phone, or someone who knew the old password) is logged out.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}
