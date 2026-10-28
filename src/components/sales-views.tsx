import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarClock, ChevronRight, MessageCircle, Phone, Plus, Users } from "lucide-react";
import { ClientForm, DealForm, FollowUpForm, LeadForm, LeadStageActions, NotesPanel } from "@/components/sales-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Viewer } from "@/lib/data/types";
import { getClientDetail, getClientOptions, getDeal, getLead, getServices, listClients, type Note } from "@/lib/data/sales";
import { addMonths, currentMonth, formatDate, formatDateTime, formatMonth, formatPKR, formatRate, toKarachiLocal } from "@/lib/format";

// Leads, clients and deals screens, shared by the agent portal (base "") and the CEO's My Sales (base "/ceo/my-sales").

type Ctx = { me: Viewer; base: string };

const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, "").replace(/^0/, "92")}`;

function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

function ContactButtons({ phone, whatsapp, name }: { phone: string; whatsapp?: string | null; name: string }) {
  const cls =
    "inline-flex h-11 items-center gap-2 rounded-[12px] border border-input px-3.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] transition-transform";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${phone}`} className={cls} aria-label={`Call ${name}`}>
        <Phone className="size-4" /> Call
      </a>
      <a href={wa(whatsapp || phone)} target="_blank" rel="noreferrer" className={cls} aria-label={`WhatsApp ${name}`}>
        <MessageCircle className="size-4" /> WhatsApp
      </a>
    </div>
  );
}

