"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, KeyRound, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { changePassword, markAllRead, updateProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { profileSchema } from "@/lib/validation";
import type { z } from "zod";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllRead();
          router.refresh();
        })
      }
    >
      <CheckCheck /> Mark all as read
    </Button>
  );
}

type ProfileInput = z.input<typeof profileSchema>;

export function ProfileForm({ initial }: { initial: ProfileInput }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: initial });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          setError(null);
          const res = await updateProfile(v);
          if (res.error) setError(res.error);
          else toast.success("Profile saved");
        }),
      )}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="p-phone" required error={errors.phone?.message}>
          <Input id="p-phone" type="tel" inputMode="tel" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="p-wa" error={errors.whatsapp?.message}>
          <Input id="p-wa" type="tel" inputMode="tel" {...register("whatsapp")} />
        </Field>
        <Field label="City" htmlFor="p-city" error={errors.city?.message}>
          <Input id="p-city" {...register("city")} />
        </Field>
      </div>
      {error && <p className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        <Save /> {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          setError(null);
          const res = await changePassword(String(fd.get("current")), String(fd.get("next")), String(fd.get("confirm")));
          if (res.error) return setError(res.error);
          form.reset();
          toast.success("Password changed");
        });
      }}
    >
      <Field label="Current password" htmlFor="pw-cur">
        <Input id="pw-cur" name="current" type="password" autoComplete="current-password" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
          <Input id="pw-new" name="next" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Type it again" htmlFor="pw-confirm">
          <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" />
        </Field>
      </div>
      {error && <p className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">{error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        <KeyRound /> {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
