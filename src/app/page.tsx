import Link from "next/link";
import { ArrowRight, BadgeCheck, LockKeyhole, UserPlus, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PreviewBanner } from "@/components/preview-banner";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  { icon: BadgeCheck, title: "Every deal approved", body: "Your deals and client payments are checked by the CEO, so every rupee is on record." },
  { icon: Wallet, title: "See what you earn", body: "Commission is worked out for you on every verified payment. Earned, paid and pending, always up to date." },
  { icon: LockKeyhole, title: "Your data stays yours", body: "Each agent sees only their own clients and numbers." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <header className="relative overflow-hidden bg-midnight text-white">
        {/* brand pill shapes from the identity sheet */}
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 hidden h-64 w-24 sm:block rounded-full bg-[#1a3170] opacity-70" />
        <div aria-hidden className="pointer-events-none absolute top-24 -right-32 hidden h-72 w-24 sm:block rounded-full bg-[#1a3170] opacity-50" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-8 h-56 w-24 rounded-full bg-[#1a3170] opacity-60" />

        <div className="relative mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-8">
          <Logo on="dark" className="h-9 sm:h-11" />
          <ThemeToggle tone="nav" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-8 sm:pt-14 sm:pb-24">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#8ea6ff] uppercase">Ujaagar Digital · Sales Portal</p>
          <h1 className="mt-4 max-w-2xl text-[32px] leading-[1.15] font-bold sm:text-[48px]">
            Bring clients. <span className="text-brand-blue">Get paid</span> for every one.
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#c9d3e6] sm:text-[18px]">
            Record your leads, deals and client payments. Your commission is calculated on every verified payment.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-white px-6 font-medium text-midnight transition-transform hover:bg-[#e6ebf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-midnight active:scale-[0.98]"
            >
              Agent login <ArrowRight className="size-[18px]" />
            </Link>
            <Link
              href="/apply"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/30 px-6 font-medium text-white transition-transform hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-midnight active:scale-[0.98]"
            >
              <UserPlus className="size-[18px]" /> Apply as a sales agent
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-8 sm:py-16">
        <h2 className="text-[26px] font-semibold sm:text-[32px]">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Apply", "Fill in the short form. The CEO reviews it and sends you a link to set your password."],
            ["Record your work", "Add leads, turn them into deals, and record client payments with a photo of the receipt."],
            ["Earn commission", "Once the CEO verifies a payment, your commission appears straight away."],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-[16px] border border-border bg-card p-5">
              <span className="num flex size-9 items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <p className="mt-4 font-display text-[17px] font-semibold">{title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-6 text-accent" strokeWidth={2} aria-hidden />
              <p className="mt-3 font-medium">{title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            <span className="font-display font-semibold text-foreground">Aapka Brand, </span>
            <span className="font-display font-semibold text-accent">Ab Ujaagar.</span>
          </p>
          <div className="flex gap-5">
            <Link href="/sales-agent-policy" className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Sales Agent Policy
            </Link>
            <Link href="/ceo/login" className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              CEO portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
