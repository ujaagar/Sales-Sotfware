// View models shared by the pages. Filled from Supabase, or from sample data in preview mode.
import type { DealType } from "@/lib/commission";

export type Viewer = { id: string; name: string; email: string; role: "ceo" | "agent" };

export type LeadStatus = "new" | "contacted" | "interested" | "not_interested" | "converted" | "lost";
export type DealStatus = "pending_approval" | "approved" | "rejected" | "completed" | "cancelled";
export type PaymentStatus = "pending_verification" | "verified" | "rejected";

export type LeadRow = {
  id: string;
  clientName: string;
  businessName: string | null;
  phone: string;
  city: string | null;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  services: string[];
};

export type DealRow = {
  id: string;
  clientName: string;
  businessName: string | null;
  agentName: string;
  service: string;
  type: DealType;
  amount: number; // total (one-time) or monthly fee
  startMonth: string | null;
  status: DealStatus;
  createdAt: string;
  collected: number;
};

export type PaymentRow = {
  id: string;
  dealId: string;
  clientName: string;
  agentName: string;
  amount: number;
  paidOn: string;
  method: string;
  status: PaymentStatus;
};

export type FollowUp = { id: string; kind: "lead" | "deal"; name: string; business: string | null; at: string; phone: string };

export type Balance = { earnedLocked: number; earnedEstimated: number; earned: number; paid: number; pending: number };

export type AgentDashboard = {
  month: string;
  collectedThisMonth: number;
  commissionThisMonth: number;
  target: number | null;
  rank: number | null;
  balance: Balance;
  followUpsToday: FollowUp[];
  leads: LeadRow[];
  deals: DealRow[];
  recentPayments: PaymentRow[];
};

export type AgentPerformance = { id: string; name: string; collected: number; target: number | null; commission: number; activeDeals: number };

export type MonthlyDueRow = { dealId: string; clientName: string; agentName: string; fee: number; state: "paid" | "due" | "missed" };

export type CeoDashboard = {
  month: string;
  collected: number;
  collectedLastMonth: number;
  commission: { estimated: number; locked: number; paid: number; liability: number };
  pendingApprovals: number;
  pendingVerifications: number;
  pendingApplications: number;
  agents: AgentPerformance[];
  salesByService: { service: string; amount: number }[];
  collectedByMonth: { month: string; amount: number }[];
  monthlyDeals: MonthlyDueRow[];
  approvals: DealRow[];
  verifications: PaymentRow[];
};

export type ApprovalDetail = DealRow & {
  description: string | null;
  clientPhone: string;
  agentEmail: string;
  slabLabel: string;
  newSaleRate: number;
  recurringSlabLabel: string | null;
  recurringRate: number | null;
  expected: { total: number | null; firstMonth: number | null; laterMonths: number | null };
};

export type LeaderboardRow = { rank: number; agentId: string; name: string; collected: number | null; sharePercent: number; isMe: boolean };

export type PaymentDetail = PaymentRow & {
  billingMonth: string | null;
  note: string | null;
  createdAt: string;
  proofUrl: string | null;
  proofIsPdf: boolean;
  dealType: "one_time" | "monthly";
  dealAmount: number;
  dealCollected: number;
  service: string;
  newSaleRate: number | null;
  recurringRate: number | null;
  commission: { kind: "new_sale" | "recurring"; rate: number; amount: number; agentName: string; note: string | null } | null;
};
