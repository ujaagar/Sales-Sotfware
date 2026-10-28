// Database rules and RLS, run against the real migrations in PGlite.
import { beforeAll, describe, expect, test } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, as, freshDb } from "./harness";

let db: PGlite;
let ceo: string, ali: string, sara: string;
let serviceId: string;

async function rejects(p: Promise<unknown>, msg?: RegExp) {
  await expect(p).rejects.toThrow(msg);
}

async function ins<T = { id: string }>(tx: { query: PGlite["query"] }, sql: string, params: unknown[] = []) {
  const r = await tx.query<T>(sql, params);
  return r.rows[0];
}

beforeAll(async () => {
  db = await freshDb();
  ceo = await addUser(db, "ceo", "Owner");
  ali = await addUser(db, "agent", "Ali");
  sara = await addUser(db, "agent", "Sara");
  serviceId = (await db.query<{ id: string }>("select id from public.services order by name limit 1")).rows[0].id;
});

async function newClient(agent: string, phone: string, name = "Client") {
  return as(db, agent, (tx) =>
    ins(tx, "insert into public.clients (owner_agent_id, name, phone) values ($1, $2, $3) returning id", [agent, name, phone]),
  );
}

async function newDeal(agent: string, clientId: string, type: "one_time" | "monthly", amount: number, startMonth?: string) {
  return as(db, agent, (tx) =>
    type === "one_time"
      ? ins(tx, "insert into public.deals (client_id, agent_id, service_id, deal_type, total_amount_pkr) values ($1,$2,$3,'one_time',$4) returning id", [clientId, agent, serviceId, amount])
      : ins(tx, "insert into public.deals (client_id, agent_id, service_id, deal_type, monthly_fee_pkr, start_month) values ($1,$2,$3,'monthly',$4,$5) returning id", [clientId, agent, serviceId, amount, startMonth]),
  );
}

async function approve(dealId: string, newRate = 12, recRate: number | null = null) {
  return as(db, ceo, (tx) =>
    tx.query("update public.deals set status='approved', approved_at=now(), approved_by=$2, new_sale_rate_percent=$3, recurring_rate_percent=$4 where id=$1", [dealId, ceo, newRate, recRate]),
  );
}

async function pay(agent: string, dealId: string, amount: number, paidOn: string) {
  return as(db, agent, (tx) =>
    ins(tx, "insert into public.client_payments (deal_id, agent_id, amount_pkr, paid_on, method, proof_file_path) values ($1,$2,$3,$4,'cash',$5) returning id", [dealId, agent, amount, paidOn, `${agent}/r.jpg`]),
  );
}

describe("accounts", () => {
  test("a second CEO cannot exist, even from the setup context", async () => {
    await rejects(addUser(db, "ceo", "Second"), /duplicate key|profiles_single_ceo/);
  });

  test("roles cannot be changed by anyone", async () => {
    await rejects(db.query("update public.profiles set role='ceo' where id=$1", [ali]), /Roles cannot be changed/);
    await rejects(as(db, ali, (tx) => tx.query("update public.profiles set role='ceo' where id=$1", [ali])), /Roles cannot be changed/);
  });

  test("CEO cannot create another CEO through the app", async () => {
    const id = crypto.randomUUID();
    await db.query("insert into auth.users (id, email) values ($1, 'x@test.pk')", [id]);
    await rejects(
      as(db, ceo, (tx) => tx.query("insert into public.profiles (id, full_name, email, role) values ($1,'X','x@test.pk','ceo')", [id])),
    );
  });

  test("agents cannot activate themselves or see other profiles", async () => {
    await rejects(as(db, ali, (tx) => tx.query("update public.profiles set is_active=false where id=$1", [ali])), /cannot change/);
    const rows = await as(db, ali, (tx) => tx.query("select id from public.profiles"));
    expect(rows.rows).toHaveLength(1);
  });

  test("the CEO cannot be deactivated", async () => {
    await rejects(as(db, ceo, (tx) => tx.query("update public.profiles set is_active=false where id=$1", [ceo])), /cannot be deactivated/);
  });

  test("agents and anon cannot read applications or invites", async () => {
    await db.query("insert into public.agent_applications (full_name, email, phone, city) values ('Applicant','a@b.pk','03001112223','Karachi')");
    const r = await as(db, ali, (tx) => tx.query("select * from public.agent_applications"));
    expect(r.rows).toHaveLength(0);
    const c = await as(db, ceo, (tx) => tx.query("select * from public.agent_applications"));
    expect(c.rows).toHaveLength(1);
    await rejects(as(db, ceo, (tx) => tx.query("select * from public.agent_invites")).then((r) => {
      if (r.rows.length === 0) throw new Error("no rows");
    }));
  });

  test("duplicate open application (same phone, different format) is refused", async () => {
    await rejects(db.query("insert into public.agent_applications (full_name, email, phone, city) values ('Bee Khan','other@b.pk','+92 300 1112223','Lahore')"), /duplicate key/);
  });
});

