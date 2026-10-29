"use client";

import { CheckCircle2, KeyRound, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { requestPasswordReset, setNewPassword } from "@/app/actions/password";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Turnstile } from "@/components/turnstile";
import { PASSWORD_HINT } from "@/lib/security";

function Err({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
      {error}
    </p>
  ) : null;
}

export function ForgotForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const needsToken = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (sent)
    return (
      <div className="rounded-[16px] border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--status-good-fg)]" aria-hidden />
        <p className="mt-3 font-medium">Check your email</p>
        <p className="mt-1 text-sm text-muted-foreground">If this email has an account, a reset link is on its way. It can take a few minutes; check spam too.</p>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") ?? "");
        start(async () => {
          setError(null);
          const res = await requestPasswordReset(email, token);
          setRound((r) => r + 1);
          if (res.error) setError(res.error);
          else setSent(true);
        });
      }}
    >
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" />
      </Field>
      <Turnstile onToken={setToken} resetSignal={round} />
      <Err error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending || (needsToken && !token)}>
        <Send /> {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="rounded-[16px] border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--status-good-fg)]" aria-hidden />
        <p className="mt-3 font-medium">Password changed</p>
        <div className="mt-4 flex flex-col gap-2">
          <LinkButton href="/login" size="lg">
            Agent login
          </LinkButton>
          <LinkButton href="/ceo/login" variant="ghost">
            CEO login
          </LinkButton>
        </div>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await setNewPassword(String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
          if (res.error) setError(res.error);
          else setDone(true);
        });
      }}
    >
      <Field label="New password" htmlFor="password" hint={PASSWORD_HINT}>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Type it again" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </Field>
      <Err error={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <KeyRound /> {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
