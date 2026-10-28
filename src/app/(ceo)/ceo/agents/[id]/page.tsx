import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { ReassignForm, TargetForm } from "@/components/ceo-admin-forms";
import { LedgerView } from "@/components/ledger-view";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { getActiveAgents } from "@/lib/data/ceo";
import { getLedger } from "@/lib/data/ledger";
import { listClients } from "@/lib/data/sales";
import { currentMonth, formatMonth, formatPKR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCeo();
  const { id } = await params;
  const supabase = await createClient();
  const month = currentMonth();
  const [ledger, clients, agents, { data: target }] = await Promise.all([
    getLedger(id),
    listClients(id),
    getActiveAgents(),
    supabase.from("agent_targets").select("target_amount_pkr").eq("agent_id", id).eq("month", month).maybeSingle(),
  ]);
  if (!ledger) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/ceo/agents" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Agents
      </Link>
      <PageHeader title={ledger.agent.name} description={`${ledger.agent.email}${ledger.agent.cnic ? ` · CNIC ${ledger.agent.cnic}` : ""}`} />

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Target for ${formatMonth(month)}`} description="Policy minimum: Rs 50,000 in verified payments a month. Leave a custom target per agent here." />
          <CardBody>
            <TargetForm agentId={id} month={month} current={target ? Number(target.target_amount_pkr) : null} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Clients" description="Reassign moves the client and open deals. Earned commission stays." />
          {clients.length === 0 ? (
            <EmptyState icon={Users} title="No clients" />
          ) : (
            <ul className="divide-y divide-border">
              {clients.map((c) => (
                <li key={c.id} className="space-y-2 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.businessName ?? c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.activeDeals} active deal{c.activeDeals === 1 ? "" : "s"} · collected <span className="num">{formatPKR(c.collected)}</span>
                      </p>
                    </div>
                  </div>
                  {agents.length > 1 && <ReassignForm clientId={c.id} agents={agents} ownerId={id} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <LedgerView ledger={ledger} statementQuery={`&agent=${id}`} />
    </div>
  );
}
