import Link from "next/link";
import { Bell } from "lucide-react";
import { Logo, Mark } from "@/components/brand/logo";
import { PreviewBanner } from "@/components/preview-banner";
import { RailLink, TabBar, type NavItem } from "@/components/shell/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { getCeoBadges } from "@/lib/data";
import { getUnreadCount } from "@/lib/data/notifications";

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  const me = await requireCeo();
  const [d, unread] = await Promise.all([getCeoBadges(), getUnreadCount()]);

  const groups: { title?: string; items: NavItem[] }[] = [
    { items: [{ href: "/ceo", label: "Dashboard", icon: "home", exact: true }] },
    {
      title: "Review",
      items: [
        { href: "/ceo/applications", label: "Agent applications", icon: "userPlus", badge: d.pendingApplications },
        { href: "/ceo/approvals", label: "Deal approvals", icon: "approvals", badge: d.pendingApprovals },
        { href: "/ceo/payments", label: "Payment verification", icon: "receipt", badge: d.pendingVerifications },
      ],
    },
    {
      title: "Team & money",
      items: [
        { href: "/ceo/agents", label: "Agents", icon: "users" },
        { href: "/ceo/rates", label: "Rates & targets", icon: "percent" },
        { href: "/ceo/months", label: "Month locking", icon: "calendar" },
        { href: "/ceo/payouts", label: "Payouts", icon: "wallet" },
      ],
    },
    {
      title: "Insights",
      items: [
        { href: "/ceo/reports", label: "Reports", icon: "chart" },
        { href: "/ceo/activity", label: "Activity log", icon: "activity" },
      ],
    },
    {
      title: "More",
      items: [
        { href: "/ceo/my-sales", label: "My Sales", icon: "bag" },
        { href: "/sales-agent-policy", label: "Agent policy", icon: "approvals" },
        { href: "/ceo/services", label: "Services", icon: "tags" },
        { href: "/ceo/security", label: "Security", icon: "shield" },
        { href: "/ceo/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];

  const tabs: NavItem[] = [
    { href: "/ceo", label: "Home", icon: "home", exact: true },
    { href: "/ceo/approvals", label: "Approvals", icon: "briefcase", badge: d.pendingApprovals },
    { href: "/ceo/payments", label: "Payments", icon: "receipt", badge: d.pendingVerifications },
    { href: "/ceo/more", label: "More", icon: "grid", badge: d.pendingApplications },
  ];

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col bg-nav px-3 py-5 md:flex print:hidden">
        <Link href="/ceo" className="mb-2 rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
          <Logo on="dark" className="h-10" />
        </Link>
        <p className="mb-4 px-3 text-[11px] font-semibold tracking-[0.2em] text-[#8ea6ff] uppercase">CEO portal</p>
        <nav aria-label="CEO" className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
          {groups.map((g, i) => (
            <div key={i}>
              {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-nav-foreground/60 uppercase">{g.title}</p>}
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <RailLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-white/5 p-2.5">
          <Avatar name={me.name} className="bg-[#1f3357] text-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{me.name}</p>
            <p className="text-xs text-nav-foreground">CEO</p>
          </div>
          <ThemeToggle tone="nav" />
          <LogoutButton variant="nav" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <PreviewBanner />
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-nav px-4 text-white md:h-16 md:border-b md:border-border md:bg-card md:px-8 md:text-foreground print:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Link href="/ceo" className="flex items-center gap-2 rounded-md md:hidden">
            <Mark on="dark" className="size-8" />
            <span className="font-display text-[15px] font-semibold">CEO</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/ceo/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className="relative inline-flex size-11 items-center justify-center rounded-[12px] text-nav-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-muted-foreground md:hover:bg-muted md:hover:text-foreground"
            >
              <Bell className="size-5" />
              {unread > 0 && <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[#f5a524]" />}
            </Link>
            <ThemeToggle tone="nav" className="md:hidden" />
          </div>
        </header>
        <main className="mx-auto max-w-[1200px] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      <TabBar items={tabs} />
    </div>
  );
}
