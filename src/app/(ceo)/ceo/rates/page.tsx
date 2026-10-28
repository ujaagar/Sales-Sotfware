import type { Metadata } from "next";
import { RatesEditor } from "@/components/ceo-admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { slabLabel, tiersInEffect } from "@/lib/commission";
import { getTiersLive } from "@/lib/data/live";
import { formatDate, formatRate, karachiDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rates & targets" };

export default async function RatesPage() {
  await requireCeo();
  const tiers = await getTiersLive();
  const today = karachiDate();
  const ns = tiersInEffect(tiers, "new_sale", today);
  const rec = tiersInEffect(tiers, "recurring", today);
  const upcoming = [...new Set(tiers.filter((t) => t.effectiveFrom > today).map((t) => t.effectiveFrom))].sort();
  const history = [...new Set(tiers.map((t) => t.effectiveFrom))].sort().reverse();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Commission rates"
        description="The rate is chosen by deal size and locked when you approve a deal. Changing rates never affects deals already approved."
      />
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        {[
          ["New sale (one-time deals, first month of monthly)", ns],
          ["Monthly (every later month)", rec],
        ].map(([title, list]) => (
          <Card key={title as string}>
            <CardHeader title={title as string} description={`In force since ${formatDate((list as typeof ns)[0]?.effectiveFrom)}`} />
            <ul className="divide-y divide-border">
              {(list as typeof ns).map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-[15px] sm:px-6">
                  <span>{slabLabel(t)}</span>
                  <span className="num font-semibold">{formatRate(t.rate)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {upcoming.length > 0 && (
        <p className="mb-6 rounded-[12px] bg-accent-soft px-4 py-3 text-sm text-accent-foreground">
          New rates start on {upcoming.map((d) => formatDate(d)).join(", ")}.
        </p>
      )}
      <Card>
        <CardHeader title="Change rates" description="Saves a new rate set from the date you choose. The old set stays on record." />
        <CardBody>
          <RatesEditor
            newSale={ns.map((t) => ({ min: t.min, max: t.max, rate: t.rate }))}
            recurring={rec.map((t) => ({ min: t.min, max: t.max, rate: t.rate }))}
          />
        </CardBody>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        Rate history: {history.map((d) => formatDate(d)).join(" · ")}. Monthly targets are set per agent on each agent&apos;s page.
      </p>
    </div>
  );
}
