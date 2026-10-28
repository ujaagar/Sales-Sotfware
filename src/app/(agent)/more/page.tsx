import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, ScrollText, Trophy, User, Users, Wallet, WalletCards } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { requireAgent } from "@/lib/auth";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/commissions", label: "Commission & statements", icon: Wallet },
  { href: "/payouts", label: "Payouts", icon: WalletCards },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/policy", label: "Sales Agent Policy", icon: ScrollText },
  { href: "/profile", label: "Profile", icon: User },
];

export default async function MorePage() {
  const me = await requireAgent();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="More" />
      <Card className="mb-4 flex items-center gap-3 p-4">
        <Avatar name={me.name} className="size-11" />
        <div className="min-w-0">
          <p className="truncate font-medium">{me.name}</p>
          <p className="truncate text-sm text-muted-foreground">{me.email}</p>
        </div>
      </Card>
      <Card>
        <ul className="divide-y divide-border">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
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
