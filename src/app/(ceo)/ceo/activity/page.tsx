import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity log" };

const ENTITY: Record<string, string> = {
  deals: "Deal",
  client_payments: "Payment",
  commission_entries: "Commission",
  commission_periods: "Month",
  commission_payouts: "Payout",
  commission_tiers: "Rate",
  agent_applications: "Application",
  profiles: "Account",
  clients: "Client",
  leads: "Lead",
  services: "Service",
  app_settings: "Setting",
  agent_targets: "Target",
  policy_acceptances: "Policy",
};
const ACTION: Record<string, string> = {
  created: "created",
  updated: "updated",
  approved: "approved",
  rejected: "rejected",
  pending_approval: "sent for approval",
  pending_verification: "waiting for verification",
  verified: "verified",
  cancelled: "cancelled",
  completed: "completed",
  locked: "locked",
  reassigned: "reassigned",
  activated: "activated",
  deactivated: "deactivated",
  pending: "received",
};
const FILTERS: [string, string][] = [
  ["", "All"],
  ["deals", "Deals"],
  ["client_payments", "Payments"],
  ["commission_payouts", "Payouts"],
  ["commission_periods", "Months"],
  ["commission_tiers", "Rates"],
  ["clients", "Reassignments"],
  ["agent_applications", "Applications"],
  ["policy_acceptances", "Policy"],
];

function linkFor(type: string, id: string | null, after: Record<string, unknown> | null): string | null {
  if (!id) return null;
  if (type === "deals") return `/ceo/deals/${id}`;
  if (type === "client_payments") return `/ceo/payments/${id}`;
  if (type === "profiles") return `/ceo/agents/${id}`;
  if (type === "commission_payouts" || type === "commission_periods") return after?.agent_id ? `/ceo/agents/${after.agent_id}` : null;
  return null;
}

function summary(type: string, after: Record<string, unknown> | null): string {
  if (!after) return "";
  const rs = (v: unknown) => `Rs ${Number(v).toLocaleString("en-US")}`;
  if (type === "deals") return after.deal_type === "monthly" ? `${rs(after.monthly_fee_pkr)}/month` : rs(after.total_amount_pkr);
  if (type === "client_payments" || type === "commission_payouts") return rs(after.amount_pkr);
  if (type === "commission_entries") return `${rs(after.amount_pkr)} · ${after.description ?? ""}`;
  if (type === "commission_periods") return `${String(after.month).slice(0, 7)} · ${rs(after.commission_amount_pkr)}`;
  if (type === "commission_tiers") return `${after.kind} ${after.rate_percent}% from ${after.effective_from}`;
  if (type === "agent_applications" || type === "profiles") return String(after.full_name ?? "");
  if (type === "policy_acceptances") return `${after.typed_name} · version ${after.policy_version}`;
  if (type === "services") return String(after.name ?? "");
  return "";
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireCeo();
  const { type = "" } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("activity_log")
    .select("id, action, entity_type, entity_id, after, created_at, actor:profiles!activity_log_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (type) q = q.eq("entity_type", type);
  const { data } = await q;

  return (
    <>
      <PageHeader title="Activity log" description="Every approval, verification, payout, lock, rate change and reassignment. It can't be edited." />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map(([v, label]) => (
          <Link
            key={v}
            href={v ? `/ceo/activity?type=${v}` : "/ceo/activity"}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              type === v ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <Card>
        {(data ?? []).length === 0 ? (
          <EmptyState icon={Activity} title="Nothing here yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((r) => {
              const after = r.after as Record<string, unknown> | null;
              const verb = ACTION[r.action.split(".").pop() ?? ""] ?? r.action.split(".").pop();
              const href = linkFor(r.entity_type, r.entity_id, after);
              const actor = (r.actor as unknown as { full_name: string } | null)?.full_name ?? "System";
              const text = (
                <>
                  <p className="text-[15px]">
                    <span className="font-medium">{ENTITY[r.entity_type] ?? r.entity_type}</span> {verb}
                    <span className="text-muted-foreground"> · {summary(r.entity_type, after)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {actor} · {formatDateTime(r.created_at)}
                  </p>
                </>
              );
              return (
                <li key={r.id}>
                  {href ? (
                    <Link href={href} className="block px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                      {text}
                    </Link>
                  ) : (
                    <div className="px-4 py-3 sm:px-6">{text}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