describe("agents see only their own data", () => {
  test("leads, clients, deals are private to their owner", async () => {
    const c = await newClient(sara, "03211234567", "Sara Client");
    await newDeal(sara, c.id, "one_time", 40000);
    const seen = await as(db, ali, async (tx) => ({
      clients: (await tx.query("select * from public.clients where owner_agent_id=$1", [sara])).rows.length,
      deals: (await tx.query("select * from public.deals where agent_id=$1", [sara])).rows.length,
    }));
    expect(seen).toEqual({ clients: 0, deals: 0 });
  });

  test("an agent cannot create records for someone else", async () => {
    await rejects(as(db, ali, (tx) => tx.query("insert into public.leads (owner_agent_id, client_name, phone) values ($1,'X','03009999999')", [sara])));
  });

  test("agents cannot see or change rates, settings, locks or the activity log", async () => {
    const r = await as(db, ali, async (tx) => ({
      tiers: (await tx.query("select * from public.commission_tiers")).rows.length,
      settings: (await tx.query("select * from public.app_settings")).rows.length,
      log: (await tx.query("select * from public.activity_log")).rows.length,
    }));
    expect(r).toEqual({ tiers: 0, settings: 0, log: 0 });
    await rejects(as(db, ali, (tx) => tx.query("insert into public.commission_tiers (kind, min_amount_pkr, rate_percent, effective_from) values ('new_sale',0,50,'2026-01-01')")));
  });

  test("duplicate phone owned by another agent is blocked and the CEO is told who tried", async () => {
    await newClient(ali, "0300-5550001", "Ali Client");
    const res = await as(db, sara, (tx) => tx.query<{ r: string }>("select public.check_contact('+92 300 5550001') r"));
    expect(res.rows[0].r).toBe("other");
    await rejects(newClient(sara, "923005550001"), /already registered/);
    const n = await db.query("select * from public.notifications where user_id=$1 and type='duplicate_contact'", [ceo]);
    expect(n.rows.length).toBe(1);
    const mine = await as(db, ali, (tx) => tx.query<{ r: string }>("select public.check_contact('03005550001') r"));
    expect(mine.rows[0].r).toBe("mine");
  });
});

