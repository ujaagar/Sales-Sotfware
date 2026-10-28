"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

function waNumber(phone?: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("92") ? d : d.replace(/^0/, "92");
}

/** Shows a fresh invite link with Copy and WhatsApp buttons. */
export function InviteLinkPanel({ url, name, phone, expiresAt }: { url: string; name: string; phone?: string; expiresAt?: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Assalam o Alaikum ${name.split(" ")[0]}! Welcome to Ujaagar Digital. Set your password for the sales app here (link valid for 7 days): ${url}`;
  const wa = `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`;

  return (
    <div className="rounded-[12px] border border-[var(--status-good-fg)]/30 bg-[var(--status-good-bg)] p-4">
      <p className="text-sm font-medium text-[var(--status-good-fg)]">
        Invite link for {name}
        {expiresAt && <span className="font-normal"> · valid until {formatDate(expiresAt)}</span>}
      </p>
      <p className="mt-2 rounded-[10px] bg-card px-3 py-2 font-mono text-xs break-all text-foreground">{url}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              toast.success("Link copied");
            } catch {
              toast.error("Couldn't copy. Select the link and copy it by hand.");
            }
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
        </Button>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[12px] bg-[#1f9d55] px-3 text-sm font-medium text-white hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="size-[18px]" /> Send on WhatsApp
        </a>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">The agent sets their own password. You won&apos;t see it.</p>
    </div>
  );
}
