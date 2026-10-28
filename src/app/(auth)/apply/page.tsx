import type { Metadata } from "next";
import Link from "next/link";
import { ApplyForm } from "@/components/apply-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Apply as a sales agent" };

export default function ApplyPage() {
  return (
    <AuthShell
      eyebrow="Join the team"
      title="Sell digital marketing. Earn on every payment."
      intro={
        <ul className="space-y-1.5">
          <li>10% to 18% on new sales, based on deal size.</li>
          <li>1.5% to 2% every month while your monthly clients stay.</li>
          <li>See your earnings live, on your phone.</li>
        </ul>
      }
    >
      <h1 className="text-[26px] font-semibold">Apply as a sales agent</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted-foreground">
        No password needed now. If the CEO approves you, you&apos;ll get a link to set one.
      </p>
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        Please read the{" "}
        <Link href="/sales-agent-policy" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
          Sales Agent Policy
        </Link>{" "}
        first. You&apos;ll accept it when you first log in.
      </p>
      <ApplyForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already approved?{" "}
        <Link href="/login" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
