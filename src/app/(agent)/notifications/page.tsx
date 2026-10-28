import type { Metadata } from "next";
import { NotificationsList } from "@/components/notifications-list";
import { requireAgent } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  await requireAgent();
  return <NotificationsList />;
}
