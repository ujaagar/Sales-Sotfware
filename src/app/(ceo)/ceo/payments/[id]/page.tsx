/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ImageOff } from "lucide-react";
import { rejectPayment, verifyPayment } from "@/app/actions/ceo";
import { ReviewActions } from "@/components/approval-actions";
import { RefundForm } from "@/components/ceo-admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getPaymentDetail } from "@/lib/data";
import { formatDate, formatDateTime, formatMonth, formatPKR, formatRate } from "@/lib/format";

export const metadata: Metadata = { title: "Verify payment" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCeo();
  const p = await getPaymentDetail((await params).id);
  if (!p) notFound();
  const remaining = p.dealType === "one_time" ? p.dealAmount - p.dealCollected : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/ceo/payments" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Payment verification
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="num text-[26px] leading-tight font-semibold sm:text-[32px]">{formatPKR(p.amount)}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {p.clientName} · {p.service}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Receipt" />
          {p.proofUrl ? (
            p.proofIsPdf ? (
              <CardBody>
                <a
                  href={p.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[12px] border border-border p-4 font-medium text-accent-foreground hover:bg-muted"
                >
                  <FileText className="size-5" /> Open the PDF receipt
                </a>
              </CardBody>
            ) : (
              <a href={p.proofUrl} target="_blank" rel="noreferrer" className="block bg-muted">
                <img src={p.proofUrl} alt={`Receipt for ${formatPKR(p.amount)}`} className="max-h-[520px] w-full object-contain" />
              </a>
            )
          ) : (
            <CardBody className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageOff className="size-5" /> No receipt preview (sample data).
            </CardBody>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Payment" />
            <CardBody>
              <dl className="divide-y divide-border">
                <Row label="Agent">{p.agentName}</Row>
                <Row label="Paid on">{formatDate(p.paidOn)}</Row>
                {p.billingMonth && <Row label="For month">{formatMonth(p.billingMonth)}</Row>}
                <Row label="Method">{p.method}</Row>
                <Row label="Recorded">{formatDateTime(p.createdAt)}</Row>
                {p.note && <Row label="Note">{p.note}</Row>}
                <Row label={p.dealType === "monthly" ? "Monthly fee" : "Deal total"}>
                  <span className="num">{formatPKR(p.dealAmount)}</span>
                </Row>
                {remaining !== null && (
                  <Row label="Left on deal (before this)">
                    <span className="num">{formatPKR(remaining)}</span>
                  </Row>
                )}
              </dl>
            </CardBody>
          </Card>

          {p.commission && (
            <Card>
              <CardBody className="pt-5">
                <div className="rounded-[12px] bg-[var(--status-good-bg)] p-4 text-[var(--status-good-fg)]">
                  <p className="text-sm font-medium">Verifying adds commission for {p.commission.agentName}</p>
                  <p className="num mt-1 font-display text-[22px] font-semibold">
                    {formatPKR(p.commission.amount)}{" "}
                    <span className="text-sm font-normal">
                      ({formatRate(p.commission.rate)} {p.commission.kind === "recurring" ? "monthly" : "new sale"}, locked on the deal)
                    </span>
                  </p>
                  {p.commission.note && <p className="mt-1 text-xs">{p.commission.note}</p>}
                </div>
              </CardBody>
            </Card>
          )}

          {p.status === "verified" && (
            <Card>
              <CardHeader title="Refund" description="If the client got money back. The commission on it is taken back." />
              <CardBody>
                <RefundForm paymentId={p.id} max={p.amount} />
              </CardBody>
            </Card>
          )}

          {p.status === "pending_verification" && (
            <Card className="p-4 sm:p-6">
              <ReviewActions
                approveLabel="Verify payment"
                rejectLabel="Reject payment"
                okMessage="Payment verified. Commission added."
                previewMessage="Preview: nothing was saved."
                backHref="/ceo/payments"
                onApprove={verifyPayment.bind(null, p.id)}
                onReject={rejectPayment.bind(null, p.id)}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
