import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DealStatus, LeadStatus, PaymentStatus } from "./types";

// Leads, clients and deals for the signed-in seller. RLS limits rows to their own (CEO: all).

export type Service = { id: string; name: string };

export async function getServices(activeOnly = true): Promise<(Service & { isActive: boolean })[]> {
  const supabase = await createClient();
  let q = supabase.from("services").select("id, name, is_active").order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, isActive: s.is_active }));
}

export type Note = { id: string; body: string; createdAt: string; author: string };

async function notesFor(column: "lead_id" | "deal_id", id: string): Promise<Note[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deal_notes")
    .select("id, body, created_at, author:profiles!deal_notes_author_id_fkey(full_name)")
    .eq(column, id)
    .order("created_at", { ascending: false });
  return (data ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.created_at,
    author: (n.author as unknown as { full_name: string } | null)?.full_name ?? "—",
  }));
}

export type LeadDetail = {
  id: string;
  ownerId: string;
  clientName: string;
  businessName: string | null;
  phone: string;
  whatsapp: string | null;
  city: string | null;
  source: string | null;
  services: string[];
  status: LeadStatus;
  nextFollowUpAt: string | null;
  notes: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  log: Note[];
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();
  const { data: l } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!l) return null;
  return {
    id: l.id,
    ownerId: l.owner_agent_id,
    clientName: l.client_name,
    businessName: l.business_name,
    phone: l.phone,
    whatsapp: l.whatsapp,
    city: l.city,
    source: l.source,
    services: l.interested_services ?? [],
    status: l.status,
    nextFollowUpAt: l.next_follow_up_at,
    notes: l.notes,
    clientId: l.client_id,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    log: await notesFor("lead_id", l.id),
  };
}

export type ClientRow = {
  id: string;
  name: string;
  businessName: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  ownerName: string;
  createdAt: string;
  deals: number;
  activeDeals: number;
  collected: number;
};

export async function listClients(ownerId?: string): Promise<ClientRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("clients")
    .select("id, name, business_name, phone, whatsapp, email, city, created_at, owner:profiles!clients_owner_agent_id_fkey(full_name), deals(id, status, client_payments(amount_pkr, status))")
    .order("created_at", { ascending: false });
  if (ownerId) q = q.eq("owner_agent_id", ownerId);
  const { data } = await q;
  return (data ?? []).map((c) => {
    const deals = (c.deals ?? []) as unknown as { status: DealStatus; client_payments: { amount_pkr: number; status: PaymentStatus }[] }[];
    return {
      id: c.id,
      name: c.name,
      businessName: c.business_name,
      phone: c.phone,
      whatsapp: c.whatsapp,
      email: c.email,
      city: c.city,
      ownerName: (c.owner as unknown as { full_name: string } | null)?.full_name ?? "—",
      createdAt: c.created_at,
      deals: deals.length,
      activeDeals: deals.filter((d) => d.status === "approved").length,
      collected: deals.flatMap((d) => d.client_payments ?? []).filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount_pkr), 0),
    };
  });
}

export async function getClientOptions(ownerId: string): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name, business_name").eq("owner_agent_id", ownerId).order("name");
  return (data ?? []).map((c) => ({ id: c.id, label: c.business_name ? `${c.business_name} (${c.name})` : c.name }));
}

export type DealDetail = {
  id: string;
  clientId: string;
  clientName: string;
  businessName: string | null;
  clientPhone: string;
  agentId: string;
  agentName: string;
  serviceId: string;
  service: string;
  type: "one_time" | "monthly";
  amount: number;
  startMonth: string | null;
  endMonth: string | null;
  status: DealStatus;
  description: string | null;
  rejectionReason: string | null;
  newSaleRate: number | null;
  recurringRate: number | null;
  approvedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  collected: number;
  payments: { id: string; amount: number; paidOn: string; billingMonth: string | null; method: string; status: PaymentStatus; rejectionReason: string | null; isRefund: boolean }[];
  commission: { month: string; kind: string; rate: number; amount: number }[];
  log: Note[];
};

export async function getDeal(id: string): Promise<DealDetail | null> {
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deals")
    .select(
      "*, clients(name, business_name, phone), services(name), agent:profiles!deals_agent_id_fkey(full_name), client_payments(id, amount_pkr, paid_on, billing_month, method, status, rejection_reason, refund_of)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!d) return null;
  const client = d.clients as unknown as { name: string; business_name: string | null; phone: string } | null;
  const pays = ((d.client_payments ?? []) as unknown as {
    id: string;
    amount_pkr: number;
    paid_on: string;
    billing_month: string | null;
    method: string;
    status: PaymentStatus;
    rejection_reason: string | null;
    refund_of: string | null;
  }[]).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const { data: entries } = await supabase.from("commission_entries").select("month, kind, rate_percent, amount_pkr").eq("deal_id", d.id).order("month");
  return {
    id: d.id,
    clientId: d.client_id,
    clientName: client?.name ?? "—",
    businessName: client?.business_name ?? null,
    clientPhone: client?.phone ?? "",
    agentId: d.agent_id,
    agentName: (d.agent as unknown as { full_name: string } | null)?.full_name ?? "—",
    serviceId: d.service_id,
    service: (d.services as unknown as { name: string } | null)?.name ?? "—",
    type: d.deal_type,
    amount: Number(d.deal_type === "one_time" ? d.total_amount_pkr : d.monthly_fee_pkr) || 0,
    startMonth: d.start_month,
    endMonth: d.end_month,
    status: d.status,
    description: d.description,
    rejectionReason: d.rejection_reason,
    newSaleRate: d.new_sale_rate_percent === null ? null : Number(d.new_sale_rate_percent),
    recurringRate: d.recurring_rate_percent === null ? null : Number(d.recurring_rate_percent),
    approvedAt: d.approved_at,
    nextFollowUpAt: d.next_follow_up_at,
    createdAt: d.created_at,
    collected: pays.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount_pkr), 0),
    payments: pays.map((p) => ({
      id: p.id,
      amount: Number(p.amount_pkr),
      paidOn: p.paid_on,
      billingMonth: p.billing_month,
      method: p.method,
      status: p.status,
      rejectionReason: p.rejection_reason,
      isRefund: !!p.refund_of,
    })),
    commission: (entries ?? []).map((e) => ({ month: e.month, kind: e.kind, rate: Number(e.rate_percent), amount: Number(e.amount_pkr) })),
    log: await notesFor("deal_id", d.id),
  };
}

export async function getClientDetail(id: string) {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select("*, owner:profiles!clients_owner_agent_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const { data: deals } = await supabase
    .from("deals")
    .select("id, deal_type, total_amount_pkr, monthly_fee_pkr, status, created_at, services(name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  return {
    id: c.id,
    name: c.name,
    businessName: c.business_name,
    phone: c.phone,
    whatsapp: c.whatsapp,
    email: c.email,
    city: c.city,
    ownerId: c.owner_agent_id,
    ownerName: (c.owner as unknown as { full_name: string } | null)?.full_name ?? "—",
    createdAt: c.created_at,
    deals: (deals ?? []).map((d) => ({
      id: d.id,
      type: d.deal_type,
      amount: Number(d.deal_type === "one_time" ? d.total_amount_pkr : d.monthly_fee_pkr) || 0,
      status: d.status,
      createdAt: d.created_at,
      service: (d.services as unknown as { name: string } | null)?.name ?? "—",
    })),
  };
}
