"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/validation";

export function LoginForm({ portal }: { portal: "agent" | "ceo" }) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    start(async () => {
      const res = await signIn(portal, values);
      if (res?.error) setServerError(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="pr-12"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </Field>
      {serverError && (
        <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogIn /> {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
