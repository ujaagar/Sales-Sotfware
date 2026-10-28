"use server";

import { revalidatePath } from "next/cache";
import { getViewerLive } from "@/lib/data/live";
import { createClient } from "@/lib/supabase/server";
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

export async function changePassword(current: string, next: string, confirm: string): Promise<Result> {
  const me = await getViewerLive();
  if (!me) return { error: "Please log in." };
  if (next.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: me.email, password: current });
  if (check.error) return { error: "Your current password is wrong." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message.includes("weak") ? "Choose a stronger password." : error.message };
  return { ok: true };
}
