import "server-only";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import type { Viewer } from "@/lib/data/types";
import { getMyAcceptance } from "@/lib/policy";

/**
 * Agent pages and actions: a signed-in agent who has accepted the current Sales Agent Policy.
 * Agents who haven't accepted it yet are sent to /welcome/policy before anything else opens.
 */
export async function requireAgent(opts: { skipPolicy?: boolean } = {}): Promise<Viewer> {
  const v = await getViewer("agent");
  if (!v) redirect("/login");
  if (v.role !== "agent") redirect("/ceo");
  if (!opts.skipPolicy && !(await getMyAcceptance(v.id))) redirect("/welcome/policy");
  return v;
}

/** Anyone who records sales: an agent (policy accepted) or the CEO (My Sales). */
export async function requireSeller(): Promise<Viewer & { base: string }> {
  const v = await getViewer("agent");
  if (!v) redirect("/login");
  if (v.role === "ceo") {
    if (v.mfaPending) redirect("/ceo/verify");
    return { ...v, base: "/ceo/my-sales" };
  }
  if (!(await getMyAcceptance(v.id))) redirect("/welcome/policy");
  return { ...v, base: "" };
}

/**
 * CEO pages and actions: the CEO or back to /ceo/login.
 * Once 2-step is on, a session that hasn't entered the code goes to /ceo/verify first.
 */
export async function requireCeo(opts: { allowMfaPending?: boolean } = {}): Promise<Viewer> {
  const v = await getViewer("ceo");
  if (!v) redirect("/ceo/login");
  if (v.role !== "ceo") redirect("/dashboard");
  if (v.mfaPending && !opts.allowMfaPending) redirect("/ceo/verify");
  return v;
}
