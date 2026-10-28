import type { Metadata } from "next";
import { AddServiceForm, ServiceRowActions } from "@/components/ceo-admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCeo } from "@/lib/auth";
import { getServices } from "@/lib/data/sales";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  await requireCeo();
  const services = await getServices(false);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Services" description="What agents can sell. Turned-off services stay on old deals but can't be picked for new ones." />
      <Card className="mb-5">
        <CardHeader title="Add a service" />
        <CardBody>
          <AddServiceForm />
        </CardBody>
      </Card>
      <Card>
        <ul className="divide-y divide-border">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <span className="min-w-0 flex-1 font-medium">{s.name}</span>
              <StatusBadge status={s.isActive ? "approved" : "cancelled"} label={s.isActive ? "On" : "Off"} />
              <ServiceRowActions id={s.id} name={s.name} active={s.isActive} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
