import { ChevronDown, FileDown, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, StatTile } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { KIND_LABEL, METHOD_LABEL, type Ledger } from "@/lib/data/ledger";
import { currentMonth, formatDate, formatMonth, formatPKR, formatRate } from "@/lib/format";

/** Earned / paid / pending, month by month, with PDF statements. Used by agents (own) and the CEO (any agent). */
export function LedgerView({ ledger, statementQuery = "" }: { ledger: Ledger; statementQuery?: string }) {
  const months = [...ledger.months];
  const now = currentMonth();
  if (!months.some((m) => m.month === now)) {
    months.unshift({ month: now, status: "open", lockedAt: null, collected: 0, commission: 0, entries: [] });
  }
  const b = ledger.balance;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Earned (final)" value={formatPKR(b.earnedLocked)} hint="Locked months" />
        <StatTile label="Earned (estimated)" value={formatPKR(b.earnedEstimated)} hint="Months not locked yet" />
        <StatTile label="Paid" value={formatPKR(b.paid)} tone="good" />
        <StatTile label="Pending" value={formatPKR(b.pending)} tone="pending" hint="Earned minus paid" />
      </div>

      <Card>
        <CardHeader title="Month by month" description="A month becomes Final when the CEO locks it." />
        <ul className="divide-y divide-border">
          {months.map((m) => (
            <li key={m.month}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatMonth(m.month)}</p>
                    <p className="text-sm text-muted-foreground">
                      Collected <span className="num">{formatPKR(m.collected)}</span> · {m.entries.length} entr{m.entries.length === 1 ? "y" : "ies"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-sm font-semibold">{formatPKR(m.commission)}</p>
                    <StatusBadge status={m.status} className="mt-1" />
                  </div>
                </summary>
                <div className="space-y-3 bg-muted/50 px-4 py-4 sm:px-6">
                  {m.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commission yet this month.</p>
                  ) : (
                    <ul className="space-y-2">
                      {m.entries.map((e) => (
                        <li key={e.id} className="flex items-start gap-3 rounded-[12px] bg-card px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium">{e.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {KIND_LABEL[e.kind]} · <span className="num">{formatPKR(e.base)}</span> × {formatRate(e.rate)} · {formatDate(e.createdAt)}
                            </p>
                            {e.note && <p className="mt-0.5 text-xs text-[var(--status-pending-fg)]">{e.note}</p>}
                          </div>
                          <span className={`num shrink-0 text-sm font-semibold ${e.amount < 0 ? "text-[var(--status-bad-fg)]" : ""}`}>{formatPKR(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href={`/api/statement?month=${m.month}${statementQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-input bg-card px-3.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileDown className="size-4" /> Statement PDF
                  </a>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Payouts" description="Commission the CEO has paid." />
        {ledger.payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payouts yet" />
        ) : (
          <ul className="divide-y divide-border">
            {ledger.payouts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatDate(p.paidOn)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {METHOD_LABEL[p.method] ?? p.method}
                    {p.reference && ` · ${p.reference}`}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <span className="num shrink-0 text-sm font-semibold text-[var(--status-good-fg)]">{formatPKR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
