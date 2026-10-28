import type { Metadata } from "next";
import { DealNewView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "New deal" };

export default async function Page({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const me = await requireSeller();
  return <DealNewView me={me} base="" clientId={(await searchParams).client} />;
}
