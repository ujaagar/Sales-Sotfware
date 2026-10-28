import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

/** Signs the user out (server action). `variant="row"` for menu lists, `"icon"` for headers. */
export function LogoutButton({ variant = "row", className }: { variant?: "row" | "icon" | "nav"; className?: string }) {
  return (
    <form action={signOut} className={className}>
      {variant === "row" ? (
        <button
          type="submit"
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[var(--status-bad-fg)] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <LogOut className="size-5" aria-hidden />
          <span className="flex-1 font-medium">Log out</span>
        </button>
      ) : (
        <button
          type="submit"
          aria-label="Log out"
          title="Log out"
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 transition-transform",
            variant === "nav" ? "text-nav-foreground hover:bg-nav-active hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <LogOut className="size-5" />
        </button>
      )}
    </form>
  );
}
