import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const expired = (await searchParams).link === "expired";
  return (
    <AuthShell eyebrow="Account" title="Forgot your password?" intro="We'll email you a link to choose a new one.">
      <h1 className="text-[26px] font-semibold">Reset your password</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">Enter the email you log in with.</p>
      {expired && (
        <p className="mb-4 rounded-[12px] bg-[var(--status-pending-bg)] px-3.5 py-2.5 text-sm text-[var(--status-pending-fg)]">
          That reset link has expired or was already used. Ask for a new one.
        </p>
      )}
      <ForgotForm />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
