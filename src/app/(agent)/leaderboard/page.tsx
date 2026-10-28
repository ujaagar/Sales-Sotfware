import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, PageHeader, Progress } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import { currentMonth, formatMonth, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const me = await requireAgent();
  const rows = await getLeaderboard(me);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Leaderboard" description={`Verified payments collected · ${formatMonth(currentMonth())}`} />
      <Card>
        <ol className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.agentId} className={cn("flex items-center gap-3 px-4 py-4 sm:px-6", r.isMe && "bg-accent-soft/60")}>
              <span
                className={cn(
                  "num flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold",
                  r.rank === 1 ? "bg-midnight text-white dark:bg-white dark:text-midnight" : "bg-muted text-muted-foreground",
                )}
              >
                {r.rank === 1 ? <Trophy className="size-4" aria-label="1st" /> : r.rank}
              </span>
              <Avatar name={r.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.name}
                  {r.isMe && <span className="ml-1.5 text-sm font-normal text-muted-foreground">(you)</span>}
                </p>
                <Progress value={r.sharePercent} label={`${r.name} compared with the top agent`} className="mt-2" />
              </div>
              <span className="num w-28 shrink-0 text-right text-sm font-semibold">
                {r.collected !== null ? formatPKR(r.collected) : <span className="sr-only">Amount hidden</span>}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <p className="mt-3 text-sm text-muted-foreground">You see your own amount. Others are shown as a bar compared with the top agent.</p>
    </div>
  );
}
