import "server-only";

import { formatCents } from "@/lib/format";
import {
  parseCustomerInsightsAiResponse,
  type CustomerInsightsResult,
} from "@/lib/customer-insights-ai";
import type { CustomerInsightContext } from "@/server/customer-insights";
import { createAiMessage } from "@/server/services/ai/client";

export type { CustomerInsightsResult };
export { parseCustomerInsightsAiResponse };

function formatContext(ctx: CustomerInsightContext): string {
  const lines: string[] = [
    `Customer: ${ctx.customerName}`,
    `Marketing opt-in: ${ctx.marketingOptIn ? "yes" : "no"}`,
    `Tags: ${ctx.tags.length ? ctx.tags.join(", ") : "none"}`,
    `Lead source: ${ctx.leadSource ?? "unknown"}`,
    `Repair orders: ${ctx.repairOrderCount}`,
    `Last visit: ${ctx.lastVisitAt?.slice(0, 10) ?? "never"}`,
    `Lifetime sales: ${formatCents(ctx.lifetimeTotalCents)}`,
    `Average ticket: ${formatCents(ctx.avgTicketCents)}`,
    `Open balance: ${formatCents(ctx.openBalanceCents)}`,
    `Open ROs (not completed/invoiced): ${ctx.openRoCount}`,
    `Campaign/automation touches: ${ctx.campaignTouches}`,
    `Last campaign touch: ${ctx.lastCampaignTouchAt?.slice(0, 10) ?? "never"}`,
  ];

  if (ctx.attentionItems.length > 0) {
    lines.push("Inspection items needing attention:");
    for (const item of ctx.attentionItems) {
      lines.push(`- RO #${item.roNumber}: ${item.name} (${item.status})`);
    }
  } else {
    lines.push("Inspection items needing attention: none on file");
  }

  if (ctx.recentRepairOrders.length > 0) {
    lines.push("Recent repair orders:");
    for (const ro of ctx.recentRepairOrders) {
      lines.push(
        `- RO #${ro.number} (${ro.date}): ${ro.status}, ${formatCents(ro.totalCents)}, ${ro.vehicle}`,
      );
    }
  }

  return lines.join("\n");
}

export async function suggestCustomerInsights(
  shopId: string,
  ctx: CustomerInsightContext,
): Promise<CustomerInsightsResult> {
  const { text: raw } = await createAiMessage({
    shopId,
    feature: "CUSTOMER_INSIGHTS",
    maxTokens: 1024,
    system:
      "You analyze CRM data for an auto repair shop service advisor. " +
      "Use ONLY facts from the customer context — never invent repair orders, visits, or declined work. " +
      "Return concise bullet insights (2–5) an advisor can act on today. " +
      "Suggest one next action: book (schedule visit), call (phone follow-up), win_back (lapsed customer), " +
      "follow_up (general nurture), or none. " +
      "Do not mention AI. Respond with JSON only.",
    userContent:
      `${formatContext(ctx)}\n\n` +
      `JSON shape: {"bullets":["..."],"suggestedAction":{"type":"book|call|win_back|follow_up|none","label":"...","rationale":"..."}}`,
  });

  return parseCustomerInsightsAiResponse(raw);
}