describe("deals and payments", () => {
  let clientId: string;
  let dealId: string;

  beforeAll(async () => {
    clientId = (await newClient(ali, "03331112233", "Bilal Foods")).id;
    dealId = (await newDeal(ali, clientId, "one_time", 100000)).id;
  });

  test("new deals start pending and notify the CEO", async () => {
    const d = await db.query<{ status: string }>("select status from public.deals where id=$1", [dealId]);
    expect(d.rows[0].status).toBe("pending_approval");
    const n = await db.query("select * from public.notifications where user_id=$1 and type='deal_submitted'", [ceo]);
    expect(n.rows.length).toBeGreaterThan(0);
  });

  test("an agent cannot approve their own deal or record payments before approval", async () => {
    await as(db, ali, (tx) => tx.query("update public.deals set status='approved' where id=$1", [dealId]));
    const d = await db.query<{ status: string }>("select status from public.deals where id=$1", [dealId]);
    expect(d.rows[0].status).toBe("pending_approval");
    await rejects(pay(ali, dealId, 10000, "2026-10-05"), /approved deals/);
  });

  test("approval requires the rate snapshot, and then it is locked", async () => {
    await rejects(as(db, ceo, (tx) => tx.query("update public.deals set status='approved', approved_at=now() where id=$1", [dealId])));
    await approve(dealId, 12);
    await rejects(as(db, ceo, (tx) => tx.query("update public.deals set new_sale_rate_percent=18 where id=$1", [dealId])), /locked/);
    await rejects(as(db, ali, (tx) => tx.query("update public.deals set description='changed' where id=$1", [dealId])), /cannot be edited/);
  });

  test("payments can't go over a one-time deal's total", async () => {
    await pay(ali, dealId, 60000, "2026-10-05");
    await rejects(pay(ali, dealId, 50000, "2026-10-06"), /go over the deal total/);
  });

  test("agents cannot verify; the CEO verifies with commission entries", async () => {
    const p = (await db.query<{ id: string }>("select id from public.client_payments where deal_id=$1", [dealId])).rows[0];
    await as(db, ali, (tx) => tx.query("update public.client_payments set status='verified' where id=$1", [p.id])).catch(() => {});
    expect((await db.query<{ status: string }>("select status from public.client_payments where id=$1", [p.id])).rows[0].status).toBe(
      "pending_verification",
    );
    await rejects(as(db, ali, (tx) => tx.query("select public.verify_payment($1, '[]')", [p.id])), /Only the CEO/);

    const entries = JSON.stringify([
      { deal_id: dealId, agent_id: ali, month: "2026-10-01", kind: "new_sale", base_amount_pkr: 60000, rate_percent: 12, amount_pkr: 7200, description: "Bilal Foods" },
    ]);
    await as(db, ceo, (tx) => tx.query("select public.verify_payment($1, $2::jsonb)", [p.id, entries]));
    const period = await db.query<{ collected_amount_pkr: string; commission_amount_pkr: string }>(
      "select collected_amount_pkr, commission_amount_pkr from public.commission_periods where agent_id=$1 and month='2026-10-01'",
      [ali],
    );
    expect(Number(period.rows[0].commission_amount_pkr)).toBe(7200);
    expect(Number(period.rows[0].collected_amount_pkr)).toBe(60000);

    await rejects(as(db, ceo, (tx) => tx.query("update public.client_payments set amount_pkr=1 where id=$1", [p.id])), /Verified payments cannot be changed/);
    const mine = await as(db, ali, (tx) => tx.query("select * from public.commission_entries"));
    expect(mine.rows).toHaveLength(1);
    const theirs = await as(db, sara, (tx) => tx.query("select * from public.commission_entries"));
    expect(theirs.rows).toHaveLength(0);
  });

  test("locked months are frozen", async () => {
    await as(db, ceo, (tx) => tx.query("update public.commission_periods set status='locked' where agent_id=$1 and month='2026-10-01'", [ali]));
    await rejects(
      as(db, ceo, (tx) => tx.query("update public.commission_periods set commission_amount_pkr=0 where agent_id=$1 and month='2026-10-01'", [ali])),
      /Locked/,
    );
    const p2 = await pay(ali, dealId, 40000, "2026-10-20");
    const entries = JSON.stringify([
      { deal_id: dealId, agent_id: ali, month: "2026-10-01", kind: "new_sale", base_amount_pkr: 40000, rate_percent: 12, amount_pkr: 4800, description: "x" },
    ]);
    await rejects(as(db, ceo, (tx) => tx.query("select public.verify_payment($1, $2::jsonb)", [p2.id, entries])), /locked/);
  });

  test("financial records cannot be deleted", async () => {
    await rejects(db.query("delete from public.deals where id=$1", [dealId]), /cannot be deleted/);
  });
});

