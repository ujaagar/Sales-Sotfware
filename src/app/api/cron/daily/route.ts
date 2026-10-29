import { flushNotificationEmails } from "@/lib/email";
import { currentMonth, karachiDate, karachiDay } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/server";

// Runs every day at 9:00 AM Karachi (04:00 UTC, see vercel.json). Protected by CRON_SECRET.
// 1) follow-up reminders  2) monthly payments missed after the due day  3) email anything pending.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const today = karachiDate();
  const endOfToday = new Date(`${today}T23:59:59+05:00`).toISOString();
  const now = new Date().toISOString();
  const result = { followUps: 0, missed: 0, emails: 0 };

  // 1. Follow-ups due today (or overdue) that haven't been reminded yet.
  const { data: leads } = await admin
    .from("leads")
    .select("id, owner_agent_id, client_name, business_name")
    .lte("next_follow_up_at", endOfToday)
    .is("follow_up_notified_at", null)
    .in("status", ["new", "contacted", "interested"]);
  for (const l of leads ?? []) {
    await admin.from("notifications").insert({
      user_id: l.owner_agent_id,
      type: "follow_up",
      title: "Follow-up today",
      body: [l.client_name, l.business_name].filter(Boolean).join(" · "),
      link: `/leads/${l.id}`,
    });
    await admin.from("leads").update({ follow_up_notified_at: now }).eq("id", l.id);
    result.followUps++;
  }
  const { data: deals } = await admin
    .from("deals")
    .select("id, agent_id, clients(name, business_name)")
    .lte("next_follow_up_at", endOfToday)
    .is("follow_up_notified_at", null)
    .in("status", ["pending_approval", "approved"]);
  for (const d of deals ?? []) {
    const c = d.clients as unknown as { name: string; business_name: string | null } | null;
    await admin.from("notifications").insert({
      user_id: d.agent_id,
      type: "follow_up",
      title: "Follow-up today",
      body: c?.business_name ?? c?.name ?? "Deal follow-up",
      link: `/deals/${d.id}`,
    });
    await admin.from("deals").update({ follow_up_notified_at: now }).eq("id", d.id);
    result.followUps++;
  }

  // 2. Monthly packages with no payment recorded for this month after the due day.
  const { data: setting } = await admin.from("app_settings").select("value").eq("key", "monthly_payment_due_day").maybeSingle();
  const dueDay = Number(setting?.value ?? 10);
  if (karachiDay() > dueDay) {
    const month = currentMonth();
    const [{ data: monthly }, { data: ceo }] = await Promise.all([
      admin
        .from("deals")
        .select("id, agent_id, monthly_fee_pkr, end_month, clients(name, business_name), client_payments(billing_month, status), monthly_due_alerts(month)")
        .eq("deal_type", "monthly")
        .eq("status", "approved")
        .lte("start_month", month),
      admin.from("profiles").select("id").eq("role", "ceo").maybeSingle(),
    ]);
    for (const d of monthly ?? []) {
      if (d.end_month && d.end_month < month) continue;
      const pays = (d.client_payments ?? []) as unknown as { billing_month: string | null; status: string }[];
      const alerts = (d.monthly_due_alerts ?? []) as unknown as { month: string }[];
      if (pays.some((p) => p.billing_month === month && p.status !== "rejected")) continue;
      if (alerts.some((a) => a.month === month)) continue;
      const c = d.clients as unknown as { name: string; business_name: string | null } | null;
      const who = c?.business_name ?? c?.name ?? "A client";
      const body = `${who} hasn't paid this month's fee (Rs ${Number(d.monthly_fee_pkr).toLocaleString("en-US")}). It was due by the ${dueDay}th.`;
      await admin.from("monthly_due_alerts").insert({ deal_id: d.id, month });
      await admin.from("notifications").insert({ user_id: d.agent_id, type: "monthly_missed", title: "Monthly payment missed", body, link: `/deals/${d.id}` });
      if (ceo && ceo.id !== d.agent_id) {
        await admin.from("notifications").insert({ user_id: ceo.id, type: "monthly_missed", title: "Monthly payment missed", body, link: `/ceo/deals/${d.id}` });
      }
      result.missed++;
    }
  }

  // 3. Email whatever is waiting.
  result.emails = await flushNotificationEmails();

  // Login and application attempts are only needed for recent lockouts; keep 30 days.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await Promise.all([
    admin.from("auth_attempts").delete().lt("created_at", cutoff),
    admin.from("application_attempts").delete().lt("created_at", cutoff),
  ]);
  return Response.json({ ok: true, date: today, ...result });
}
