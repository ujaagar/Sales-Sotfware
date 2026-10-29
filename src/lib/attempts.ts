import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { isLocked } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/server";

type Kind = "login" | "reset";
type Limit = { windowMinutes: number; perEmail: number; perIp: number };

/** The visitor's IP. On Vercel, x-forwarded-for is set by Vercel itself, so it can't be faked. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
}

/** One-way fingerprint so the table never stores real emails or IPs. */
export function fingerprint(kind: string, value: string): string {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${kind}:${value.trim().toLowerCase()}`).digest("hex");
}

export type Gate = { locked: boolean; emailFailures: number; record: (success: boolean) => Promise<void> };

/** Counts recent failures for this email and this network, and returns a recorder for the outcome. */
export async function checkAttempts(kind: Kind, email: string, limit: Limit): Promise<Gate> {
  const admin = createAdminClient();
  const ip = (await clientIp()) ?? "unknown";
  const emailHash = fingerprint("email", email);
  const ipHash = fingerprint("ip", ip);
  const since = new Date(Date.now() - limit.windowMinutes * 60_000).toISOString();
  const failuresOnly = kind === "login";
  const count = async (col: "email_hash" | "ip_hash", value: string) => {
    let q = admin.from("auth_attempts").select("id", { count: "exact", head: true }).eq("kind", kind).eq(col, value).gte("created_at", since);
    if (failuresOnly) q = q.eq("success", false);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [byEmail, byIp] = await Promise.all([count("email_hash", emailHash), count("ip_hash", ipHash)]);
  return {
    locked: isLocked({ email: byEmail, ip: byIp }, limit),
    emailFailures: byEmail,
    record: async (success: boolean) => {
      await admin.from("auth_attempts").insert({ kind, email_hash: emailHash, ip_hash: ipHash, success });
    },
  };
}
