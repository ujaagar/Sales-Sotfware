// The one place for money and date formatting. Timezone: Asia/Karachi.
export const TZ = "Asia/Karachi";

const moneyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Rs 125,000 */
export function formatPKR(amount: number | bigint | string | null | undefined): string {
  const n = Number(amount ?? 0);
  const sign = n < 0 ? "−" : "";
  return `${sign}Rs ${moneyFmt.format(Math.abs(Math.round(n)))}`;
}

export function formatRate(rate: number | string | null | undefined): string {
  return `${Number(rate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

/** Calendar date (YYYY-MM-DD) in Karachi for an instant. */
export function karachiDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at);
}

/** First day of the month (YYYY-MM-01) for a date string. */
export function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Current month in Karachi as YYYY-MM-01. */
export function currentMonth(at: Date = new Date()): string {
  return monthOf(karachiDate(at));
}

/** Adds n months to a YYYY-MM-01 month. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Day of month in Karachi (1–31). */
export function karachiDay(at: Date = new Date()): number {
  return Number(karachiDate(at).slice(8, 10));
}

/** 26 Oct 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const tz = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : TZ;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
}

/** 26 Oct 2026, 3:45 pm */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ })}`;
}

/** 2026-10-01 → October 2026 (or Oct 2026 when short) */
export function formatMonth(month: string, short = false): string {
  const d = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-GB", { month: short ? "short" : "long", year: "numeric", timeZone: "UTC" });
}

/** Last `count` months, newest first, as YYYY-MM-01. */
export function recentMonths(count = 12, at: Date = new Date()): string[] {
  const now = currentMonth(at);
  return Array.from({ length: count }, (_, i) => addMonths(now, -i));
}

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-01$/.test(v);
}

export function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
}

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in Karachi time, for datetime-local inputs. */
export function toKarachiLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  return d.toISOString().slice(0, 16);
}
