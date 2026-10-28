import "server-only";
import { after } from "next/server";
import { Resend } from "resend";
import { appUrl } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/server";

// Email via Resend. Without RESEND_API_KEY everything here is a no-op: in-app notifications still work.

const enabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><html><body style="margin:0;background:#F5F7FB;font-family:Arial,Helvetica,sans-serif;color:#0E1C33">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E7F0">
  <tr><td style="background:#0E1C33;padding:18px 24px;color:#fff;font-weight:bold;font-size:16px">Ujaagar Digital · Sales</td></tr>
  <tr><td style="padding:24px">
    <h1 style="margin:0 0 8px;font-size:20px">${esc(title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">${esc(body)}</p>
    ${cta ? `<a href="${cta.href}" style="display:inline-block;background:#0E1C33;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:bold">${esc(cta.label)}</a>` : ""}
  </td></tr></table>
  <p style="font-size:12px;color:#94A3B8">Aapka Brand, Ab Ujaagar.</p>
  </td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, body: string, cta?: { label: string; href: string }): Promise<boolean> {
  if (!enabled()) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html: layout(subject, body, cta), text: `${body}${cta ? `\n\n${cta.href}` : ""}` });
    return !error;
  } catch {
    return false;
  }
}

/** Emails every in-app notification that hasn't been emailed yet (last 3 days). */
export async function flushNotificationEmails(): Promise<number> {
  if (!enabled()) return 0;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await admin
    .from("notifications")
    .select("id, title, body, link, user:profiles!notifications_user_id_fkey(email, is_active)")
    .is("emailed_at", null)
    .gte("created_at", since)
    .limit(100);
  let sent = 0;
  for (const n of data ?? []) {
    const user = n.user as unknown as { email: string; is_active: boolean } | null;
    if (user?.is_active) {
      const ok = await sendEmail(user.email, n.title, n.body ?? "", n.link ? { label: "Open in the portal", href: `${appUrl()}${n.link}` } : undefined);
      if (ok) sent++;
    }
    await admin.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
  }
  return sent;
}

/** Call after an action that creates notifications: emails go out once the response is sent. */
export function emailSoon() {
  if (!enabled()) return;
  after(async () => {
    await flushNotificationEmails();
  });
}
