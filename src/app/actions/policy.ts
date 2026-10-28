"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAgent } from "@/lib/auth";
import { isPreview } from "@/lib/env";
import { CURRENT_POLICY_VERSION, getMyAcceptance, type PolicyLang } from "@/lib/policy";
import { createClient } from "@/lib/supabase/server";

const squash = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export async function acceptPolicy(input: {
  version: string;
  language: PolicyLang;
  typedName: string;
  cnic: string;
  agreed: boolean;
}): Promise<{ error?: string }> {
  const me = await requireAgent({ skipPolicy: true });
  if (input.version !== CURRENT_POLICY_VERSION) return { error: "The policy was just updated. Please reload the page and read the new version." };
  if (!input.agreed) return { error: "Tick the box to confirm you have read and agree to the policy." };
  if (squash(input.typedName) !== squash(me.name)) return { error: `Type your full name exactly as on your account: ${me.name}` };
  if (!/^\d{5}-\d{7}-\d$/.test(input.cnic.trim())) return { error: "Enter your CNIC as 12345-1234567-1." };
  if (isPreview) redirect("/dashboard");
  if (await getMyAcceptance(me.id)) redirect("/dashboard");

  const h = await headers();
  const supabase = await createClient();
  const { error } = await supabase.from("policy_acceptances").insert({
    agent_id: me.id,
    policy_version: CURRENT_POLICY_VERSION,
    language: input.language === "ur" ? "ur" : "en",
    typed_name: input.typedName.trim(),
    cnic: input.cnic.trim(),
    ip_address: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) return { error: "Could not save your acceptance. Please try again." };
  redirect("/dashboard");
}

/** Declining signs the agent out. They can come back and accept later. */
export async function declinePolicy(): Promise<void> {
  if (!isPreview) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login?policy=declined");
}
