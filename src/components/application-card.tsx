"use client";

import { Check, MessageCircle, Phone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveApplication, rejectApplication, type InviteResult } from "@/app/actions/agents";
import { InviteLinkPanel } from "@/components/invite-link-panel";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";

export type ApplicationView = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  cnic: string | null;
  note: string | null;
  createdAt: string;
};

const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, "").replace(/^0/, "92")}`;

export function ApplicationCard({ app }: { app: ApplicationView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);

  return (
    <article className="rounded-[16px] border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={app.fullName} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-semibold">{app.fullName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {app.city} · applied {formatDateTime(app.createdAt)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium break-all">{app.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="flex items-center gap-2 font-medium">
            <span className="num">{app.phone}</span>
            <a href={`tel:${app.phone}`} aria-label={`Call ${app.fullName}`} className="text-accent-foreground hover:underline">
              <Phone className="size-4" />
            </a>
            <a href={wa(app.whatsapp || app.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${app.fullName}`} className="text-accent-foreground hover:underline">
              <MessageCircle className="size-4" />
            </a>
          </dd>
        </div>
        {app.cnic && (
          <div>
            <dt className="text-muted-foreground">CNIC</dt>
            <dd className="num font-medium">{app.cnic}</dd>
          </div>
        )}
        {app.note && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">About</dt>
            <dd className="leading-relaxed">{app.note}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        {invite?.inviteUrl ? (
          <InviteLinkPanel url={invite.inviteUrl} name={invite.name ?? app.fullName} phone={invite.phone} expiresAt={invite.expiresAt} />
        ) : rejecting ? (
          <div className="space-y-3">
            <Field label="Reason (optional)" htmlFor={`r-${app.id}`} hint="Shown to the applicant only if email is set up.">
              <Textarea id={`r-${app.id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await rejectApplication(app.id, reason);
                    if (res.error) return setError(res.error);
                    toast("Application rejected");
                    router.refresh();
                  })
                }
              >
                <X /> {pending ? "Saving…" : "Reject"}
              </Button>
              <Button variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await approveApplication(app.id);
                  if (res.error) return setError(res.error);
                  setInvite(res);
                  toast.success(`${app.fullName} approved. Send them the link.`);
                })
              }
            >
              <Check /> {pending ? "Creating account…" : "Approve"}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
              <X /> Reject
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-[12px] bg-[var(--status-bad-bg)] px-3.5 py-2.5 text-sm text-[var(--status-bad-fg)]">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
