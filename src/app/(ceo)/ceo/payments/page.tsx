import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getCeoDashboard } from "@/lib/data";
import { formatDate, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Payment verification" };

export default async function PaymentsQueuePage() {
  await requireCeo();
  const { verifications } = await getCeoDashboard();
  return (
    <>
      <PageHeader title="Payment verification" description="Check the receipt. Verifying adds the agent's commission." />
      <Card>
        {verifications.length === 0 ? (
          <EmptyState icon={Receipt} title="Nothing to verify">
            Payments agents record appear here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {verifications.map((p) => (
              <li key={p.id}>
                <Link href={`/ceo/payments/${p.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.agentName} · {formatDate(p.paidOn)} · {p.method}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-sm font-semibold">{formatPKR(p.amount)}</p>
                    <StatusBadge status={p.status} className="mt-1" />
                  </div>
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
