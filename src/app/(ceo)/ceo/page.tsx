import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Receipt, UserPlus } from "lucide-react";
import { CollectedChart } from "@/components/charts/collected-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader, Progress, StatTile } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getCeoDashboard } from "@/lib/data";
import { formatDate, formatMonth, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "CEO dashboard" };

function QueueTile({ href, icon: Icon, count, label }: { href: string; icon: typeof BadgeCheck; count: number; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[16px] border border-border bg-card p-4 hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <span
        className={
          count > 0
            ? "flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]"
            : "flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="num font-display text-[22px] leading-tight font-semibold">{count}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default async function CeoDashboardPage() {
  const me = await requireCeo();
  const d = await getCeoDashboard();
  const change = d.collectedLastMonth ? Math.round(((d.collected - d.collectedLastMonth) / d.collectedLastMonth) * 100) : null;
  const maxService = Math.max(1, ...d.salesByService.map((s) => s.amount));

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader title={`Good day, ${me.name.split(" ")[0]}`} description={`Company overview · ${formatMonth(d.month)}`} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile
          label="Collected this month"
          value={formatPKR(d.collected)}
          hint={change === null ? "Verified payments" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs last month (so far)`}
        />
        <StatTile
          label="Commission owed"
          value={formatPKR(d.commission.liability)}
          tone="pending"
          hint={`${formatPKR(d.commission.estimated)} estimated · ${formatPKR(d.commission.locked)} final`}
        />
        <StatTile label="Commission paid" value={formatPKR(d.commission.paid)} hint="All time" />
        <StatTile label="Active agents" value={d.agents.length} hint={`${d.agents.reduce((s, a) => s + a.activeDeals, 0)} active deals`} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <QueueTile href="/ceo/approvals" icon={BadgeCheck} count={d.pendingApprovals} label="Deals to approve" />
        <QueueTile href="/ceo/payments" icon={Receipt} count={d.pendingVerifications} label="Payments to verify" />
        <QueueTile href="/ceo/applications" icon={UserPlus} count={d.pendingApplications} label="Agent applications" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader title="Collected per month" description="Verified client payments, last 6 months" />
          <CardBody>
            <CollectedChart data={d.collectedByMonth} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sales by service" description={formatMonth(d.month)} />
          <CardBody>
            <ul className="space-y-3.5">
              {d.salesByService.map((s) => (
                <li key={s.service}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{s.service}</span>
                    <span className="num font-semibold">{formatPKR(s.amount)}</span>
                  </div>
                  <Progress value={(s.amount / maxService) * 100} label={`${s.service} share`} className="mt-1.5" />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Agent performance"
            description="Collected vs monthly target"
            action={
              <Link href="/ceo/agents" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-foreground hover:underline">
                Agents <ArrowRight className="size-4" />
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {d.agents.map((a) => {
              const pct = a.target ? (a.collected / a.target) * 100 : 0;
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="num text-sm font-semibold">{formatPKR(a.collected)}</p>
                    </div>
                    <Progress value={pct} label={`${a.name} progress to target`} className="mt-1.5" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="num">{Math.round(pct)}%</span> of {a.target ? formatPKR(a.target) : "no target"} · commission{" "}
                      <span className="num">{formatPKR(a.commission)}</span> · {a.activeDeals} active deals
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Monthly packages" description="Payment for this month (due by the 10th)" />
          <ul className="divide-y divide-border">
            {d.monthlyDeals.map((m) => (
              <li key={m.dealId} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.clientName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.agentName} · <span className="num">{formatPKR(m.fee)}</span>/mo
                  </p>
                </div>
                <StatusBadge status={m.state} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader title="Deals waiting for you" />
          <ul className="divide-y divide-border">
            {d.approvals.map((a) => (
              <li key={a.id}>
                <Link href={`/ceo/approvals/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.businessName ?? a.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.agentName} · {a.service}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm font-semibold">
                    {formatPKR(a.amount)}
                    {a.type === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Payments to verify" />
          <ul className="divide-y divide-border">
            {d.verifications.map((p) => (
              <li key={p.id}>
                <Link href={`/ceo/payments/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.agentName} · {formatDate(p.paidOn)} · {p.method}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm font-semibold">{formatPKR(p.amount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
