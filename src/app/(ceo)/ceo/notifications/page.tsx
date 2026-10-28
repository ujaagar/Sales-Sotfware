import type { Metadata } from "next";
import { NotificationsList } from "@/components/notifications-list";
import { requireCeo } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  await requireCeo();
  return <NotificationsList />;
}
