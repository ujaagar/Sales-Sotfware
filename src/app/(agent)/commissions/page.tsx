import type { Metadata } from "next";
import { LedgerView } from "@/components/ledger-view";
import { PageHeader } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { getLedger } from "@/lib/data/ledger";

export const metadata: Metadata = { title: "Commission" };

export default async function CommissionsPage() {
  const me = await requireAgent();
  const ledger = await getLedger(me.id);
  return (
    <>
      <PageHeader title="Commission" description="Earned on every payment the CEO verifies, at the rate locked on the deal." />
      {ledger && <LedgerView ledger={ledger} />}
    </>
  );
}
