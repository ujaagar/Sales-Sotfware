import Link from "next/link";
import { CalendarClock, KanbanSquare, List, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { getLeads } from "@/lib/data";
import type { LeadRow, LeadStatus, Viewer } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";


const STAGES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "interested", label: "Interested" },
  { status: "converted", label: "Converted" },
  { status: "not_interested", label: "Not interested" },
  { status: "lost", label: "Lost" },
];

function LeadCard({ lead, base }: { lead: LeadRow; base: string }) {
  return (
    <Link
      href={`${base}/leads/${lead.id}`}
      className="block rounded-[12px] border border-border bg-card p-3.5 hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="font-medium">{lead.clientName}</p>
      <p className="text-sm text-muted-foreground">
        {lead.businessName}
        {lead.city && ` · ${lead.city}`}
      </p>
      {lead.services.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{lead.services.join(", ")}</p>}
      {lead.nextFollowUpAt && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-pending-fg)]">
          <CalendarClock className="size-3.5" aria-hidden /> {formatDateTime(lead.nextFollowUpAt)}
        </p>
      )}
    </Link>
  );
}

export async function LeadsListView({ me, base, sp }: { me: Viewer; base: string; sp: { view?: string; status?: string } }) {
  const leads = await getLeads(me);
  const view = sp.view === "board" ? "board" : "list";
  const status = STAGES.find((s) => s.status === sp.status)?.status;
  const shown = status ? leads.filter((l) => l.status === status) : leads;

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${leads.length} people you're talking to`}
        actions={
          <LinkButton href={`${base}/leads/new`}>
            <Plus /> Add lead
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="View" className="inline-flex rounded-[12px] border border-input bg-card p-1">
          {(
            [
              ["list", "List", List],
              ["board", "Board", KanbanSquare],
            ] as const
          ).map(([v, label, Icon]) => (
            <Link
              key={v}
              role="tab"
              aria-selected={view === v}
              href={`${base}/leads?view=${v}${status ? `&status=${status}` : ""}`}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
        {view === "list" && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <Link
              href={`${base}/leads`}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !status ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </Link>
            {STAGES.map((s) => (
              <Link
                key={s.status}
                href={`${base}/leads?status=${s.status}`}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === s.status ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {view === "board" ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-6 lg:overflow-visible">
          {STAGES.map((s) => {
            const col = leads.filter((l) => l.status === s.status);
            return (
              <section key={s.status} aria-label={s.label} className="w-[78vw] max-w-[300px] shrink-0 snap-start rounded-[16px] bg-muted p-2.5 sm:w-[280px] lg:w-auto">
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <StatusBadge status={s.status} />
                  <span className="num text-sm text-muted-foreground">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((l) => (
                    <LeadCard key={l.id} lead={l} base={base} />
                  ))}
                  {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">No leads</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No leads here">
            Add a lead when you start talking to a business.
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {shown.map((l) => (
              <li key={l.id}>
                <Link href={`${base}/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {l.businessName}
                      {l.nextFollowUpAt && ` · Follow up ${formatDateTime(l.nextFollowUpAt)}`}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
