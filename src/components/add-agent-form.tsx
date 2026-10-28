"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { addAgentDirect, type InviteResult } from "@/app/actions/agents";
import { InviteLinkPanel } from "@/components/invite-link-panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { applySchema, type ApplyInput } from "@/lib/validation";

/** CEO adds an agent directly (skips the public form). */
export function AddAgentForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplyInput>({ resolver: zodResolver(applySchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await addAgentDirect(values);
      if (res.error) return setError(res.error);
      setInvite(res);
      reset();
      router.refresh();
    });
  });

  return (
    <div className="space-y-4">
      {invite?.inviteUrl && <InviteLinkPanel url={invite.inviteUrl} name={invite.name ?? "the agent"} phone={invite.phone} expiresAt={invite.expiresAt} />}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="a-name" required error={errors.fullName?.message}>
          <Input id="a-name" {...register("fullName")} />
        </Field>
        <Field label="Email (their login)" htmlFor="a-email" required error={errors.email?.message}>
          <Input id="a-email" type="email" inputMode="email" {...register("email")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="a-phone" required error={errors.phone?.message}>
            <Input id="a-phone" type="tel" inputMode="tel" placeholder="0300 1234567" {...register("phone")} />
          </Field>
          <Field label="WhatsApp" htmlFor="a-wa" error={errors.whatsapp?.message} hint="If different">
            <Input id="a-wa" type="tel" inputMode="tel" {...register("whatsapp")} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="a-city" required error={errors.city?.message}>
            <Input id="a-city" {...register("city")} />
          </Field>
          <Field label="CNIC" htmlFor="a-cnic" error={errors.cnic?.message} hint="Optional">
            <Input id="a-cnic" placeholder="12345-1234567-1" {...register("cnic")} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          <UserPlus /> {pending ? "Creating account…" : "Add agent and get link"}
        </Button>
      </form>
    </div>
  );
}
