import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getCeoDashboard } from "@/lib/data";
import { formatDate, formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "Deal approvals" };

export default async function ApprovalsPage() {
  await requireCeo();
  const { approvals } = await getCeoDashboard();
  return (
    <>
      <PageHeader title="Deal approvals" description="Approving a deal locks its commission rate." />
      <Card>
        {approvals.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Nothing to approve">
            New deals from agents appear here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {approvals.map((a) => (
              <li key={a.id}>
                <Link href={`/ceo/approvals/${a.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.businessName ?? a.clientName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.agentName} · {a.service} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-sm font-semibold">
                      {formatPKR(a.amount)}
                      {a.type === "monthly" && <span className="font-normal text-muted-foreground">/mo</span>}
                    </p>
                    <StatusBadge status={a.status} className="mt-1" />
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
