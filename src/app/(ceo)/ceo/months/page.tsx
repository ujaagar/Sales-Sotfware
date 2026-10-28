import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { LockButton } from "@/components/ceo-admin-forms";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getPeriods } from "@/lib/data/ceo";
import { currentMonth, formatDate, formatMonth, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Month locking" };

export default async function MonthsPage() {
  await requireCeo();
  const periods = await getPeriods();
  const months = [...new Set(periods.map((p) => p.month))];
  const now = currentMonth();

  return (
    <>
      <PageHeader
        title="Month locking"
        description="Check each agent's month, then lock it. Locked months are final and can't change; later corrections go into an open month."
      />
      {months.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="No commission yet" />
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map((m) => {
            const rows = periods.filter((p) => p.month === m);
            const open = rows.filter((r) => r.status === "open");
            return (
              <Card key={m}>
                <CardHeader
                  title={formatMonth(m)}
                  description={`${formatPKR(rows.reduce((s, r) => s + r.commission, 0))} commission · ${open.length ? `${open.length} open` : "all locked"}`}
                  action={
                    open.length > 0 ? (
                      <LockButton
                        month={m}
                        label="Lock all"
                        confirmText={`Lock ${formatMonth(m)} for all agents? ${m === now ? "This month isn't over yet. " : ""}Locked months can't be changed.`}
                      />
                    ) : undefined
                  }
                />
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li key={r.agentId} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
                      <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                        <Link href={`/ceo/agents/${r.agentId}`} className="font-medium hover:underline">
                          {r.agentName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Collected <span className="num">{formatPKR(r.collected)}</span>
                          {r.lockedAt && ` · locked ${formatDate(r.lockedAt)}`}
                        </p>
                      </div>
                      <span className="num mr-auto font-semibold sm:mr-0">{formatPKR(r.commission)}</span>
                      <StatusBadge status={r.status} />
                      {r.status === "open" && (
                        <LockButton month={m} agentId={r.agentId} label="Lock" confirmText={`Lock ${formatMonth(m)} for ${r.agentName}? It can't be changed afterwards.`} />
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
