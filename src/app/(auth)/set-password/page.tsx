import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/set-password-form";
import { LinkButton } from "@/components/ui/button";
import { checkInvite } from "@/lib/invites";

export const metadata: Metadata = { title: "Set your password" };

const REASONS: Record<string, string> = {
  missing: "This link is incomplete. Open the full link the CEO sent you.",
  invalid: "This link isn't valid. Ask the CEO for a new one.",
  used: "This link has already been used. You can log in with your password.",
  revoked: "A newer link was sent to you. Please use the latest one.",
  expired: "This link has expired (links last 7 days). Ask the CEO for a new one.",
  inactive: "This account isn't active. Please contact the CEO.",
};

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = await checkInvite(token);

  return (
    <AuthShell
      eyebrow="Welcome to the team"
      title="Set your password to get started."
      intro="You choose your own password. Nobody else, not even the CEO, can see it."
    >
      {invite.ok ? (
        <>
          <h1 className="text-[26px] font-semibold">Welcome, {invite.name.split(" ")[0]}</h1>
          <p className="mt-1 mb-6 text-[15px] text-muted-foreground">Choose a password for your Ujaagar Sales account.</p>
          <SetPasswordForm token={token!} email={invite.email} />
        </>
      ) : (
        <div className="rounded-[16px] border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto size-10 text-[var(--status-pending-fg)]" aria-hidden />
          <h1 className="mt-3 text-[22px] font-semibold">Link not valid</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{REASONS[invite.reason]}</p>
          <LinkButton href="/login" variant="secondary" size="lg" className="mt-5 w-full">
            Go to login
          </LinkButton>
        </div>
      )}
    </AuthShell>
  );
}
