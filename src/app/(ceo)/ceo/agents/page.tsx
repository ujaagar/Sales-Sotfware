import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { AddAgentForm } from "@/components/add-agent-form";
import { AgentActions } from "@/components/agent-actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { addMonths, currentMonth, formatDate, formatPKR } from "@/lib/format";
import { inviteStatus } from "@/lib/invites";
import { CURRENT_POLICY_VERSION } from "@/lib/policy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage() {
  await requireCeo();
  const supabase = await createClient();
  const month = currentMonth();
  const [{ data: agents }, { data: pays }, { data: periods }, { data: accepted }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, whatsapp, city, is_active, created_at").eq("role", "agent").order("is_active", { ascending: false }).order("full_name"),
    supabase.from("client_payments").select("agent_id, amount_pkr").eq("status", "verified").gte("paid_on", month).lt("paid_on", addMonths(month, 1)),
    supabase.from("commission_periods").select("agent_id, commission_amount_pkr"),
    supabase.from("policy_acceptances").select("agent_id, accepted_at").eq("policy_version", CURRENT_POLICY_VERSION),
  ]);
  const acceptedAt = new Map((accepted ?? []).map((r) => [r.agent_id, r.accepted_at]));
  const list = agents ?? [];
  const invites = await inviteStatus(list.map((a) => a.id));
  const collected = new Map<string, number>();
  for (const p of pays ?? []) collected.set(p.agent_id, (collected.get(p.agent_id) ?? 0) + Number(p.amount_pkr));
  const earned = new Map<string, number>();
  for (const p of periods ?? []) earned.set(p.agent_id, (earned.get(p.agent_id) ?? 0) + Number(p.commission_amount_pkr));

  return (
    <>
      <PageHeader title="Agents" description={`${list.filter((a) => a.is_active).length} active · ${list.length} total`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {list.length === 0 ? (
            <Card>
              <EmptyState icon={Users} title="No agents yet">
                Approve an application or add an agent here.
              </EmptyState>
            </Card>
          ) : (
            list.map((a) => {
              const inv = invites.get(a.id);
              const waiting = inv && inv.state !== "used";
              return (
                <Card key={a.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={a.full_name} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/ceo/agents/${a.id}`} className="font-display text-[17px] font-semibold hover:underline">
                          {a.full_name}
                        </Link>
                        {!a.is_active ? (
                          <StatusBadge status="cancelled" label="Inactive" />
                        ) : waiting ? (
                          <StatusBadge status="pending" label={inv.state === "expired" ? "Invite expired" : "Invite sent"} />
                        ) : (
                          <StatusBadge status="approved" label="Active" />
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.email} · {a.phone ?? "no phone"}
                        {a.city && ` · ${a.city}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This month <span className="num font-medium text-foreground">{formatPKR(collected.get(a.id) ?? 0)}</span> · commission earned{" "}
                        <span className="num font-medium text-foreground">{formatPKR(earned.get(a.id) ?? 0)}</span> · joined {formatDate(a.created_at)}
                      </p>
                      <p className="mt-1 text-sm">
                        {acceptedAt.has(a.id) ? (
                          <span className="text-[var(--status-good-fg)]">✓ Accepted the Sales Agent Policy on {formatDate(acceptedAt.get(a.id))}</span>
                        ) : (
                          <span className="text-[var(--status-pending-fg)]">Has not accepted the Sales Agent Policy yet</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AgentActions id={a.id} name={a.full_name} active={a.is_active} needsInvite={!!waiting} />
                  </div>
                </Card>
              );
            })
          )}
        </div>
        <Card className="self-start lg:col-span-2">
          <CardHeader title="Add an agent" description="Creates their account and a 7-day link to set a password." />
          <CardBody>
            <AddAgentForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
