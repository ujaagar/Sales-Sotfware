import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { ReviewActions } from "@/components/approval-actions";
import { approveDeal, rejectDeal } from "@/app/actions/ceo";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getApproval } from "@/lib/data";
import { formatDate, formatMonth, formatPKR, formatRate } from "@/lib/format";

export const metadata: Metadata = { title: "Approve deal" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCeo();
  const deal = await getApproval((await params).id);
  if (!deal) notFound();
  if (deal.status !== "pending_approval") redirect(`/ceo/deals/${deal.id}`);
  const monthly = deal.type === "monthly";
  const rateText = monthly ? `${formatRate(deal.newSaleRate)} first month, ${formatRate(deal.recurringRate)} after` : formatRate(deal.newSaleRate);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/ceo/approvals" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Deal approvals
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold sm:text-[32px]">{deal.businessName ?? deal.clientName}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {deal.service} · submitted {formatDate(deal.createdAt)}
          </p>
        </div>
        <StatusBadge status={deal.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="space-y-5 md:col-span-3">
          {/* The commission panel: slab and rate right next to the amount */}
          <Card className="overflow-hidden">
            <div className="bg-midnight p-5 text-white sm:p-6">
              <p className="text-sm text-[#c9d3e6]">{monthly ? "Monthly fee" : "Deal total"}</p>
              <p className="num mt-1 font-display text-[32px] leading-tight font-semibold">
                {formatPKR(deal.amount)}
                {monthly && <span className="text-lg font-normal text-[#c9d3e6]">/month</span>}
              </p>
              <p className="mt-1 text-sm text-[#c9d3e6]">
                {monthly ? `Monthly package from ${formatMonth(deal.startMonth!)}` : "One-time project"}
              </p>
            </div>
            <CardBody className="pt-5">
              <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold">
                <Lock className="size-4 text-accent" aria-hidden /> Commission that will be locked
              </h2>
              <dl className="mt-2 divide-y divide-border">
                <Row label="New-sale slab">{deal.slabLabel}</Row>
                <Row label={monthly ? "Rate, first month" : "Rate"}>
                  <span className="num">{formatRate(deal.newSaleRate)}</span>
                </Row>
                {monthly && (
                  <>
                    <Row label="Monthly slab">{deal.recurringSlabLabel}</Row>
                    <Row label="Rate, later months">
                      <span className="num">{formatRate(deal.recurringRate)}</span>
                    </Row>
                  </>
                )}
              </dl>
              <div className="mt-3 rounded-[12px] bg-[var(--status-good-bg)] p-4 text-[var(--status-good-fg)]">
                <p className="text-sm font-medium">Agent will earn</p>
                {monthly ? (
                  <p className="num mt-1 font-display text-[20px] font-semibold">
                    {formatPKR(deal.expected.firstMonth)} <span className="text-sm font-normal">first month</span>, then{" "}
                    {formatPKR(deal.expected.laterMonths)} <span className="text-sm font-normal">each month</span>
                  </p>
                ) : (
                  <p className="num mt-1 font-display text-[20px] font-semibold">
                    {formatPKR(deal.expected.total)} <span className="text-sm font-normal">when fully paid</span>
                  </p>
                )}
                <p className="mt-1 text-xs opacity-90">Paid as each client payment is verified. Later rate changes won&apos;t affect this deal.</p>
              </div>
            </CardBody>
          </Card>

          {deal.status === "pending_approval" && (
          <Card className="p-4 sm:p-6">
            <ReviewActions
              approveLabel="Approve and lock rate"
              rejectLabel="Reject deal"
              okMessage={`Deal approved. ${rateText} is locked on it.`}
              previewMessage="Preview: nothing was saved."
              backHref="/ceo/approvals"
              onApprove={approveDeal.bind(null, deal.id)}
              onReject={rejectDeal.bind(null, deal.id)}
            />
          </Card>
          )}
        </div>

        <div className="space-y-5 md:col-span-2">
          <Card>
            <CardHeader title="Agent" />
            <CardBody className="flex items-center gap-3">
              <Avatar name={deal.agentName} className="size-11" />
              <div className="min-w-0">
                <p className="truncate font-medium">{deal.agentName}</p>
                <p className="truncate text-sm text-muted-foreground">{deal.agentEmail}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Client" />
            <CardBody>
              <dl className="divide-y divide-border">
                <Row label="Name">{deal.clientName}</Row>
                <Row label="Business">{deal.businessName ?? "—"}</Row>
                <Row label="Phone">
                  <a href={`tel:${deal.clientPhone}`} className="num text-accent-foreground hover:underline">
                    {deal.clientPhone}
                  </a>
                </Row>
              </dl>
            </CardBody>
          </Card>
          {deal.description && (
            <Card>
              <CardHeader title="What was sold" />
              <CardBody>
                <p className="text-[15px] leading-relaxed">{deal.description}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
