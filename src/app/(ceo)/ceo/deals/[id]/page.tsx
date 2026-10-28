import type { Metadata } from "next";
import { DealAdminActions } from "@/components/ceo-admin-forms";
import { DealDetailView } from "@/components/sales-views";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireCeo } from "@/lib/auth";
import { getDeal } from "@/lib/data/sales";
import { addMonths, currentMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Deal" };

export default async function CeoDealPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireCeo();
  const { id } = await params;
  const d = await getDeal(id);
  const months = d?.startMonth ? Array.from({ length: 36 }, (_, i) => addMonths(d.startMonth!, i)).filter((m) => m >= addMonths(currentMonth(), -12)) : [];
  return (
    <div className="space-y-6">
      <DealDetailView me={me} base="/ceo/my-sales" id={id} />
      {d && d.status === "approved" && (
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader title="Manage deal (CEO)" />
            <CardBody>
              <DealAdminActions dealId={d.id} type={d.type} status={d.status} endMonth={d.endMonth} months={months} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
