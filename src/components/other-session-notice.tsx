import Link from "next/link";

// Shown when someone opens one portal while this browser is logged in to the other one.
export function OtherSessionNotice({ as }: { as: "agent" | "ceo" }) {
  const other = as === "agent" ? "a sales agent" : "the CEO";
  const home = as === "agent" ? "/dashboard" : "/ceo";
  return (
    <div role="status" className="mb-4 rounded-[12px] bg-[var(--status-pending-bg)] px-3.5 py-2.5 text-sm text-[var(--status-pending-fg)]">
      <p>
        This browser is logged in as {other}. One browser holds one login, so logging in here logs that account out.
        To use both portals at once, open one of them in a private (incognito) window.
      </p>
      <Link href={home} className="mt-1.5 inline-block font-medium underline underline-offset-4">
        Go back to the {as === "agent" ? "agent" : "CEO"} portal
      </Link>
    </div>
  );
}
