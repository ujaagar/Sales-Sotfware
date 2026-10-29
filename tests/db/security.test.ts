// Security rules from 20261029120000_security.sql, run against the real migrations in PGlite.
import { beforeAll, describe, expect, test } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, as, freshDb } from "./harness";

let db: PGlite;
let ceo: string, ali: string, stranger: string;

beforeAll(async () => {
  db = await freshDb();
  ceo = await addUser(db, "ceo", "Owner");
  ali = await addUser(db, "agent", "Ali");
  // Someone who created a Supabase account directly: auth user, but no profile.
  stranger = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, 'stranger@test.pk')", [stranger]);
});

const isCeo = (user: string, aal: "aal1" | "aal2") =>
  as(db, user, (tx) => tx.query<{ v: boolean }>("select public.is_ceo() as v"), { aal }).then((r) => r.rows[0].v);

describe("CEO 2-step verification in the database", () => {
  test("without 2-step set up, the CEO password session works", async () => {
    expect(await isCeo(ceo, "aal1")).toBe(true);
  });

  test("an unfinished (unverified) setup changes nothing", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')", [ceo]);
    expect(await isCeo(ceo, "aal1")).toBe(true);
  });

  test("once 2-step is on, a password-only session is not treated as CEO", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [ceo]);
    expect(await isCeo(ceo, "aal1")).toBe(false);
    expect(await isCeo(ceo, "aal2")).toBe(true);
  });

  test("a password-only CEO session cannot read agents' data or change settings", async () => {
    await as(db, ali, (tx) => tx.query("insert into public.leads (owner_agent_id, client_name, phone) values ($1, 'Real lead', '03111234567')", [ali]));
    const leads = await as(db, ceo, (tx) => tx.query("select * from public.leads"), { aal: "aal1" });
    expect(leads.rows).toHaveLength(0);
    const leads2 = await as(db, ceo, (tx) => tx.query("select * from public.leads"), { aal: "aal2" });
    expect(leads2.rows).toHaveLength(1);
    const apps = await as(db, ceo, (tx) => tx.query("select * from public.activity_log"), { aal: "aal1" });
    expect(apps.rows).toHaveLength(0);
    await expect(
      as(db, ceo, (tx) => tx.query("insert into public.services (name) values ('Hacked')"), { aal: "aal1" }),
    ).rejects.toThrow();
  });

  test("agents are never CEO, whatever their session level", async () => {
    expect(await isCeo(ali, "aal2")).toBe(false);
  });

  test("current_viewer reports the 2-step status", async () => {
    const me = await as(db, ceo, (tx) => tx.query<{ role: string; mfa_enrolled: boolean }>("select * from public.current_viewer()"), { aal: "aal1" });
    expect(me.rows[0]).toMatchObject({ role: "ceo", mfa_enrolled: true });
    const agent = await as(db, ali, (tx) => tx.query<{ mfa_enrolled: boolean }>("select * from public.current_viewer()"));
    expect(agent.rows[0].mfa_enrolled).toBe(false);
    const none = await as(db, stranger, (tx) => tx.query("select * from public.current_viewer()"));
    expect(none.rows).toHaveLength(0);
  });
});

describe("accounts made outside the app", () => {
  test("cannot upload payment proofs, even into their own folder", async () => {
    await expect(
      as(db, stranger, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)", [`${stranger}/x.jpg`])),
    ).rejects.toThrow();
  });

  test("cannot add leads or read anything private", async () => {
    await expect(
      as(db, stranger, (tx) => tx.query("insert into public.leads (owner_agent_id, client_name, phone) values ($1, 'X', '03001234567')", [stranger])),
    ).rejects.toThrow();
    const seen = await as(db, stranger, (tx) => tx.query("select * from public.profiles"));
    expect(seen.rows).toHaveLength(0);
  });

  test("active agents can still upload into their own folder", async () => {
    await as(db, ali, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)", [`${ali}/ok.jpg`]));
  });
});

describe("login attempts table", () => {
  test("signed-in users cannot read or write it", async () => {
    await expect(as(db, ali, (tx) => tx.query("select * from public.auth_attempts"))).rejects.toThrow(/permission denied/);
    await expect(
      as(db, ali, (tx) => tx.query("insert into public.auth_attempts (kind, email_hash, ip_hash) values ('login','a','b')")),
    ).rejects.toThrow(/permission denied/);
  });
});
