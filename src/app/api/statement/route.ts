import { getViewerLive } from "@/lib/data/live";
import { getLedger } from "@/lib/data/ledger";
import { renderStatement } from "@/lib/pdf/statement";

// GET /api/statement?month=2026-10-01[&agent=<id>]  → PDF. Agents get their own; the CEO can pass an agent.
export async function GET(req: Request) {
  const me = await getViewerLive();
  if (!me) return new Response("Please log in.", { status: 401 });
  if (me.mfaPending) return new Response("Enter your 2-step code first.", { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}-01$/.test(month)) return new Response("Choose a month.", { status: 400 });
  const agentId = me.role === "ceo" ? url.searchParams.get("agent") ?? "" : me.id;
  const ledger = await getLedger(agentId);
  if (!ledger) return new Response("Not found.", { status: 404 });
  const m = ledger.months.find((x) => x.month === month) ?? {
    month,
    status: "open" as const,
    lockedAt: null,
    collected: 0,
    commission: 0,
    entries: [],
  };
  const pdf = await renderStatement(ledger, m);
  const name = `Ujaagar-commission-${ledger.agent.name.replace(/[^\w]+/g, "-")}-${month.slice(0, 7)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
