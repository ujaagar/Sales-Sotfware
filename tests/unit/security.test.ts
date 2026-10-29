import { describe, expect, test } from "vitest";
import { cellSafe, cleanOtp, isLocked, LOGIN_LIMIT, passwordProblem, safePath } from "@/lib/security";

describe("passwordProblem", () => {
  test("accepts a reasonable password", () => {
    expect(passwordProblem("Karachi2026sales")).toBeNull();
    expect(passwordProblem("blue7horse9river")).toBeNull();
  });
  test("rejects short, letters-only, numbers-only and repeated", () => {
    expect(passwordProblem("abc12")).toMatch(/10 characters/);
    expect(passwordProblem("onlyletterspassword")).toMatch(/letters and numbers/);
    expect(passwordProblem("12345678901")).toMatch(/letters and numbers/);
    expect(passwordProblem("a".repeat(80))).toMatch(/72/);
  });
  test("rejects obvious ones and the email name", () => {
    expect(passwordProblem("Password2026")).toMatch(/obvious/);
    expect(passwordProblem("Ujaagar12345")).toMatch(/obvious/);
    expect(passwordProblem("alikhan2026!", "alikhan@test.pk")).toMatch(/email/);
  });
});

describe("safePath", () => {
  test("keeps same-site paths", () => {
    expect(safePath("/ceo/deals/1")).toBe("/ceo/deals/1");
    expect(safePath("/reset-password?x=1")).toBe("/reset-password?x=1");
  });
  test("blocks other sites and tricks", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined, "/ok\r\nSet-Cookie: x"]) {
      expect(safePath(bad, "/home")).toBe("/home");
    }
  });
});

describe("cellSafe", () => {
  test("neutralises formulas, leaves the rest", () => {
    expect(cellSafe("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(cellSafe("+92300")).toBe("'+92300");
    expect(cellSafe("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(cellSafe("-1+1")).toBe("'-1+1");
    expect(cellSafe("Bilal Foods")).toBe("Bilal Foods");
    expect(cellSafe(-1000)).toBe(-1000);
    expect(cellSafe(null)).toBeNull();
  });
});

describe("isLocked", () => {
  test("locks at the email or network limit", () => {
    expect(isLocked({ email: 4, ip: 19 }, LOGIN_LIMIT)).toBe(false);
    expect(isLocked({ email: 5, ip: 0 }, LOGIN_LIMIT)).toBe(true);
    expect(isLocked({ email: 0, ip: 20 }, LOGIN_LIMIT)).toBe(true);
  });
});

describe("cleanOtp", () => {
  test("accepts 6 digits with spaces", () => {
    expect(cleanOtp("123 456")).toBe("123456");
    expect(cleanOtp("12345")).toBeNull();
    expect(cleanOtp("12a456")).toBeNull();
  });
});
