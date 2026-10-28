"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setPassword } from "@/app/(auth)/actions";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-[16px] border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--status-good-fg)]" aria-hidden />
        <h2 className="mt-3 text-[22px] font-semibold">Password set</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Log in with <span className="font-medium text-foreground">{email}</span> and your new password.
        </p>
        <LinkButton href="/login" size="lg" className="mt-5 w-full">
          Go to login
        </LinkButton>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await setPassword(token, String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
          if (res.error) setError(res.error);
          else setDone(true);
        });
      }}
    >
      <Field label="Email (your login)" htmlFor="email">
        <Input id="email" value={email} readOnly className="bg-muted" />
      </Field>
      <Field label="New password" htmlFor="password" required hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="Type it again" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} />
      </Field>
      {error && (
        <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <KeyRound /> {pending ? "Saving…" : "Set password"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already set it?{" "}
        <Link href="/login" className="font-medium text-accent-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
