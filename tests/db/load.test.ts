import { test, expect } from "vitest";
import { freshDb } from "./harness";

test("migrations load and default rates are seeded", async () => {
  const db = await freshDb();
  const r = await db.query<{ n: number }>("select count(*)::int n from public.commission_tiers");
  expect(r.rows[0].n).toBe(7);
});
