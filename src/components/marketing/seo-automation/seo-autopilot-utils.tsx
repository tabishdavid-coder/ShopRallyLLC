"use client";

import type { SeoAutomationAdmin } from "@/lib/seo-automation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const SOURCE_LABEL: Record<string, string> = {
  MICROSITE: "ShopRally microsite",
  CUSTOM_DOMAIN: "Custom domain",
  EXTERNAL: "External site",
};

export function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusBadge(property: SeoAutomationAdmin["properties"][number]) {
  if (property.status === "PAUSED") {
    return <Badge variant="outline">Paused</Badge>;
  }
  if (property.status === "PENDING_VERIFICATION") {
    return <Badge variant="secondary">Pending verification</Badge>;
  }
  if (property.automationEnabled) {
    return <Badge className="bg-brand-navy text-white hover:bg-brand-navy/90">Autopilot on</Badge>;
  }
  return <Badge variant="outline">Manual only</Badge>;
}

export function scoreClass(score: number): string {
  return cn(
    "font-semibold tabular-nums",
    score >= 80 ? "text-green-700" : score >= 50 ? "text-amber-700" : "text-brand-red",
  );
}

export function deltaLabel(pct: number | null): string | null {
  if (pct == null) return null;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs prior 28 days`;
}

export function jobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "AUDIT":
      return "Weekly SEO audit";
    case "CONTENT":
      return "Content autopilot";
    default:
      return jobType.replace(/_/g, " ").toLowerCase();
  }
}