function NotesList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">No notes yet.</p>;
  return (
    <ol className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-[12px] bg-muted px-3.5 py-2.5">
          <p className="text-[15px] whitespace-pre-wrap">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {n.author} · {formatDateTime(n.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

const dealMonths = () => [-1, 0, 1, 2, 3].map((i) => addMonths(currentMonth(), i));

// ---------- Leads ----------

export async function LeadNewView({ base }: Ctx) {
  const services = await getServices();
  return (
    <div className="mx-auto max-w-2xl">
      <Back href={`${base}/leads`} label="Leads" />
      <PageHeader title="Add lead" description="Add everyone you talk to, on the day you first contact them. First to register keeps the lead." />
      <Card className="p-4 sm:p-6">
        <LeadForm services={services} />
      </Card>
    </div>
  );
}

export async function LeadDetailView({ base, id }: Ctx & { id: string }) {
  const [lead, services] = await Promise.all([getLead(id), getServices(false)]);
  if (!lead) notFound();
  const names = new Map(services.map((s) => [s.id, s.name]));
  return (
    <div className="mx-auto max-w-4xl">
      <Back href={`${base}/leads`} label="Leads" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold sm:text-[32px]">{lead.clientName}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {[lead.businessName, lead.city].filter(Boolean).join(" · ") || "No business name"}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4 pt-5">
              <ContactButtons phone={lead.phone} whatsapp={lead.whatsapp} name={lead.clientName} />
              <dl className="divide-y divide-border">
                <Row label="Phone">
                  <span className="num">{lead.phone}</span>
                </Row>
                {lead.whatsapp && (
                  <Row label="WhatsApp">
                    <span className="num">{lead.whatsapp}</span>
                  </Row>
                )}
                <Row label="Interested in">{lead.services.map((s) => names.get(s)).filter(Boolean).join(", ") || "—"}</Row>
                <Row label="Follow-up">{lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : "Not set"}</Row>
                <Row label="Source">{lead.source ?? "—"}</Row>
                <Row label="Added">{formatDate(lead.createdAt)}</Row>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Stage" description="Move the lead along, or turn it into a deal." />
            <CardBody>
              <LeadStageActions id={lead.id} status={lead.status} converted={!!lead.clientId} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Notes" description="Every call, meeting or message. Activity keeps the lead yours." />
            <CardBody className="space-y-4">
              <NotesPanel target={{ leadId: lead.id }} />
              <NotesList notes={lead.log} />
            </CardBody>
          </Card>
        </div>
        <Card className="self-start lg:col-span-3">
          <CardHeader title="Edit lead" />
          <CardBody>
            <LeadForm
              services={services.filter((s) => s.isActive || lead.services.includes(s.id))}
              lead={{
                id: lead.id,
                clientName: lead.clientName,
                businessName: lead.businessName ?? "",
                phone: lead.phone,
                whatsapp: lead.whatsapp ?? "",
                city: lead.city ?? "",
                source: lead.source ?? "",
                services: lead.services,
                nextFollowUpAt: toKarachiLocal(lead.nextFollowUpAt),
                notes: lead.notes ?? "",
              }}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---------- Clients ----------

export async function ClientsListView({ me, base }: Ctx) {
  const clients = await listClients(me.id);
  return (
    <>
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href={`${base}/clients/new`}>
            <Plus /> Add client
          </LinkButton>
        }
      />
      <Card>
        {clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet">
            Convert a lead, or add a client directly.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`${base}/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.businessName ?? c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.businessName ? c.name : c.phone}
                      {c.city && ` · ${c.city}`} · {c.activeDeals} active deal{c.activeDeals === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="num shrink-0 text-sm font-semibold">{formatPKR(c.collected)}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function ClientNewView({ base }: Ctx) {
  return (
    <div className="mx-auto max-w-2xl">
      <Back href={`${base}/clients`} label="Clients" />
      <PageHeader title="Add client" description="For a client who is ready to buy. Usually you convert a lead instead." />
      <Card className="p-4 sm:p-6">
        <ClientForm />
      </Card>
    </div>
  );
}

export async function ClientDetailView({ base, id }: Ctx & { id: string }) {
  const c = await getClientDetail(id);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Back href={`${base}/clients`} label="Clients" />
      <PageHeader
        title={c.businessName ?? c.name}
        description={[c.businessName ? c.name : null, c.city, `client since ${formatDate(c.createdAt)}`].filter(Boolean).join(" · ")}
        actions={
          <LinkButton href={`${base}/deals/new?client=${c.id}`}>
            <Plus /> New deal
          </LinkButton>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="self-start lg:col-span-2">
          <CardBody className="space-y-4 pt-5">
            <ContactButtons phone={c.phone} whatsapp={c.whatsapp} name={c.name} />
            <dl className="divide-y divide-border">
              <Row label="Phone">
                <span className="num">{c.phone}</span>
              </Row>
              {c.email && <Row label="Email">{c.email}</Row>}
              <Row label="Owner">{c.ownerName}</Row>
            </dl>
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Deals" />
          {c.deals.length === 0 ? (
            <EmptyState icon={Briefcase} title="No deals yet" />
          ) : (
            <ul className="divide-y divide-border">
              {c.deals.map((d) => (
                <li key={d.id}>
                  <Link href={`${base}/deals/${d.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.type === "monthly" ? "Monthly" : "One-time"} · {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-sm font-semibold">
                        {formatPKR(d.amount)}
                        {d.type === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
                      </p>
                      <StatusBadge status={d.status} className="mt-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- Deals ----------

export async function DealNewView({ me, base, clientId }: Ctx & { clientId?: string }) {
  const [clients, services] = await Promise.all([getClientOptions(me.id), getServices()]);
  return (
    <div className="mx-auto max-w-2xl">
      <Back href={`${base}/deals`} label="Deals" />
      <PageHeader title="New deal" description="The CEO approves it, and the commission rate is locked at that moment." />
      <Card className="p-4 sm:p-6">
        {clients.length === 0 ? (
          <EmptyState icon={Users} title="Add a client first">
            <LinkButton href={`${base}/clients/new`} size="sm" className="mt-3">
              <Plus /> Add client
            </LinkButton>
          </EmptyState>
        ) : (
          <DealForm clients={clients} services={services} months={dealMonths()} defaultClientId={clientId} />
        )}
      </Card>
    </div>
  );
}

export async function DealDetailView({ me, base, id }: Ctx & { id: string }) {
  const [d, services] = await Promise.all([getDeal(id), getServices(false)]);
  if (!d) notFound();
  const editable = d.status === "pending_approval" || d.status === "rejected";
  const left = d.type === "one_time" ? d.amount - d.collected : null;
  const earned = d.commission.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Back href={`${base}/deals`} label="Deals" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold sm:text-[32px]">{d.businessName ?? d.clientName}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {d.service} · {d.type === "monthly" ? "Monthly package" : "One-time project"}
          </p>
        </div>
        <StatusBadge status={d.status} />
      </div>

      {d.status === "rejected" && d.rejectionReason && (
        <p role="status" className="mb-5 rounded-[12px] bg-[var(--status-bad-bg)] px-4 py-3 text-[15px] text-[var(--status-bad-fg)]">
          <span className="font-semibold">Rejected:</span> {d.rejectionReason} Fix the deal below and resubmit it.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardBody className="pt-5">
              <p className="text-sm text-muted-foreground">{d.type === "monthly" ? "Monthly fee" : "Deal total"}</p>
              <p className="num font-display text-[28px] font-semibold">{formatPKR(d.amount)}</p>
              <dl className="mt-2 divide-y divide-border">
                {d.type === "monthly" && <Row label="Starts">{d.startMonth ? formatMonth(d.startMonth) : "—"}</Row>}
                {d.endMonth && <Row label="Ends">{formatMonth(d.endMonth)}</Row>}
                <Row label="Collected">
                  <span className="num">{formatPKR(d.collected)}</span>
                </Row>
                {left !== null && (
                  <Row label="Left to collect">
                    <span className="num">{formatPKR(left)}</span>
                  </Row>
                )}
                {d.newSaleRate !== null && (
                  <Row label={d.type === "monthly" ? "Rate (first month / later)" : "Commission rate"}>
                    <span className="num">
                      {formatRate(d.newSaleRate)}
                      {d.recurringRate !== null && ` / ${formatRate(d.recurringRate)}`}
                    </span>
                  </Row>
                )}
                <Row label="Commission earned">
                  <span className="num text-[var(--status-good-fg)]">{formatPKR(earned)}</span>
                </Row>
                {me.role === "ceo" && <Row label="Agent">{d.agentName}</Row>}
              </dl>
              {d.status === "approved" && d.agentId === me.id && (
                <LinkButton href={`${base}/payments/new`} className="mt-4 w-full">
                  <Plus /> Record a payment
                </LinkButton>
              )}
            </CardBody>
          </Card>
          {(d.status === "approved" || d.status === "pending_approval") && (
            <Card>
              <CardBody className="pt-5">
                <FollowUpForm dealId={d.id} value={d.nextFollowUpAt} />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Notes" />
            <CardBody className="space-y-4">
              <NotesPanel target={{ dealId: d.id }} />
              <NotesList notes={d.log} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-3">
          {editable && (
            <Card>
              <CardHeader title={d.status === "rejected" ? "Fix and resubmit" : "Edit while waiting for approval"} />
              <CardBody>
                <DealForm
                  clients={[{ id: d.clientId, label: d.businessName ?? d.clientName }]}
                  services={services.filter((s) => s.isActive || s.id === d.serviceId)}
                  months={dealMonths()}
                  deal={{
                    id: d.id,
                    clientId: d.clientId,
                    serviceId: d.serviceId,
                    dealType: d.type,
                    amount: String(d.amount),
                    startMonth: d.startMonth ?? undefined,
                    description: d.description ?? "",
                    nextFollowUpAt: toKarachiLocal(d.nextFollowUpAt),
                  }}
                />
              </CardBody>
            </Card>
          )}
          {!editable && d.description && (
            <Card>
              <CardHeader title="What was sold" />
              <CardBody>
                <p className="text-[15px] whitespace-pre-wrap">{d.description}</p>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Payments" />
            {d.payments.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No payments yet" />
            ) : (
              <ul className="divide-y divide-border">
                {d.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.isRefund ? "Refund" : formatDate(p.paidOn)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.billingMonth ? `For ${formatMonth(p.billingMonth, true)}` : formatDate(p.paidOn)}
                        {p.rejectionReason && ` · ${p.rejectionReason}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-sm font-semibold">{formatPKR(p.amount)}</p>
                      <StatusBadge status={p.status} className="mt-1" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function DealsListView({ base, deals }: Ctx & { deals: import("@/lib/data/types").DealRow[] }) {
  const groups: [string, typeof deals][] = [
    ["Waiting for approval", deals.filter((d) => d.status === "pending_approval")],
    ["Rejected: fix and resubmit", deals.filter((d) => d.status === "rejected")],
    ["Active", deals.filter((d) => d.status === "approved")],
    ["Closed", deals.filter((d) => d.status === "completed" || d.status === "cancelled")],
  ];
  return (
    <>
      <PageHeader
        title="Deals"
        description={`${deals.length} deal${deals.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href={`${base}/deals/new`}>
            <Plus /> New deal
          </LinkButton>
        }
      />
      {deals.length === 0 ? (
        <Card>
          <EmptyState icon={Briefcase} title="No deals yet">
            Convert a lead or open a client to create a deal.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups
            .filter(([, list]) => list.length > 0)
            .map(([title, list]) => (
              <section key={title}>
                <h2 className="mb-2 font-display text-[16px] font-semibold text-muted-foreground">{title}</h2>
                <Card>
                  <ul className="divide-y divide-border">
                    {list.map((d) => (
                      <li key={d.id}>
                        <Link href={`${base}/deals/${d.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{d.businessName ?? d.clientName}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {d.service} · {formatDate(d.createdAt)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="num text-sm font-semibold">
                              {formatPKR(d.amount)}
                              {d.type === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
                            </p>
                            <StatusBadge status={d.status} className="mt-1" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
