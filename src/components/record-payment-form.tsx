"use client";

import { Camera, FileCheck2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { recordPayment } from "@/app/actions/agent";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { formatMonth, formatPKR } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/validation";

type DealOption = { id: string; label: string; type: "one_time" | "monthly"; amount: number; remaining: number | null; months: string[] };

export function RecordPaymentForm({ deals, today, afterHref = "/dashboard" }: { deals: DealOption[]; today: string; afterHref?: string }) {
  const [dealId, setDealId] = useState(deals[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const deal = deals.find((d) => d.id === dealId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(String(fd.get("amount") ?? "").replace(/[,\s]/g, ""));
    const next: Record<string, string> = {};
    if (!dealId) next.deal = "Choose the deal";
    if (!Number.isInteger(amount) || amount <= 0) next.amount = "Enter the amount in rupees";
    else if (deal?.remaining !== null && deal && amount > deal.remaining) next.amount = `Only ${formatPKR(deal.remaining)} is left on this deal`;
    if (!file) next.proof = "Add a photo or PDF of the receipt";
    else if (file.size > 5 * 1024 * 1024) next.proof = "The file must be under 5 MB";
    setErrors(next);
    if (Object.keys(next).length) return;
    fd.set("dealId", dealId);
    fd.set("proof", file!);
    start(async () => {
      const res = await recordPayment(fd);
      if (res.error) return setErrors({ form: res.error });
      if (res.preview) return void toast("Preview: payment not saved.");
      toast.success("Payment sent to the CEO for verification.");
      router.push(afterHref);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 pb-24 md:pb-0">
      <Field label="Deal" htmlFor="deal" required error={errors.deal}>
        <Select id="deal" value={dealId} onChange={(e) => setDealId(e.target.value)}>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>
      {deal && (
        <p className="-mt-2 text-sm text-muted-foreground">
          {deal.type === "monthly" ? (
            <>
              Monthly fee <span className="num font-medium text-foreground">{formatPKR(deal.amount)}</span>
            </>
          ) : (
            <>
              <span className="num font-medium text-foreground">{formatPKR(deal.remaining ?? 0)}</span> left of {formatPKR(deal.amount)}
            </>
          )}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount received (Rs)" htmlFor="amount" required error={errors.amount}>
          <Input id="amount" name="amount" inputMode="numeric" placeholder={deal ? String(deal.type === "monthly" ? deal.amount : deal.remaining ?? "") : ""} className="num" />
        </Field>
        <Field label="Date received" htmlFor="paidOn" required>
          <Input id="paidOn" name="paidOn" type="date" defaultValue={today} max={today} />
        </Field>
      </div>
      {deal?.type === "monthly" && deal.months.length > 0 && (
        <Field label="Payment for month" htmlFor="billingMonth" required hint="Which month of the package this pays for.">
          <Select id="billingMonth" name="billingMonth" defaultValue={deal.months[0]} key={deal.id}>
            {deal.months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="How they paid" htmlFor="method" required>
        <Select id="method" name="method" defaultValue="bank_transfer">
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Receipt" htmlFor="proof" required error={errors.proof} hint="Photo or screenshot of the receipt, or a PDF. Max 5 MB.">
        <input
          ref={fileRef}
          id="proof"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-input bg-card px-4 py-5 text-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] transition-transform"
        >
          {file ? (
            <>
              <FileCheck2 className="size-6 text-[var(--status-good-fg)]" aria-hidden />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">Tap to change</span>
            </>
          ) : (
            <>
              <Camera className="size-6 text-accent" aria-hidden />
              <span className="text-sm font-medium">Take a photo or choose a file</span>
            </>
          )}
        </button>
      </Field>
      <Field label="Note" htmlFor="note" hint="Optional">
        <Textarea id="note" name="note" rows={2} />
      </Field>
      {errors.form && (
        <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
          {errors.form}
        </p>
      )}
      <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={pending}>
          <Send /> {pending ? "Sending…" : "Send for verification"}
        </Button>
      </div>
    </form>
  );
}
