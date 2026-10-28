"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";

type Result = { ok?: boolean; preview?: boolean; error?: string };

/** Approve / reject buttons for deals and payments. */
export function ReviewActions({
  approveLabel,
  rejectLabel,
  okMessage,
  previewMessage,
  backHref,
  onApprove,
  onReject,
}: {
  approveLabel: string;
  rejectLabel: string;
  okMessage: string;
  previewMessage: string;
  backHref: string;
  onApprove: () => Promise<Result>;
  onReject: (reason: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handle = (res: Result, ok: string) => {
    if (res.error) return setError(res.error);
    if (res.preview) return void toast(previewMessage);
    toast.success(ok);
    router.push(backHref);
    router.refresh();
  };

  if (rejecting) {
    return (
      <div className="space-y-3">
        <Field label="Reason" htmlFor="reason" required error={error ?? undefined} hint="The agent sees this.">
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="danger"
            size="lg"
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => handle(await onReject(reason), "Rejected. The agent has been told."));
            }}
          >
            <X /> {pending ? "Saving…" : rejectLabel}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setRejecting(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => handle(await onApprove(), okMessage));
          }}
        >
          <Check /> {pending ? "Saving…" : approveLabel}
        </Button>
        <Button variant="secondary" size="lg" disabled={pending} onClick={() => setRejecting(true)}>
          <X /> Reject
        </Button>
      </div>
    </div>
  );
}
