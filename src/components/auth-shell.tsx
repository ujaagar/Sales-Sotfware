import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { PreviewBanner } from "@/components/preview-banner";
import { ThemeToggle } from "@/components/theme-toggle";

/** Two-panel layout for login / apply / set-password. Navy brand panel on wide screens. */
export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="relative hidden overflow-hidden bg-midnight p-10 text-white lg:flex lg:flex-col">
          <div aria-hidden className="absolute -right-10 top-24 h-72 w-24 rounded-full bg-[#1a3170] opacity-60" />
          <div aria-hidden className="absolute -bottom-16 left-16 h-56 w-24 rounded-full bg-[#1a3170] opacity-50" />
          <Link href="/" className="relative w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
            <Logo on="dark" className="h-11" />
          </Link>
          <div className="relative mt-auto max-w-md">
            <p className="text-xs font-semibold tracking-[0.3em] text-[#8ea6ff] uppercase">{eyebrow}</p>
            <p className="mt-3 font-display text-[32px] leading-tight font-semibold">{title}</p>
            <div className="mt-3 text-[16px] leading-relaxed text-[#c9d3e6]">{intro}</div>
          </div>
        </aside>

        <main className="flex flex-col px-4 py-6 sm:px-8">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
              <Logo className="h-9" />
            </Link>
            <ThemeToggle />
          </div>
          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
