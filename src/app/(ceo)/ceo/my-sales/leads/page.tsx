import type { Metadata } from "next";
import { LeadsListView } from "@/components/leads-list-view";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Leads" };

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const me = await requireSeller();
  return <LeadsListView me={me} base="/ceo/my-sales" sp={await searchParams} />;
}
