import "server-only";
import { cache } from "react";
import { isPreview } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type NotificationRow = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

export const getUnreadCount = cache(async (): Promise<number> => {
  if (isPreview) return 2;
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
});

export async function getNotifications(limit = 60): Promise<NotificationRow[]> {
  if (isPreview) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.read_at, createdAt: n.created_at }));
}
