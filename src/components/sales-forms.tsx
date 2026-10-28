"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, CalendarClock, MessageSquarePlus, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  addNote,
  convertLead,
  createClientRecord,
  createDeal,
  createLead,
  resubmitDeal,
  setDealFollowUp,
  setLeadStatus,
  updateLead,
} from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { currentMonth, formatMonth, formatPKR, toKarachiLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clientSchema, dealSchema, leadSchema, type ClientInput, type DealInput, type LeadInput } from "@/lib/validation";

type Result = { error?: string; ok?: boolean } | undefined;

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
      {error}
    </p>
  );
}

// ---------- Lead ----------

export function LeadForm({
  services,
  lead,
}: {
  services: { id: string; name: string }[];
  lead?: { id: string } & LeadInput;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadInput>({ resolver: zodResolver(leadSchema), defaultValues: lead ?? { services: [] } });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res: Result = lead ? await updateLead(lead.id, values) : await createLead(values);
      if (res?.error) return setError(res.error);
      if (lead) {
        toast.success("Lead saved");
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="clientName" required error={errors.clientName?.message}>
          <Input id="clientName" autoComplete="off" {...register("clientName")} />
        </Field>
        <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message}>
          <Input id="businessName" {...register("businessName")} />
        </Field>
        <Field label="Phone" htmlFor="phone" required error={errors.phone?.message} hint="We check it isn't already registered.">
          <Input id="phone" type="tel" inputMode="tel" placeholder="0300 1234567" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message} hint="If different">
          <Input id="whatsapp" type="tel" inputMode="tel" {...register("whatsapp")} />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city?.message}>
          <Input id="city" {...register("city")} />
        </Field>
        <Field label="Where did you find them?" htmlFor="source" error={errors.source?.message}>
          <Input id="source" placeholder="Referral, walk-in, Instagram…" {...register("source")} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Interested in</legend>
        <Controller
          control={control}
          name="services"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = (field.value ?? []).includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value!.filter((x) => x !== s.id) : [...(field.value ?? []), s.id])}
                    className={cn(
                      "min-h-10 rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        />
      </fieldset>
      <Field label="Next follow-up" htmlFor="nextFollowUpAt" hint="You'll be reminded on this day at 9 AM.">
        <Input id="nextFollowUpAt" type="datetime-local" {...register("nextFollowUpAt")} />
      </Field>
      <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        <Save /> {pending ? "Saving…" : lead ? "Save changes" : "Add lead"}
      </Button>
    </form>
  );
}

const STAGES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["interested", "Interested"],
  ["not_interested", "Not interested"],
  ["lost", "Lost"],
] as const;

export function LeadStageActions({ id, status, converted }: { id: string; status: string; converted: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {!converted && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Stage">
          {STAGES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={status === value}
              onClick={() =>
                start(async () => {
                  const res = await setLeadStatus(id, value);
                  if (res.error) return setError(res.error);
                  router.refresh();
                })
              }
              className={cn(
                "min-h-10 rounded-full border px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform disabled:opacity-60",
                status === value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <Button
        size="lg"
        variant="accent"
        disabled={pending}
        className="w-full sm:w-auto"
        onClick={() =>
          start(async () => {
            const res = await convertLead(id);
            if (res?.error) setError(res.error);
          })
        }
      >
        <ArrowRightLeft /> {converted ? "Create another deal" : "Convert to client and create deal"}
      </Button>
      <ErrorBox error={error} />
    </div>
  );
}

export function NotesPanel({ target }: { target: { leadId?: string; dealId?: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addNote(target, body);
          if (res.error) return setError(res.error);
          setBody("");
          setError(null);
          router.refresh();
        });
      }}
    >
      <Textarea aria-label="Add a note" rows={2} placeholder="Called, sent the rate card, meeting on Monday…" value={body} onChange={(e) => setBody(e.target.value)} />
      <ErrorBox error={error} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending || !body.trim()}>
        <MessageSquarePlus /> {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}

// ---------- Client ----------

export function ClientForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({ resolver: zodResolver(clientSchema) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) => {
        setError(null);
        start(async () => {
          const res = await createClientRecord(v);
          if (res?.error) setError(res.error);
        });
      })}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Client name" htmlFor="c-name" required error={errors.name?.message}>
          <Input id="c-name" {...register("name")} />
        </Field>
        <Field label="Business name" htmlFor="c-biz" error={errors.businessName?.message}>
          <Input id="c-biz" {...register("businessName")} />
        </Field>
        <Field label="Phone" htmlFor="c-phone" required error={errors.phone?.message}>
          <Input id="c-phone" type="tel" inputMode="tel" placeholder="0300 1234567" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="c-wa" error={errors.whatsapp?.message} hint="If different">
          <Input id="c-wa" type="tel" inputMode="tel" {...register("whatsapp")} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message} hint="Optional">
          <Input id="c-email" type="email" inputMode="email" {...register("email")} />
        </Field>
        <Field label="City" htmlFor="c-city" error={errors.city?.message}>
          <Input id="c-city" {...register("city")} />
        </Field>
      </div>
      <ErrorBox error={error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        <Save /> {pending ? "Saving…" : "Add client"}
      </Button>
    </form>
  );
}

