import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { PayoutForm } from "@/components/ceo-admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { getAgentBalances, getRecentPayouts } from "@/lib/data/ceo";
import { METHOD_LABEL } from "@/lib/data/ledger";
import { formatDate, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  await requireCeo();
  const [balances, recent] = await Promise.all([getAgentBalances(), getRecentPayouts()]);
  const owed = balances.reduce((s, b) => s + Math.max(0, b.pending), 0);
  const paid = balances.reduce((s, b) => s + b.paid, 0);

  return (
    <>
      <PageHeader title="Payouts" description="Policy: pay commission within 3 working days of verifying the client payment." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:max-w-xl">
        <StatTile label="Commission owed now" value={formatPKR(owed)} tone="pending" />
        <StatTile label="Paid so far" value={formatPKR(paid)} tone="good" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Balance per agent" description="Earned (final + estimated) minus paid." />
            <ul className="divide-y divide-border">
              {balances.map((b) => (
                <li key={b.id}>
                  <Link href={`/ceo/agents/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {b.name} {!b.active && <span className="text-sm font-normal text-muted-foreground">(inactive)</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Earned <span className="num">{formatPKR(b.earnedLocked + b.earnedOpen)}</span> · paid <span className="num">{formatPKR(b.paid)}</span>
                      </p>
                    </div>
                    <span className={`num shrink-0 font-semibold ${b.pending > 0 ? "text-[var(--status-pending-fg)]" : "text-muted-foreground"}`}>
                      {formatPKR(b.pending)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Recent payouts" />
            {recent.length === 0 ? (
              <EmptyState icon={Wallet} title="No payouts recorded yet" />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.agentName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDate(p.paidOn)} · {METHOD_LABEL[p.method] ?? p.method}
                        {p.reference && ` · ${p.reference}`}
                      </p>
                      {p.note && <p className="truncate text-sm text-muted-foreground">{p.note}</p>}
                    </div>
                    <span className="num shrink-0 font-semibold">{formatPKR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card className="self-start lg:col-span-2">
          <CardHeader title="Record a payout" description="The agent is notified and it shows on their statement." />
          <CardBody>
            <PayoutForm agents={balances.map((b) => ({ id: b.id, name: b.name, pending: b.pending }))} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
