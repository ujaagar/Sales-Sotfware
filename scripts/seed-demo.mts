// Demo data for a DEVELOPMENT project: 3 agents, services, leads, deals and payments across two months.
// Run after seed:ceo:  pnpm seed:demo
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { entryForPayment, rateSnapshot, type Tier } from "../src/lib/commission/index";
import { addMonths, currentMonth, karachiDate } from "../src/lib/format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const pw = process.env.DEMO_AGENT_PASSWORD ?? "";
if (!url || !key) throw new Error("Supabase URL and service role key must be set in .env.local.");
if (pw.length < 10) throw new Error("Set DEMO_AGENT_PASSWORD (10+ characters) in .env.local.");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const must = <T,>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no data"}`);
  return r.data as NonNullable<T>;
};

const ceo = must(await db.from("profiles").select("id").eq("role", "ceo").maybeSingle(), "Find CEO (run seed:ceo first)");
const already = await db.from("profiles").select("id").like("email", "%.demo@ujaagar.test");
if ((already.data ?? []).length > 0) {
  console.log("Demo data already exists. Nothing to do.");
  process.exit(0);
}

const thisMonth = currentMonth();
const lastMonth = addMonths(thisMonth, -1);
const today = karachiDate();
const day = (month: string, d: number) => `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;

const services = must(await db.from("services").select("id, name"), "Services");
const svc = (name: string) => services.find((s) => s.name === name)!.id;
const tierRows = must(await db.from("commission_tiers").select("*"), "Tiers");
const tiers: Tier[] = tierRows.map((t) => ({
  id: t.id,
  kind: t.kind,
  min: Number(t.min_amount_pkr),
  max: t.max_amount_pkr === null ? null : Number(t.max_amount_pkr),
  rate: Number(t.rate_percent),
  effectiveFrom: t.effective_from,
}));

// Placeholder receipt image
const receipt = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#F5F7FB" } })
  .composite([{ input: Buffer.from(`<svg width="600" height="400"><text x="40" y="200" font-size="40" fill="#0E1C33" font-family="sans-serif">Demo receipt</text></svg>`) }])
  .png()
  .toBuffer();

async function agent(full_name: string, slug: string, city: string) {
  const email = `${slug}.demo@ujaagar.test`;
  const u = await db.auth.admin.createUser({ email, password: pw, email_confirm: true, app_metadata: { role: "agent" }, user_metadata: { full_name } });
  if (u.error) throw new Error(`Create ${email}: ${u.error.message}`);
  const id = u.data.user.id;
  must(await db.from("profiles").insert({ id, full_name, email, role: "agent", city, phone: "0300-0000000" }).select().single(), "Profile");
  must(
    await db
      .from("agent_applications")
      .insert({ full_name, email, phone: `0300${Math.floor(1000000 + Math.random() * 8999999)}`, city, status: "approved", source: "ceo", reviewed_by: ceo.id, reviewed_at: new Date().toISOString(), profile_id: id })
      .select()
      .single(),
    "Application",
  );
  must(await db.storage.from("payment-proofs").upload(`${id}/demo-receipt.png`, receipt, { contentType: "image/png", upsert: true }), "Receipt");
  return { id, name: full_name, email };
}

const ali = await agent("Ali Khan", "ali", "Karachi");
const sara = await agent("Sara Ahmed", "sara", "Lahore");
const usman = await agent("Usman Tariq", "usman", "Karachi");
const agents = { [ali.id]: { active: true, isCeo: false }, [sara.id]: { active: true, isCeo: false }, [usman.id]: { active: true, isCeo: false } };

async function client(owner: string, name: string, business: string, phone: string) {
  return must(await db.from("clients").insert({ owner_agent_id: owner, name, business_name: business, phone, whatsapp: phone, city: "Karachi" }).select().single(), "Client");
}

type DealArgs = { agentId: string; clientId: string; service: string; type: "one_time" | "monthly"; amount: number; startMonth?: string; description: string };
async function deal(a: DealArgs, approve: boolean | "reject" = true) {
  const d = must(
    await db
      .from("deals")
      .insert({
        client_id: a.clientId,
        agent_id: a.agentId,
        service_id: svc(a.service),
        deal_type: a.type,
        description: a.description,
        total_amount_pkr: a.type === "one_time" ? a.amount : null,
        monthly_fee_pkr: a.type === "monthly" ? a.amount : null,
        start_month: a.type === "monthly" ? a.startMonth : null,
      })
      .select()
      .single(),
    "Deal",
  );
  if (approve === "reject") {
    must(await db.from("deals").update({ status: "rejected", rejection_reason: "Please confirm the scope with the client first." }).eq("id", d.id).select().single(), "Reject");
  } else if (approve) {
    const snap = rateSnapshot({ type: a.type, totalAmount: a.amount, monthlyFee: a.amount }, tiers, lastMonth);
    must(
      await db
        .from("deals")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: ceo.id,
          new_sale_rate_percent: snap.newSaleRate,
          recurring_rate_percent: snap.recurringRate,
          new_sale_tier_id: snap.newSaleTierId,
          recurring_tier_id: snap.recurringTierId,
        })
        .eq("id", d.id)
        .select()
        .single(),
      "Approve",
    );
  }
  return must(await db.from("deals").select("*, clients(name), services(name)").eq("id", d.id).single(), "Reload deal");
}

async function payment(d: Awaited<ReturnType<typeof deal>>, amount: number, paidOn: string, verify: boolean, billingMonth?: string) {
  const p = must(
    await db
      .from("client_payments")
      .insert({ deal_id: d.id, agent_id: d.agent_id, amount_pkr: amount, paid_on: paidOn, billing_month: billingMonth ?? null, method: "bank_transfer", proof_file_path: `${d.agent_id}/demo-receipt.png` })
      .select()
      .single(),
    "Payment",
  );
  if (!verify) return;
  const owners = must(await db.from("client_owner_history").select("agent_id, from_date, to_date").eq("client_id", d.client_id), "Owners");
  const entry = entryForPayment(
    { amount, paidOn, billingMonth: p.billing_month },
    {
      id: d.id,
      type: d.deal_type,
      totalAmount: d.total_amount_pkr,
      monthlyFee: d.monthly_fee_pkr,
      startMonth: d.start_month,
      originalAgentId: d.original_agent_id,
      newSaleRate: Number(d.new_sale_rate_percent),
      recurringRate: d.recurring_rate_percent === null ? null : Number(d.recurring_rate_percent),
      label: `${(d.clients as { name: string }).name} · ${(d.services as { name: string }).name}`,
    },
    {
      owners: owners.map((o) => ({ agentId: o.agent_id, fromDate: o.from_date, toDate: o.to_date })),
      agents,
      recurringStopsWhenInactive: true,
      isLocked: () => false,
      currentMonth: thisMonth,
    },
  );
  must(await db.from("client_payments").update({ status: "verified", verified_by: ceo.id, verified_at: new Date().toISOString() }).eq("id", p.id).select().single(), "Verify");
  if (entry) must(await db.from("commission_entries").insert({ ...entry, payment_id: p.id }).select().single(), "Entry");
}

// Ali: monthly SMM client (new sale last month, recurring this month) + one-time website.
const bilal = await client(ali.id, "Bilal Ahmed", "Bilal Foods", "0300-1234567");
const bilalDeal = await deal({ agentId: ali.id, clientId: bilal.id, service: "Social Media Management", type: "monthly", amount: 80000, startMonth: lastMonth, description: "Monthly SMM package: 20 posts + reels" });
await payment(bilalDeal, 80000, day(lastMonth, 5), true);
await payment(bilalDeal, 80000, day(thisMonth, 3), true);

const bakers = await client(ali.id, "Hina Siddiqui", "Karachi Bakers", "0321-7654321");
const bakersDeal = await deal({ agentId: ali.id, clientId: bakers.id, service: "Website Development", type: "one_time", amount: 250000, description: "E-commerce website with WhatsApp ordering" });
await payment(bakersDeal, 150000, day(lastMonth, 18), true);
await payment(bakersDeal, 100000, today, false);

// Sara: monthly Meta ads (big fee) + one-time video.
const studio = await client(sara.id, "Ayesha Malik", "Style Studio", "0333-1112223");
const studioDeal = await deal({ agentId: sara.id, clientId: studio.id, service: "Meta Ads", type: "monthly", amount: 160000, startMonth: lastMonth, description: "Meta ads management incl. ad budget handling" });
await payment(studioDeal, 160000, day(lastMonth, 10), true);
await payment(studioDeal, 160000, today, false);

const gym = await client(sara.id, "Faraz Ali", "Iron Gym", "0345-9998887");
const gymDeal = await deal({ agentId: sara.id, clientId: gym.id, service: "Video Editing", type: "one_time", amount: 45000, description: "5 promo reels" });
await payment(gymDeal, 45000, day(thisMonth, 2), true);

// Usman: one deal waiting for approval, one rejected.
const tech = await client(usman.id, "Kamran Shah", "Tech Hub", "0301-4445556");
await deal({ agentId: usman.id, clientId: tech.id, service: "SEO", type: "monthly", amount: 60000, startMonth: thisMonth, description: "Local SEO, 3 months minimum" }, false);
const cafe = await client(usman.id, "Nadia Khan", "Chai Cafe", "0302-1231231");
await deal({ agentId: usman.id, clientId: cafe.id, service: "Branding & Design", type: "one_time", amount: 35000, description: "Logo and menu design" }, "reject");

// Leads in different stages, some with follow-ups today.
const followUp = new Date(Date.now() + 2 * 3600_000).toISOString();
const leads = [
  [ali.id, "Zain Abbas", "Zain Motors", "0300-5551110", "interested", followUp],
  [ali.id, "Mariam Q", "MQ Boutique", "0300-5551111", "contacted", null],
  [ali.id, "Owais", "Owais Traders", "0300-5551112", "new", null],
  [sara.id, "Rabia", "Rabia Salon", "0300-5551113", "interested", followUp],
  [sara.id, "Hamza", "HZ Realty", "0300-5551114", "not_interested", null],
  [usman.id, "Danish", "Danish Pharmacy", "0300-5551115", "new", followUp],
  [usman.id, "Sana", "Sana Clinic", "0300-5551116", "lost", null],
] as const;
for (const [owner, name, business, phone, status, fu] of leads) {
  must(
    await db.from("leads").insert({ owner_agent_id: owner, client_name: name, business_name: business, phone, city: "Karachi", source: "Referral", status, next_follow_up_at: fu }).select().single(),
    "Lead",
  );
}

// Targets for this month
for (const [id, amt] of [[ali.id, 300000], [sara.id, 300000], [usman.id, 150000]] as const) {
  await db.from("agent_targets").insert({ agent_id: id, month: thisMonth, target_amount_pkr: amt });
}

console.log("✔ Demo data created. Agents (password from DEMO_AGENT_PASSWORD):");
for (const a of [ali, sara, usman]) console.log(`   ${a.name}: ${a.email}`);
