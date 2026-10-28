import type { Metadata } from "next";
import { ClientNewView } from "@/components/sales-views";
import { requireSeller } from "@/lib/auth";

export const metadata: Metadata = { title: "Add client" };

export default async function Page() {
  const me = await requireSeller();
  return <ClientNewView me={me} base="" />;
}
