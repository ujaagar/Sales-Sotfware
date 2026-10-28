import type { Metadata } from "next";
import { LeadDetailView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Lead" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSeller();
  return <LeadDetailView me={me} base="/ceo/my-sales" id={(await params).id} />;
}
