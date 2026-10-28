import type { Metadata } from "next";
import { ClientDetailView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Client" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSeller();
  return <ClientDetailView me={me} base="" id={(await params).id} />;
}