// ---------- Deal ----------

export function DealForm({
  clients,
  services,
  months,
  defaultClientId,
  deal,
}: {
  clients: { id: string; label: string }[];
  services: { id: string; name: string }[];
  months: string[];
  defaultClientId?: string;
  deal?: { id: string } & DealInput;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<DealInput>({
    resolver: zodResolver(dealSchema),
    defaultValues: deal ?? {
      clientId: defaultClientId ?? clients[0]?.id ?? "",
      dealType: "one_time",
      startMonth: months.includes(currentMonth()) ? currentMonth() : months[0],
    },
  });
  const type = watch("dealType");
  const amount = Number(String(watch("amount") ?? "").replace(/[,\s]/g, ""));

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) => {
        setError(null);
        start(async () => {
          const res: Result = deal ? await resubmitDeal(deal.id, v) : await createDeal(v);
          if (res?.error) return setError(res.error);
          if (deal) {
            toast.success("Sent to the CEO for approval");
            router.refresh();
          }
        });
      })}
    >
      {deal ? (
        <>
          <input type="hidden" {...register("clientId")} />
          <p className="text-sm">
            <span className="text-muted-foreground">Client: </span>
            <span className="font-medium">{clients.find((c) => c.id === deal.clientId)?.label ?? "—"}</span>
          </p>
        </>
      ) : (
        <Field label="Client" htmlFor="d-client" required error={errors.clientId?.message}>
          <Select id="d-client" {...register("clientId")}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Service" htmlFor="d-service" required error={errors.serviceId?.message}>
        <Select id="d-service" defaultValue="" {...register("serviceId")}>
          <option value="" disabled>
            Choose a service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Deal type <span className="text-[var(--status-bad-fg)]">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["one_time", "One-time project", "Website, video, setup…"],
              ["monthly", "Monthly package", "Paid every month"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col rounded-[12px] border border-input p-3 has-[:checked]:border-primary has-[:checked]:bg-accent-soft/50"
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" value={value} className="accent-[var(--ujaagar-blue)]" {...register("dealType")} />
                {label}
              </span>
              <span className="mt-0.5 ps-5 text-xs text-muted-foreground">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={type === "monthly" ? "Monthly fee (Rs)" : "Total amount (Rs)"}
          htmlFor="d-amount"
          required
          error={errors.amount?.message}
          hint={Number.isFinite(amount) && amount > 0 ? formatPKR(amount) : "Use the official price list."}
        >
          <Input id="d-amount" inputMode="numeric" className="num" {...register("amount")} />
        </Field>
        {type === "monthly" && (
          <Field label="Starts in" htmlFor="d-start" required error={errors.startMonth?.message}>
            <Select id="d-start" {...register("startMonth")}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field label="What was sold" htmlFor="d-desc" error={errors.description?.message} hint="Scope: pages, posts, revisions, ad budget handling…">
        <Textarea id="d-desc" rows={3} {...register("description")} />
      </Field>
      <Field label="Next follow-up" htmlFor="d-fu">
        <Input id="d-fu" type="datetime-local" {...register("nextFollowUpAt")} />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        <Send /> {pending ? "Sending…" : deal ? "Resubmit for approval" : "Send for approval"}
      </Button>
    </form>
  );
}

export function FollowUpForm({ dealId, value }: { dealId: string; value: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(toKarachiLocal(value));
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setDealFollowUp(dealId, v);
          if (res.error) return void toast.error(res.error);
          toast.success("Follow-up saved");
          router.refresh();
        });
      }}
    >
      <Field label="Next follow-up" htmlFor="fu" className="flex-1">
        <Input id="fu" type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        <CalendarClock /> Save follow-up
      </Button>
    </form>
  );
}
