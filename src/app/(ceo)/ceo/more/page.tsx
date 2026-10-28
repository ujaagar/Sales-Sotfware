import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Percent,
  Settings,
  ShoppingBag,
  Tags,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { getCeoDashboard } from "@/lib/data";

export const metadata: Metadata = { title: "More" };

export default async function CeoMorePage() {
  await requireCeo();
  const d = await getCeoDashboard();
  const links = [
    { href: "/ceo/applications", label: "Agent applications", icon: UserPlus, badge: d.pendingApplications },
    { href: "/ceo/agents", label: "Agents", icon: Users },
    { href: "/ceo/rates", label: "Rates & targets", icon: Percent },
    { href: "/ceo/months", label: "Month locking", icon: CalendarCheck },
    { href: "/ceo/payouts", label: "Payouts", icon: Wallet },
    { href: "/ceo/reports", label: "Reports", icon: BarChart3 },
    { href: "/ceo/activity", label: "Activity log", icon: Activity },
    { href: "/ceo/my-sales", label: "My Sales", icon: ShoppingBag },
    { href: "/ceo/services", label: "Services", icon: Tags },
    { href: "/ceo/settings", label: "Settings", icon: Settings },
  ];
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="More" />
      <Card>
        <ul className="divide-y divide-border">
          {links.map(({ href, label, icon: Icon, badge }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                {!!badge && (
                  <span className="num rounded-full bg-[var(--status-pending-bg)] px-2 text-xs leading-5 font-semibold text-[var(--status-pending-fg)]">
                    {badge}
                  </span>
                )}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <LogoutButton />
          </li>
        </ul>
      </Card>
    </div>
  );
}
