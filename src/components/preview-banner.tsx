import { FlaskConical } from "lucide-react";
import { isPreview } from "@/lib/env";

/** Shown on every screen while the app runs on sample data (no Supabase in .env.local). */
export function PreviewBanner() {
  if (!isPreview) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-[var(--status-pending-bg)] px-4 py-1.5 text-center text-xs font-medium text-[var(--status-pending-fg)] print:hidden">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      Preview with sample data. Nothing is saved until the database is connected.
    </div>
  );
}
