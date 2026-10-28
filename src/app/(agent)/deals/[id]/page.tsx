import type { Metadata } from "next";
import { DealDetailView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Deal" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSeller();
  return <DealDetailView me={me} base="" id={(await params).id} />;
}
