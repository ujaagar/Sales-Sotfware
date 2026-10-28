import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { OtherSessionNotice } from "@/components/other-session-notice";
import { isPreview } from "@/lib/env";

export const metadata: Metadata = { title: "Agent login" };

export default async function AgentLoginPage({ searchParams }: { searchParams: Promise<{ policy?: string; as?: string }> }) {
  const sp = await searchParams;
  const declined = sp.policy === "declined";
  return (
    <AuthShell
      eyebrow="Sales agents"
      title="Your leads, deals and commission in one place."
      intro="Log in with the email you applied with and the password you set."
    >
      <h1 className="text-[26px] font-semibold">Agent login</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">Welcome back. Log in to record your work.</p>
      {sp.as === "ceo" && <OtherSessionNotice as="ceo" />}
      {declined && (
        <p role="status" className="mb-4 rounded-[12px] bg-[var(--status-pending-bg)] px-3.5 py-2.5 text-sm text-[var(--status-pending-fg)]">
          You logged out without accepting the Sales Agent Policy. You need to accept it to use the portal. Log in again when you are ready.
        </p>
      )}
      {isPreview && (
        <p className="mb-4 rounded-[12px] bg-accent-soft px-3.5 py-2.5 text-sm text-accent-foreground">
          Preview: type any email and password to look around as a sample agent.
        </p>
      )}
      <LoginForm portal="agent" />
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>
          Not an agent yet?{" "}
          <Link href="/apply" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
            Apply as a sales agent
          </Link>
        </p>
        <p>
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
            Reset it
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
