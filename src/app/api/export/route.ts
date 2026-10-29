import * as XLSX from "xlsx";
import { getViewerLive } from "@/lib/data/live";
import { cellSafe } from "@/lib/security";
import { getReport, parseFilters } from "@/lib/data/reports";

// GET /api/export?kind=payments|deals&format=csv|xlsx&from=&to=&agent=&service=&status=  (CEO only)
export async function GET(req: Request) {
  const me = await getViewerLive();
  if (!me || me.role !== "ceo") return new Response("CEO only.", { status: 403 });
  if (me.mfaPending) return new Response("Enter your 2-step code first.", { status: 401 });
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const f = parseFilters(sp);
  const kind = sp.kind === "deals" ? "deals" : "payments";
  const format = sp.format === "xlsx" ? "xlsx" : "csv";
  const report = await getReport(f);

  const rows =
    kind === "payments"
      ? report.payments.map((p) => ({
          "Paid on": p.paidOn,
          Agent: p.agent,
          Client: p.client,
          Service: p.service,
          "Deal type": p.dealType,
          Method: p.method,
          "Amount (PKR)": p.amount,
          "Commission (PKR)": p.commission,
          Status: p.status,
        }))
      : report.deals.map((d) => ({
          Created: d.createdAt.slice(0, 10),
          Agent: d.agent,
          Client: d.client,
          Service: d.service,
          "Deal type": d.dealType,
          "Amount (PKR)": d.amount,
          "Locked rate %": d.rate ?? "",
          Status: d.status,
        }));

  // Neutralise formulas typed into names or notes before they reach Excel.
  const safeRows = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cellSafe(v)])));
  const sheet = XLSX.utils.json_to_sheet(safeRows);
  const name = `ujaagar-${kind}-${f.from}-to-${f.to}`;
  if (format === "csv") {
    const csv = "﻿" + XLSX.utils.sheet_to_csv(sheet);
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "no-store" },
    });
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, kind === "payments" ? "Payments" : "Deals");
  const buf = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
