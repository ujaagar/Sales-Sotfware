import type { Metadata } from "next";
import { ClientsListView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Clients" };

export default async function Page() {
  const me = await requireSeller();
  return <ClientsListView me={me} base="" />;
}
