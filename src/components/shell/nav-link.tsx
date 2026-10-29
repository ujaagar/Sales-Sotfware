"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BadgeCheck, BarChart3, Briefcase, CalendarCheck, Home, LayoutGrid, Percent, Plus, Receipt,
  Settings, ShieldCheck, ShoppingBag, Tags, UserPlus, Users, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  activity: Activity, approvals: BadgeCheck, chart: BarChart3, briefcase: Briefcase, calendar: CalendarCheck,
  home: Home, grid: LayoutGrid, percent: Percent, plus: Plus, receipt: Receipt, settings: Settings,
  bag: ShoppingBag, shield: ShieldCheck, tags: Tags, userPlus: UserPlus, users: Users, wallet: Wallet,
};
export type IconName = keyof typeof ICONS;

// Icons are passed by name: components can't be sent from server layouts to client components.
export type NavItem = { href: string; label: string; icon: IconName; badge?: number; exact?: boolean };

export function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
}

function Count({ n, className }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("num min-w-5 rounded-full bg-[#f5a524] px-1.5 text-center text-[11px] leading-5 font-semibold text-midnight", className)}>
      {n}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

/** CEO sidebar link on the navy rail. */
export function RailLink({ item }: { item: NavItem }) {
  const isActive = useActive();
  const active = isActive(item.href, item.exact);
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
        active ? "bg-nav-active text-white" : "text-nav-foreground hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active && "text-[#8ea6ff]")} strokeWidth={2} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      <Count n={item.badge} />
    </Link>
  );
}

/** Agent top-bar link (desktop). */
export function TopLink({ item }: { item: NavItem }) {
  const isActive = useActive();
  const active = isActive(item.href, item.exact);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-16 items-center px-3 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
      {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-accent" />}
    </Link>
  );
}

/** Mobile bottom tab bar. The `primary` item is the big centre action. */
export function TabBar({ items, primary }: { items: NavItem[]; primary?: NavItem }) {
  const isActive = useActive();
  const half = Math.ceil(items.length / 2);
  const PrimaryIcon = primary ? ICONS[primary.icon] : null;
  const renderTab = (item: NavItem) => {
    const active = isActive(item.href, item.exact);
    const Icon = ICONS[item.icon];
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-95 transition-transform",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Icon className={cn("size-[22px]", active && "text-accent")} strokeWidth={active ? 2.3 : 2} aria-hidden />
          {item.label}
          <Count n={item.badge} className="absolute top-1.5 left-1/2 ml-1.5" />
        </Link>
      </li>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch">
        {items.slice(0, half).map(renderTab)}
        {primary && PrimaryIcon && (
          <li className="flex flex-1 justify-center">
            <Link
              href={primary.href}
              className="-mt-5 flex size-14 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform focus-visible:outline-none focus-visible:ring-ring active:scale-95"
            >
              <PrimaryIcon className="size-6" strokeWidth={2.2} aria-hidden />
              <span className="sr-only">{primary.label}</span>
            </Link>
          </li>
        )}
        {items.slice(half).map(renderTab)}
      </ul>
    </nav>
  );
}
