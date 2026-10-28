import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { OtherSessionNotice } from "@/components/other-session-notice";
import { isPreview } from "@/lib/env";

export const metadata: Metadata = { title: "CEO login" };

export default async function CeoLoginPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const signedInAsAgent = (await searchParams).as === "agent";
  return (
    <AuthShell
      eyebrow="CEO portal"
      title="Approve deals, verify payments, pay commission."
      intro="This portal is only for the CEO account. Sales agents log in at the agent portal."
    >
      <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--status-brand-bg)] px-3 py-1 text-xs font-semibold text-[var(--status-brand-fg)]">
        <ShieldCheck className="size-3.5" aria-hidden /> CEO only
      </span>
      <h1 className="text-[26px] font-semibold">CEO login</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">Agent accounts can&apos;t log in here.</p>
      {isPreview && (
        <p className="mb-4 rounded-[12px] bg-accent-soft px-3.5 py-2.5 text-sm text-accent-foreground">
          Preview: type any email and password to look around as the CEO.
        </p>
      )}
      {signedInAsAgent && <OtherSessionNotice as="agent" />}
      <LoginForm portal="ceo" />
    </AuthShell>
  );
}
