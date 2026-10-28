import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Mark } from "@/components/brand/logo";
import { PreviewBanner } from "@/components/preview-banner";
import { TabBar, TopLink, type NavItem } from "@/components/shell/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data/notifications";

const DESKTOP: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/leads", label: "Leads", icon: "users" },
  { href: "/clients", label: "Clients", icon: "users" },
  { href: "/deals", label: "Deals", icon: "briefcase" },
  { href: "/commissions", label: "Commission", icon: "grid" },
  { href: "/leaderboard", label: "Leaderboard", icon: "grid" },
  { href: "/policy", label: "Policy", icon: "grid" },
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAgent();
  const unread = await getUnreadCount();

  const tabs: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: "home" },
    { href: "/leads", label: "Leads", icon: "users" },
    { href: "/deals", label: "Deals", icon: "briefcase" },
    { href: "/more", label: "More", icon: "grid" },
  ];

  return (
    <div className="min-h-dvh">
      <PreviewBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 md:h-16 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Mark className="size-8" />
            <span className="font-display text-[15px] font-semibold">Ujaagar Sales</span>
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center md:flex">
            {DESKTOP.map((i) => (
              <TopLink key={i.href} item={i} />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LinkButton href="/payments/new" size="sm" className="mr-2 hidden md:inline-flex">
              <Plus /> Record payment
            </LinkButton>
            <Link
              href="/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className="relative inline-flex size-11 items-center justify-center rounded-[12px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="size-5" />
              {unread > 0 && <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent ring-2 ring-card" />}
            </Link>
            <ThemeToggle />
            <LogoutButton variant="icon" className="hidden md:block" />
            <Link href="/profile" aria-label="Your profile" className="ml-1 hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:block">
              <Avatar name={me.name} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pt-5 pb-28 md:px-6 md:pt-8 md:pb-12">{children}</main>

      <TabBar items={tabs} primary={{ href: "/payments/new", label: "Record payment", icon: "plus" }} />
    </div>
  );
}
