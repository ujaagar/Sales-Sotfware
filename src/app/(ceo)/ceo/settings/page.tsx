import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm } from "@/components/account-views";
import { RecurringToggle } from "@/components/ceo-admin-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireCeo } from "@/lib/auth";
import { CURRENT_POLICY_VERSION, versionLabel } from "@/lib/policy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireCeo();
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const get = (k: string) => (data ?? []).find((r) => r.key === k)?.value;
  const emailOn = !!process.env.RESEND_API_KEY;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Commission" />
        <CardBody className="space-y-4">
          <RecurringToggle on={get("recurring_stops_when_agent_inactive") !== false} />
          <p className="text-sm text-muted-foreground">
            Monthly payments are due by the <span className="font-medium text-foreground">{String(get("monthly_payment_due_day") ?? 10)}th</span>. After that, the
            agent and you get a &quot;missed payment&quot; alert at 9 AM.
          </p>
          <p className="text-sm">
            <Link href="/ceo/rates" className="font-medium text-accent-foreground hover:underline">
              Commission rates →
            </Link>
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Sales Agent Policy" />
        <CardBody className="space-y-2 text-sm text-muted-foreground">
          <p>
            Version in force: <span className="font-medium text-foreground">{versionLabel()}</span> ({CURRENT_POLICY_VERSION}). Every agent must accept it before using the
            portal.
          </p>
          <p>
            <Link href="/sales-agent-policy" className="font-medium text-accent-foreground hover:underline">
              Read the policy →
            </Link>
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Email" />
        <CardBody className="text-sm text-muted-foreground">
          {emailOn ? (
            <p>Email notifications are on (Resend).</p>
          ) : (
            <p>
              Email is off. In-app notifications still work. To turn on email, add <code className="rounded bg-muted px-1">RESEND_API_KEY</code> and{" "}
              <code className="rounded bg-muted px-1">EMAIL_FROM</code> to the server settings.
            </p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Your password" description={me.email} />
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
