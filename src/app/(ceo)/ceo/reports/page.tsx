import type { Metadata } from "next";
import { Download, Filter } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getActiveAgents } from "@/lib/data/ceo";
import { getReport, parseFilters } from "@/lib/data/reports";
import { getServices } from "@/lib/data/sales";
import { formatDate, formatPKR, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireCeo();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [report, agents, services] = await Promise.all([getReport(f), getActiveAgents(), getServices(false)]);
  const qs = new URLSearchParams({ from: f.from, to: f.to, agent: f.agent, service: f.service, status: f.status }).toString();
  const dl = (kind: string, format: string) => `/api/export?kind=${kind}&format=${format}&${qs}`;
  const dlClass = cn(buttonVariants({ variant: "secondary", size: "sm" }));

  return (
    <>
      <PageHeader title="Reports" description="Filter, then download as CSV or Excel." />
      <Card className="mb-6 p-4 sm:p-5">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={f.from} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={f.to} />
          </Field>
          <Field label="Agent" htmlFor="agent">
            <Select id="agent" name="agent" defaultValue={f.agent}>
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service" htmlFor="service">
            <Select id="service" name="service" defaultValue={f.service}>
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deal status" htmlFor="status">
            <Select id="status" name="status" defaultValue={f.status}>
              <option value="">Any status</option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <button type="submit" className={cn(buttonVariants({ variant: "primary" }))}>
            <Filter /> Apply
          </button>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Collected (verified)" value={formatPKR(report.totals.collected)} />
        <StatTile label="Commission on it" value={formatPKR(report.totals.commission)} tone="pending" />
        <StatTile label="Deals created" value={report.totals.deals} />
        <StatTile label="Deal value (not rejected)" value={formatPKR(report.totals.dealValue)} />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Client payments"
          description={`${formatDate(f.from)} to ${formatDate(f.to)}`}
          action={
            <div className="flex gap-2">
              <a href={dl("payments", "csv")} className={dlClass}>
                <Download /> CSV
              </a>
              <a href={dl("payments", "xlsx")} className={dlClass}>
                <Download /> Excel
              </a>
            </div>
          }
        />
        {report.payments.length === 0 ? (
          <EmptyState icon={Filter} title="No payments for these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  {["Paid on", "Agent", "Client", "Service", "Type", "Amount", "Commission", "Status"].map((h) => (
                    <th key={h} className={cn("px-4 py-2.5 font-medium", (h === "Amount" || h === "Commission") && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.payments.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.paidOn)}</td>
                    <td className="px-4 py-2.5">{p.agent}</td>
                    <td className="px-4 py-2.5">{p.client}</td>
                    <td className="px-4 py-2.5">{p.service}</td>
                    <td className="px-4 py-2.5">{p.dealType}</td>
                    <td className="num px-4 py-2.5 text-right">{formatPKR(p.amount)}</td>
                    <td className="num px-4 py-2.5 text-right">{formatPKR(p.commission)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Deals"
          action={
            <div className="flex gap-2">
              <a href={dl("deals", "csv")} className={dlClass}>
                <Download /> CSV
              </a>
              <a href={dl("deals", "xlsx")} className={dlClass}>
                <Download /> Excel
              </a>
            </div>
          }
        />
        {report.deals.length === 0 ? (
          <EmptyState icon={Filter} title="No deals for these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  {["Created", "Agent", "Client", "Service", "Type", "Amount", "Rate", "Status"].map((h) => (
                    <th key={h} className={cn("px-4 py-2.5 font-medium", (h === "Amount" || h === "Rate") && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.deals.map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-2.5">{d.agent}</td>
                    <td className="px-4 py-2.5">{d.client}</td>
                    <td className="px-4 py-2.5">{d.service}</td>
                    <td className="px-4 py-2.5">{d.dealType}</td>
                    <td className="num px-4 py-2.5 text-right">{formatPKR(d.amount)}</td>
                    <td className="num px-4 py-2.5 text-right">{d.rate === null ? "—" : formatRate(d.rate)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
