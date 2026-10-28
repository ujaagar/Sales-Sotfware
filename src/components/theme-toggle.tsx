"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const ORDER = ["system", "light", "dark"] as const;
const LABEL = { system: "System theme", light: "Light theme", dark: "Dark theme" };
const ICON = { system: Laptop, light: Sun, dark: Moon };

const subscribe = () => () => {};

/** Cycles system → light → dark. */
export function ThemeToggle({ className, tone = "default" }: { className?: string; tone?: "default" | "nav" }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = (mounted ? theme : "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current] ?? Laptop;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={LABEL[current]}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform",
        tone === "nav" ? "text-nav-foreground hover:bg-nav-active hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
