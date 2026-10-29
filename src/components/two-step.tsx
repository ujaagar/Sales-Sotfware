"use client";

import { CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmTwoStep, startTwoStep, verifyTwoStep } from "@/app/actions/mfa";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

function Err({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
      {error}
    </p>
  ) : null;
}

function CodeInput({ id = "code" }: { id?: string }) {
  return (
    <Input
      id={id}
      name="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]*"
      maxLength={7}
      placeholder="123456"
      className="num max-w-48 text-center text-lg tracking-[0.3em]"
    />
  );
}

/** Settings → Security: turn on 2-step verification. */
export function TwoStepSetup() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [done, setDone] = useState(false);

  if (done)
    return (
      <div className="flex items-start gap-3 rounded-[16px] bg-[var(--status-good-bg)] p-4 text-[var(--status-good-fg)]">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm">2-step verification is on. From now on, after your password you will enter the code from the app.</p>
      </div>
    );

  if (!setup)
    return (
      <div className="space-y-3">
        <Err error={error} />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await startTwoStep();
              if (res.error || !res.factorId) return setError(res.error ?? "Could not start the setup.");
              setSetup({ factorId: res.factorId, qr: res.qr!, secret: res.secret! });
            })
          }
        >
          <ShieldCheck /> {pending ? "Starting…" : "Turn on 2-step verification"}
        </Button>
      </div>
    );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "");
        start(async () => {
          setError(null);
          const res = await confirmTwoStep(setup.factorId, code);
          if (res.error) return setError(res.error);
          setDone(true);
          router.refresh();
        });
      }}
    >
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          On your phone, install <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> (free).
        </li>
        <li>In the app tap <strong>+</strong> → <strong>Scan a QR code</strong>, and scan this:</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR as an SVG data URL */}
      <img src={setup.qr} alt="QR code for the authenticator app" className="size-48 rounded-[12px] border border-border bg-white p-2" />
      <p className="text-sm text-muted-foreground">
        Can&apos;t scan? Choose &quot;Enter a setup key&quot; in the app and type: <span className="num break-all font-medium text-foreground">{setup.secret}</span>
      </p>
      <Field label="3. Type the 6-digit code the app shows" htmlFor="code">
        <CodeInput />
      </Field>
      <Err error={error} />
      <Button type="submit" disabled={pending}>
        <Smartphone /> {pending ? "Checking…" : "Confirm and turn on"}
      </Button>
    </form>
  );
}

/** /ceo/verify: the code after the password. */
export function TwoStepVerifyForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "");
        start(async () => {
          setError(null);
          const res = await verifyTwoStep(code);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <Field label="6-digit code" htmlFor="code">
        <CodeInput />
      </Field>
      <Err error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <ShieldCheck /> {pending ? "Checking…" : "Verify"}
      </Button>
    </form>
  );
}
