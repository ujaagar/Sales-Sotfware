import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LogoutButton } from "@/components/logout-button";
import { TwoStepVerifyForm } from "@/components/two-step";
import { requireCeo } from "@/lib/auth";

export const metadata: Metadata = { title: "2-step verification" };

// After the CEO's password: the 6-digit code from the authenticator app.
// Lives outside the CEO layout, which would send a code-less session straight back here.
export default async function CeoVerifyPage() {
  const me = await requireCeo({ allowMfaPending: true });
  if (!me.mfaPending) redirect("/ceo");
  return (
    <AuthShell eyebrow="CEO portal" title="One more step." intro="Your account has 2-step verification on, so a password alone can't open it.">
      <h1 className="text-[26px] font-semibold">Enter your code</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">Open Google Authenticator (or your authenticator app) and type the 6-digit code for Ujaagar Sales.</p>
      <TwoStepVerifyForm />
      <div className="mt-6 text-sm">
        <LogoutButton variant="row" className="overflow-hidden rounded-[12px] border border-border" />
      </div>
    </AuthShell>
  );
}
