import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, ChevronRight, Plus, Receipt, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { getDeals } from "@/lib/data";
import { listClients } from "@/lib/data/sales";
import { formatPKR } from "@/lib/format";

export const metadata: Metadata = { title: "My Sales" };

export default async function MySalesPage() {
  const me = await requireCeo();
  const [deals, clients] = await Promise.all([getDeals({ ...me, role: "agent" }), listClients(me.id)]);
  const collected = clients.reduce((s, c) => s + c.collected, 0);
  const links = [
    { href: "/ceo/my-sales/leads", label: "My leads", icon: Users },
    { href: "/ceo/my-sales/clients", label: "My clients", icon: Users },
    { href: "/ceo/my-sales/deals", label: "My deals", icon: Briefcase },
    { href: "/ceo/my-sales/payments/new", label: "Record a payment", icon: Receipt },
  ];
  return (
    <>
      <PageHeader
        title="My Sales"
        description="Your own sales. They count in company totals but earn no commission."
        actions={
          <LinkButton href="/ceo/my-sales/leads/new">
            <Plus /> Add lead
          </LinkButton>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Clients" value={clients.length} />
        <StatTile label="Active deals" value={deals.filter((d) => d.status === "approved").length} />
        <StatTile label="Collected (all time)" value={formatPKR(collected)} />
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
