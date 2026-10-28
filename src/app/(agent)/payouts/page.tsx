import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { getLedger, METHOD_LABEL } from "@/lib/data/ledger";
import { formatDate, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const me = await requireAgent();
  const ledger = await getLedger(me.id);
  const payouts = ledger?.payouts ?? [];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Payouts" description="Commission paid to you. Report any error within 10 days of a payout." />
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatTile label="Paid so far" value={formatPKR(ledger?.balance.paid ?? 0)} tone="good" />
        <StatTile label="Still due" value={formatPKR(ledger?.balance.pending ?? 0)} tone="pending" />
      </div>
      <Card>
        {payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payouts yet">
            When the CEO pays your commission it shows here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatDate(p.paidOn)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {METHOD_LABEL[p.method] ?? p.method}
                    {p.reference && ` · Ref ${p.reference}`}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <span className="num shrink-0 font-semibold text-[var(--status-good-fg)]">{formatPKR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
