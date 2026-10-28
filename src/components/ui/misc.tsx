import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[12px] bg-muted", className)} />;
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
        <Icon className="size-6" strokeWidth={2} />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-[var(--chart-track)]", className)}
    >
      <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "pending";
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-4 sm:p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1.5 font-display text-[22px] font-semibold leading-tight sm:text-[26px]",
          tone === "good" && "text-[var(--status-good-fg)]",
          tone === "pending" && "text-[var(--status-pending-fg)]",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
