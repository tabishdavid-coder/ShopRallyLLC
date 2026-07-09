import "server-only";

import type { PlatformGrowthStats, PlatformGrowthTrendPoint, PlatformRevenueByPlan } from "@/server/platform/growth-stats";
import { getPlatformGrowthStats } from "@/server/platform/growth-stats";
import { getPlatformAiUsageSummary, type PlatformAiUsageSummary } from "@/server/platform/ai-usage";
import { listPlatformShops, type PlatformShopRow } from "@/server/platform-shops";
import { listPlatformSupportTickets, type PlatformSupportTicketRow } from "@/server/platform/support";
import {
  getPlatformWebsitesSummary,
  type PlatformWebsitesSummary,
} from "@/server/platform/websites";
import {
  getPlatformShopHealth,
  platformShopHealthLabel,
  type PlatformShopHealth,
} from "@/lib/platform-shop-health";

export type PlatformAlert = {
  id: string;
  tone: "warning" | "info";
  title: string;
  description: string;
  href: string;
};

export type PlatformDashboard = {
  growth: PlatformGrowthStats;
  aiUsage: PlatformAiUsageSummary;
  websites: PlatformWebsitesSummary;
  recentShops: PlatformShopRow[];
  recentTickets: PlatformSupportTicketRow[];
  alerts: PlatformAlert[];
};

export type { PlatformGrowthStats, PlatformGrowthTrendPoint, PlatformRevenueByPlan, PlatformAiUsageSummary };
export { getPlatformShopHealth, platformShopHealthLabel, type PlatformShopHealth };

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const [growth, aiUsage, websites, shops, tickets] = await Promise.all([
    getPlatformGrowthStats(),
    getPlatformAiUsageSummary(),
    getPlatformWebsitesSummary(),
    listPlatformShops(),
    listPlatformSupportTickets({ limit: 8 }),
  ]);

  const recentShops = [...shops]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const alerts: PlatformAlert[] = [];

  if (growth.pastDueCount > 0) {
    alerts.push({
      id: "past-due",
      tone: "warning",
      title: `${growth.pastDueCount} shop${growth.pastDueCount === 1 ? "" : "s"} past due`,
      description: "Review billing status and follow up before access is restricted.",
      href: "/platform/billing?filter=past_due",
    });
  }

  if (growth.suspendedCount > 0) {
    alerts.push({
      id: "suspended",
      tone: "warning",
      title: `${growth.suspendedCount} suspended shop${growth.suspendedCount === 1 ? "" : "s"}`,
      description: "Shops with restricted access — investigate churn risk.",
      href: "/platform/shops",
    });
  }

  if (growth.openTicketCount > 0) {
    alerts.push({
      id: "open-tickets",
      tone: growth.openTicketCount > 5 ? "warning" : "info",
      title: `${growth.openTicketCount} open support ticket${growth.openTicketCount === 1 ? "" : "s"}`,
      description: "Demo requests, trials, and shop support need a response.",
      href: "/platform/support?status=open",
    });
  }

  if (growth.openLeadCount > 0) {
    alerts.push({
      id: "open-leads",
      tone: growth.openLeadCount > 3 ? "warning" : "info",
      title: `${growth.openLeadCount} open marketing lead${growth.openLeadCount === 1 ? "" : "s"}`,
      description: "Demo and trial signups waiting for follow-up or shop provisioning.",
      href: "/platform/leads",
    });
  }

  if (growth.trialsEndingSoon7d > 0) {
    alerts.push({
      id: "trials-ending",
      tone: "info",
      title: `${growth.trialsEndingSoon7d} trial${growth.trialsEndingSoon7d === 1 ? "" : "s"} ending within 7 days`,
      description: "Reach out to convert or extend before trial expires.",
      href: "/platform/billing?filter=trial",
    });
  }

  if (growth.onboarding.readyToLaunchCount > 0) {
    alerts.push({
      id: "ready-launch",
      tone: "info",
      title: `${growth.onboarding.readyToLaunchCount} shop${growth.onboarding.readyToLaunchCount === 1 ? "" : "s"} ready to go live`,
      description: "Onboarding checklist nearly complete — push for conversion.",
      href: "/platform/onboarding",
    });
  }

  if (websites.upkeepDue > 0) {
    alerts.push({
      id: "website-upkeep",
      tone: "warning",
      title: `${websites.upkeepDue} website${websites.upkeepDue === 1 ? "" : "s"} need upkeep review`,
      description: "Scheduled operator review is overdue for live ShopSite tenants.",
      href: "/platform/websites?filter=upkeep_due",
    });
  }

  if (websites.openRequests > 0) {
    alerts.push({
      id: "website-build-requests",
      tone: "info",
      title: `${websites.openRequests} open website build request${websites.openRequests === 1 ? "" : "s"}`,
      description: "Shops waiting on quote, build, or launch — triage in Customer websites or Support.",
      href: "/platform/websites?filter=pipeline",
    });
  }

  return {
    growth,
    aiUsage,
    websites,
    recentShops,
    recentTickets: tickets.slice(0, 6),
    alerts,
  };
}
