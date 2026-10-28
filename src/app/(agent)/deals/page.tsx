import type { Metadata } from "next";
import { DealsListView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";
import { getDeals } from "@/lib/data";

export const metadata: Metadata = { title: "Deals" };

export default async function Page() {
  const me = await requireSeller();
  // Own deals only (the CEO's My Sales too).
  const deals = await getDeals({ ...me, role: "agent" });
  return <DealsListView me={me} base="" deals={deals} />;
}
