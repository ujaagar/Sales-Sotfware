import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { isPreview } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// The Sales Agent Policy lives in content/policy/<version>.<lang>.md (copied from the owner's documents).
// Bump CURRENT_POLICY_VERSION when a new version is added: every agent must accept it again.
export const CURRENT_POLICY_VERSION = "2026-10-27";
export type PolicyLang = "en" | "ur";

export function policyLang(v: unknown): PolicyLang {
  return v === "ur" ? "ur" : "en";
}

/** Policy text for display: drops the author line and the blank signature table (the portal records acceptance). */
export async function loadPolicy(lang: PolicyLang, version = CURRENT_POLICY_VERSION): Promise<{ title: string; body: string }> {
  const file = path.join(process.cwd(), "content", "policy", `${version}.${lang}.md`);
  const raw = (await fs.readFile(file, "utf8")).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const title = (lines.find((l) => l.startsWith("# ")) ?? "# Sales Agent Policy").slice(2).trim();
  let body = lines
    .filter((l) => !l.startsWith("# "))
    .filter((l) => !/^\w{3} \d{1,2}, \d{4} · @/.test(l.trim()))
    .join("\n");
  const sig = body.search(/\n\| (Field|خانہ) \| (Details|تفصیل) \|/);
  if (sig > 0) body = body.slice(0, sig);
  return { title, body: body.trim() };
}

export type Acceptance = { acceptedAt: string; language: PolicyLang; typedName: string; version: string };

/** The signed-in agent's acceptance of the current policy, or null. */
export async function getMyAcceptance(agentId: string): Promise<Acceptance | null> {
  if (isPreview) return { acceptedAt: new Date().toISOString(), language: "en", typedName: "Sample Agent", version: CURRENT_POLICY_VERSION };
  const supabase = await createClient();
  const { data } = await supabase
    .from("policy_acceptances")
    .select("accepted_at, language, typed_name, policy_version")
    .eq("agent_id", agentId)
    .eq("policy_version", CURRENT_POLICY_VERSION)
    .maybeSingle();
  return data ? { acceptedAt: data.accepted_at, language: policyLang(data.language), typedName: data.typed_name, version: data.policy_version } : null;
}

/** "2026-10-27" → "27 Oct 2026" for display. */
export function versionLabel(v = CURRENT_POLICY_VERSION) {
  const d = new Date(`${v}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
