import type { Metadata } from "next";
import { LeadNewView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Add lead" };

export default async function Page() {
  const me = await requireSeller();
  return <LeadNewView me={me} base="/ceo/my-sales" />;
}
