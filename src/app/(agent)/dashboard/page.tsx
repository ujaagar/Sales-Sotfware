import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, MessageCircle, Phone, Plus, Trophy, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAgent } from "@/lib/auth";
import { getAgentDashboard } from "@/lib/data";
import { formatDate, formatMonth, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Home" };

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "92");
  return `https://wa.me/${digits}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
}

export default async function AgentDashboardPage() {
  const me = await requireAgent();
  const d = await getAgentDashboard(me);
  const pct = d.target ? (d.collectedThisMonth / d.target) * 100 : 0;
  const stages = (["new", "contacted", "interested"] as const).map((s) => ({ s, n: d.leads.filter((l) => l.status === s).length }));

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{formatMonth(d.month)}</p>
        <h1 className="text-[26px] font-semibold sm:text-[32px]">Hello, {me.name.split(" ")[0]}</h1>
      </div>

      {/* Balance */}
      <section aria-labelledby="balance" className="relative overflow-hidden rounded-[16px] bg-midnight p-5 text-white sm:p-6">
        <div aria-hidden className="absolute -top-10 -right-6 h-40 w-16 rounded-full bg-[#1a3170] opacity-70" />
        <h2 id="balance" className="relative text-sm font-medium text-[#c9d3e6]">
          Your commission
        </h2>
        <dl className="relative mt-3 grid grid-cols-3 gap-3">
          {[
            ["Earned", d.balance.earned],
            ["Paid", d.balance.paid],
            ["Pending", d.balance.pending],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-[#c9d3e6]">{label}</dt>
              <dd className="num mt-1 font-display text-[19px] leading-tight font-semibold sm:text-[26px]">{formatPKR(value as number)}</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-4 text-xs text-[#c9d3e6]">
          Includes {formatPKR(d.balance.earnedEstimated)} estimated for {formatMonth(d.month, true)}. It becomes final when the CEO locks the month.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {/* This month */}
        <Card>
          <CardHeader
            title="This month"
            description="Verified payments you collected"
            action={
              d.rank && (
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-foreground hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trophy className="size-4" aria-hidden /> Rank #{d.rank}
                </Link>
              )
            }
          />
          <CardBody>
            <p className="num font-display text-[28px] font-semibold">{formatPKR(d.collectedThisMonth)}</p>
            {d.target && (
              <>
                <Progress value={pct} label="Progress to monthly target" className="mt-3" />
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="num">{Math.round(pct)}%</span> of your <span className="num">{formatPKR(d.target)}</span> target
                </p>
              </>
            )}
            <div className="mt-4 flex items-center justify-between rounded-[12px] bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Commission this month</span>
              <span className="num font-semibold text-[var(--status-good-fg)]">{formatPKR(d.commissionThisMonth)}</span>
            </div>
          </CardBody>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader title="Today's follow-ups" description={`${d.followUpsToday.length} to call`} />
          {d.followUpsToday.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No follow-ups today">
              Set a follow-up date on a lead and it shows up here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {d.followUpsToday.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {f.business} · <span className="num">{timeLabel(f.at)}</span>
                    </p>
                  </div>
                  <a
                    href={`tel:${f.phone}`}
                    aria-label={`Call ${f.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-[12px] border border-input text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform"
                  >
                    <Phone className="size-[18px]" />
                  </a>
                  <a
                    href={waLink(f.phone)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${f.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-[12px] border border-input text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform"
                  >
                    <MessageCircle className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {/* Deals */}
        <Card>
          <CardHeader
            title="My deals"
            action={
              <Link href="/deals" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-foreground hover:underline">
                All <ArrowRight className="size-4" />
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {d.deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/deals/${deal.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{deal.businessName ?? deal.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">{deal.service}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-sm font-semibold">
                      {formatPKR(deal.amount)}
                      {deal.type === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
                    </p>
                    <StatusBadge status={deal.status} className="mt-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader
            title="Recent payments"
            action={
              <LinkButton href="/payments/new" variant="secondary" size="sm">
                <Plus /> Record
              </LinkButton>
            }
          />
          <ul className="divide-y divide-border">
            {d.recentPayments.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(p.paidOn)} · {p.method}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num text-sm font-semibold">{formatPKR(p.amount)}</p>
                  <StatusBadge status={p.status} label={p.status === "pending_verification" ? "Checking" : undefined} className="mt-1" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Leads pipeline */}
      <Card>
        <CardHeader
          title="Lead pipeline"
          action={
            <Link href="/leads" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-foreground hover:underline">
              Open leads <ArrowRight className="size-4" />
            </Link>
          }
        />
        <CardBody className="grid grid-cols-3 gap-3">
          {stages.map(({ s, n }) => (
            <Link
              key={s}
              href={`/leads?status=${s}`}
              className="rounded-[12px] border border-border p-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="num font-display text-[22px] font-semibold">{n}</p>
              <StatusBadge status={s} className="mt-1" />
            </Link>
          ))}
        </CardBody>
        {d.leads.length === 0 && (
          <EmptyState icon={Users} title="No leads yet">
            Add the people you talk to so you never miss a follow-up.
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
