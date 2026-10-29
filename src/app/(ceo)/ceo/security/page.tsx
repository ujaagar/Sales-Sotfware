import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { TwoStepSetup } from "@/components/two-step";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { LOGIN_LIMIT } from "@/lib/security";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const me = await requireCeo();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Security" description="Protect the CEO account. Anyone with it can approve deals and record payouts." />

      <Card>
        <CardHeader
          title="2-step verification"
          description="After your password, you also enter a 6-digit code from an app on your phone. A stolen password alone is not enough."
        />
        <CardBody>
          {me.mfaEnrolled ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-medium text-[var(--status-good-fg)]">
                <CheckCircle2 className="size-5" aria-hidden /> On
              </p>
              <p className="text-sm text-muted-foreground">
                Lost or changed your phone? Before you wipe the old phone, move the account in the authenticator app. If the phone is gone, your
                developer can remove the old code from the Supabase dashboard (Authentication → Users → your account), and you set it up again here.
              </p>
            </div>
          ) : (
            <TwoStepSetup />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Already protecting you" />
        <CardBody>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Bot check (Cloudflare Turnstile) on the login, password reset and application forms.</li>
            <li>
              {LOGIN_LIMIT.perEmail} wrong passwords for one account pause its login for {LOGIN_LIMIT.windowMinutes} minutes, and you get an alert.
            </li>
            <li>Strong passwords required: 10+ characters with letters and numbers.</li>
            <li>Changing a password logs that account out everywhere else.</li>
            <li>Agents only ever see their own data; the database enforces it.</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
