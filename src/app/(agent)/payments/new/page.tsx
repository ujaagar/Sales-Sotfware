import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { RecordPaymentForm } from "@/components/record-payment-form";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { getDeals } from "@/lib/data";
import { addMonths, currentMonth, karachiDate } from "@/lib/format";

export const metadata: Metadata = { title: "Record payment" };

export default async function RecordPaymentPage() {
  const me = await requireAgent();
  const deals = (await getDeals(me)).filter((d) => d.status === "approved");
  const options = deals.map((d) => ({
    id: d.id,
    label: `${d.businessName ?? d.clientName} · ${d.service}`,
    type: d.type,
    amount: d.amount,
    remaining: d.type === "one_time" ? Math.max(0, d.amount - d.collected) : null,
    // Months this package can be paid for: this month first, then earlier months back to the start, then next month.
    months:
      d.type === "monthly" && d.startMonth
        ? [...Array.from({ length: 24 }, (_, i) => addMonths(currentMonth(), -i)), addMonths(currentMonth(), 1)].filter(
            (m) => m >= d.startMonth!,
          )
        : [],
  }));

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Record payment" description="The CEO checks it, then your commission is added." />
      {options.length === 0 ? (
        <Card>
          <EmptyState icon={Briefcase} title="No approved deals yet">
            You can record payments once the CEO approves one of your deals.
          </EmptyState>
        </Card>
      ) : (
        <Card className="p-4 sm:p-6">
          <RecordPaymentForm deals={options} today={karachiDate()} />
        </Card>
      )}
    </div>
  );
}
