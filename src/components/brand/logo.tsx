/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// Approved artwork only (generated from brand_assets/ by `pnpm brand:assets`).
// `on` = the surface it sits on. "auto" follows light/dark mode; "dark" is for navy surfaces.
export function Logo({ className, on = "auto" }: { className?: string; on?: "auto" | "dark" }) {
  if (on === "dark") {
    return <img src="/brand/logo-on-dark.png" alt="Ujaagar Digital" className={cn("h-10 w-auto", className)} />;
  }
  return (
    <>
      <img src="/brand/logo-on-light.png" alt="Ujaagar Digital" className={cn("h-10 w-auto dark:hidden", className)} />
      <img src="/brand/logo-on-dark.png" alt="Ujaagar Digital" className={cn("hidden h-10 w-auto dark:block", className)} />
    </>
  );
}

export function Mark({ className, on = "auto" }: { className?: string; on?: "auto" | "dark" }) {
  if (on === "dark") {
    return <img src="/brand/mark-on-dark.png" alt="" aria-hidden className={cn("size-8", className)} />;
  }
  return (
    <>
      <img src="/brand/mark-on-light.png" alt="" aria-hidden className={cn("size-8 dark:hidden", className)} />
      <img src="/brand/mark-on-dark.png" alt="" aria-hidden className={cn("hidden size-8 dark:block", className)} />
    </>
  );
}
