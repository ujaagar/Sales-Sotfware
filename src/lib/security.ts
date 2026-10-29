// Small security rules shared by the server and the forms. Pure functions, unit-tested.

export const PASSWORD_MIN = 10;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with letters and numbers.`;

/** Why a new password is not allowed, or null when it is fine. */
export function passwordProblem(password: string, email?: string | null): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > 72) return "Use 72 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers.";
  if (/^(.)\1+$/.test(password)) return "Choose a less obvious password.";
  const lower = password.toLowerCase();
  const local = email?.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Don't use your email in the password.";
  if (COMMON.some((w) => lower.startsWith(w))) return "Choose a less obvious password.";
  return null;
}
const COMMON = ["password", "12345678", "qwerty", "pakistan", "ujaagar", "abc12345", "11111111", "iloveyou", "admin123"];

/** Only same-site paths like "/ceo/deals/1". Blocks "//evil.com", "/\\evil.com" and full URLs. */
export function safePath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\") || /[\r\n\t]/.test(path)) return fallback;
  return path;
}

/** Stops spreadsheet formulas sneaking into CSV/Excel exports (e.g. a client named "=HYPERLINK(...)"). */
export function cellSafe<T>(value: T): T | string {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export const LOGIN_LIMIT = { windowMinutes: 15, perEmail: 5, perIp: 20 };
export const RESET_LIMIT = { windowMinutes: 60, perEmail: 3, perIp: 10 };

/** Blocked when recent failures for this email or this network reach the limit. */
export function isLocked(recent: { email: number; ip: number }, limit: { perEmail: number; perIp: number }): boolean {
  return recent.email >= limit.perEmail || recent.ip >= limit.perIp;
}

/** A 6-digit authenticator code, spaces allowed. */
export function cleanOtp(code: string): string | null {
  const c = code.replace(/\s/g, "");
  return /^\d{6}$/.test(c) ? c : null;
}