describe("monthly deals and reassignment", () => {
  test("payments outside start/end month are refused", async () => {
    const c = await newClient(ali, "03451234567", "Monthly Co");
    const d = await newDeal(ali, c.id, "monthly", 80000, "2026-09-01");
    await approve(d.id, 12, 1.5);
    await rejects(pay(ali, d.id, 80000, "2026-08-15"), /outside/);
    await as(db, ceo, (tx) => tx.query("update public.deals set end_month='2026-10-01' where id=$1", [d.id]));
    await pay(ali, d.id, 80000, "2026-10-03");
    await rejects(pay(ali, d.id, 80000, "2026-11-03"), /outside/);
  });

  test("only the CEO reassigns; history is kept and open deals move", async () => {
    const c = await newClient(ali, "03011231234", "Moving Co");
    const d = await newDeal(ali, c.id, "monthly", 50000, "2026-09-01");
    await rejects(as(db, ali, (tx) => tx.query("update public.clients set owner_agent_id=$2 where id=$1", [c.id, sara])), /Only the CEO/);
    await as(db, ceo, (tx) => tx.query("update public.clients set owner_agent_id=$2 where id=$1", [c.id, sara]));
    const h = await db.query<{ agent_id: string; to_date: string | null }>(
      "select agent_id, to_date from public.client_owner_history where client_id=$1 order by created_at",
      [c.id],
    );
    expect(h.rows.map((r) => r.agent_id)).toEqual([ali, sara]);
    expect(h.rows[0].to_date).not.toBeNull();
    const deal = await db.query<{ agent_id: string; original_agent_id: string }>("select agent_id, original_agent_id from public.deals where id=$1", [d.id]);
    expect(deal.rows[0]).toEqual({ agent_id: sara, original_agent_id: ali });
    const log = await db.query("select * from public.activity_log where entity_id=$1 and action='clients.reassigned'", [c.id]);
    expect(log.rows).toHaveLength(1);
  });

  test("deactivated agents cannot add leads", async () => {
    const zed = await addUser(db, "agent", "Zed", false);
    await rejects(as(db, zed, (tx) => tx.query("insert into public.leads (owner_agent_id, client_name, phone) values ($1,'Q','03119998887')", [zed])));
  });
});

describe("leaderboard and notifications", () => {
  test("agents see only their own exact amount", async () => {
    const rows = await as(db, sara, (tx) =>
      tx.query<{ agent_id: string; collected_pkr: string | null; share_percent: string }>("select * from public.leaderboard('2026-10-01')"),
    );
    const aliRow = rows.rows.find((r) => r.agent_id === ali)!;
    expect(aliRow.collected_pkr).toBeNull();
    expect(Number(aliRow.share_percent)).toBe(100);
    const ceoRows = await as(db, ceo, (tx) => tx.query<{ agent_id: string; collected_pkr: string }>("select * from public.leaderboard('2026-10-01')"));
    expect(Number(ceoRows.rows.find((r) => r.agent_id === ali)!.collected_pkr)).toBe(60000);
  });

  test("users can only mark their notifications as read", async () => {
    await rejects(as(db, ali, (tx) => tx.query("update public.notifications set title='x' where user_id=$1", [ali])));
    await as(db, ali, (tx) => tx.query("update public.notifications set read_at=now() where user_id=$1", [ali]));
    const others = await as(db, ali, (tx) => tx.query("select * from public.notifications where user_id<>$1", [ali]));
    expect(others.rows).toHaveLength(0);
  });
});

describe("policy acceptance", () => {
  test("agents record only their own acceptance, and it can't be changed", async () => {
    const insert = (who: string, forWhom: string) =>
      as(db, who, (tx) =>
        tx.query(
          "insert into public.policy_acceptances (agent_id, policy_version, language, typed_name, cnic) values ($1, '2026-10-27', 'en', 'Ali Khan', '42101-1234567-1')",
          [forWhom],
        ),
      );
    await insert(ali, ali);
    await rejects(insert(ali, sara));
    await rejects(insert(ali, ali), /duplicate key/);
    const upd = await as(db, ali, (tx) => tx.query("update public.policy_acceptances set typed_name='X' where agent_id=$1", [ali]));
    expect(upd.affectedRows ?? 0).toBe(0);
    await rejects(db.query("update public.policy_acceptances set typed_name='X' where agent_id=$1", [ali]), /append-only/);
    await rejects(db.query("delete from public.policy_acceptances where agent_id=$1", [ali]), /cannot be deleted/);
    const seenBySara = await as(db, sara, (tx) => tx.query("select * from public.policy_acceptances"));
    expect(seenBySara.rows).toHaveLength(0);
    const seenByCeo = await as(db, ceo, (tx) => tx.query("select * from public.policy_acceptances"));
    expect(seenByCeo.rows).toHaveLength(1);
  });
});

describe("function permissions", () => {
  test("users cannot call internal functions directly", async () => {
    await rejects(
      as(db, ali, (tx) => tx.query("select public.notify($1, 'x', 'Fake', null, null)", [ceo])),
      /permission denied/,
    );
  });
});

describe("storage", () => {
  test("agents can only upload into their own folder", async () => {
    await as(db, ali, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)", [`${ali}/a.jpg`]));
    await rejects(as(db, ali, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)", [`${sara}/a.jpg`])));
    const seen = await as(db, sara, (tx) => tx.query("select * from storage.objects"));
    expect(seen.rows).toHaveLength(0);
  });
});
