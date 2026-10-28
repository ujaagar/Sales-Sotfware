import "server-only";
import { isPreview } from "@/lib/env";
import {
  SAMPLE_AGENT,
  SAMPLE_CEO,
  sampleAgentDashboard,
  sampleApproval,
  sampleCeoDashboard,
  sampleDeals,
  sampleLeaderboard,
  sampleLeads,
  samplePaymentDetail,
} from "@/lib/preview/sample";
import {
  getAgentDashboardLive,
  getApprovalLive,
  getCeoDashboardLive,
  getDealsLive,
  getLeaderboardLive,
  getLeadsLive,
  getPaymentDetailLive,
  getViewerLive,
} from "./live";
import type { AgentDashboard, ApprovalDetail, CeoDashboard, DealRow, LeadRow, LeaderboardRow, PaymentDetail, Viewer } from "./types";

// Every page reads data through these functions: sample data in preview mode, Supabase otherwise.

export async function getViewer(portal: "agent" | "ceo"): Promise<Viewer | null> {
  if (isPreview) return portal === "ceo" ? SAMPLE_CEO : SAMPLE_AGENT;
  return getViewerLive();
}

export async function getAgentDashboard(viewer: Viewer): Promise<AgentDashboard> {
  return isPreview ? sampleAgentDashboard(viewer.id) : getAgentDashboardLive(viewer);
}

export async function getLeads(viewer: Viewer): Promise<LeadRow[]> {
  return isPreview ? sampleLeads(viewer.id) : getLeadsLive(viewer);
}

export async function getDeals(viewer: Viewer): Promise<DealRow[]> {
  return isPreview ? sampleDeals(viewer.role === "agent" ? viewer.id : undefined) : getDealsLive(viewer);
}

export async function getLeaderboard(viewer: Viewer): Promise<LeaderboardRow[]> {
  return isPreview ? sampleLeaderboard(viewer.role === "ceo" ? null : viewer.id) : getLeaderboardLive(viewer);
}

export async function getCeoDashboard(): Promise<CeoDashboard> {
  return isPreview ? sampleCeoDashboard() : getCeoDashboardLive();
}

export async function getApproval(id: string): Promise<ApprovalDetail | null> {
  return isPreview ? sampleApproval(id) : getApprovalLive(id);
}

export async function getPaymentDetail(id: string): Promise<PaymentDetail | null> {
  return isPreview ? samplePaymentDetail(id) : getPaymentDetailLive(id);
}
