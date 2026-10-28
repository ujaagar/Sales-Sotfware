import { cn } from "@/lib/utils";

type Tone = "pending" | "good" | "bad" | "brand" | "gray";

const TONE: Record<Tone, string> = {
  pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
  good: "bg-[var(--status-good-bg)] text-[var(--status-good-fg)]",
  bad: "bg-[var(--status-bad-bg)] text-[var(--status-bad-fg)]",
  brand: "bg-[var(--status-brand-bg)] text-[var(--status-brand-fg)]",
  gray: "bg-[var(--status-gray-bg)] text-[var(--status-gray-fg)]",
};

const STATUS: Record<string, [Tone, string]> = {
  pending_approval: ["pending", "Pending approval"],
  pending_verification: ["pending", "Pending verification"],
  pending: ["pending", "Pending"],
  approved: ["good", "Approved"],
  verified: ["good", "Verified"],
  rejected: ["bad", "Rejected"],
  completed: ["brand", "Completed"],
  cancelled: ["gray", "Cancelled"],
  open: ["pending", "Estimated"],
  locked: ["brand", "Final"],
  missed: ["bad", "Missed"],
  due: ["pending", "Due"],
  paid: ["good", "Paid"],
  // lead stages
  new: ["brand", "New"],
  contacted: ["brand", "Contacted"],
  interested: ["brand", "Interested"],
  converted: ["good", "Converted"],
  not_interested: ["gray", "Not interested"],
  lost: ["gray", "Lost"],
};

/** Status colours are fixed app-wide and always carry a text label. */
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const [tone, text] = STATUS[status] ?? ["gray", status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label ?? text}
    </span>
  );
}
