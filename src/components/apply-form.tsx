"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitApplication } from "@/app/(auth)/actions";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { applySchema, type ApplyInput } from "@/lib/validation";

export function ApplyForm() {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((t: string | null) => setToken(t), []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyInput>({ resolver: zodResolver(applySchema) });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    start(async () => {
      const res = await submitApplication(values, token);
      if (res.error) setServerError(res.error);
      else setDone(true);
    });
  });

  if (done) {
    return (
      <div className="rounded-[16px] border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[var(--status-good-fg)]" aria-hidden />
        <h2 className="mt-3 text-[22px] font-semibold">Application sent</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          The CEO will review it. If you&apos;re approved, you&apos;ll get a link (by email or WhatsApp) to set your password.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-accent-foreground underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" required error={errors.email?.message} hint="You'll use this to log in.">
        <Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" required error={errors.phone?.message}>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message} hint="If different from phone">
          <Input id="whatsapp" type="tel" inputMode="tel" placeholder="0300 1234567" {...register("whatsapp")} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="city" required error={errors.city?.message}>
          <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
        </Field>
        <Field label="CNIC" htmlFor="cnic" error={errors.cnic?.message} hint="Optional">
          <Input id="cnic" inputMode="numeric" placeholder="12345-1234567-1" {...register("cnic")} />
        </Field>
      </div>
      <Field label="About you" htmlFor="note" error={errors.note?.message} hint="Optional. Your sales experience, or who referred you.">
        <Textarea id="note" rows={3} {...register("note")} />
      </Field>
      <Turnstile onToken={onToken} />
      {serverError && (
        <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Send /> {pending ? "Sending…" : "Send application"}
      </Button>
    </form>
  );
}
