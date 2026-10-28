import Link from "next/link";
import { Bell } from "lucide-react";
import { MarkAllRead } from "@/components/account-views";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getNotifications } from "@/lib/data/notifications";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function NotificationsList() {
  const items = await getNotifications();
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : "All caught up"} actions={unread > 0 ? <MarkAllRead /> : undefined} />
      <Card>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/api/notifications/${n.id}`}
                  prefetch={false}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:px-6"
                >
                  <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[15px]", !n.readAt && "font-semibold")}>
                      {n.title}
                      {!n.readAt && <span className="sr-only"> (unread)</span>}
                    </p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
