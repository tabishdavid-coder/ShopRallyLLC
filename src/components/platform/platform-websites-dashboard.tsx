"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Globe, Inbox, Plus } from "lucide-react";

import { EnterShopCrmButton } from "@/components/platform/enter-shop-crm-button";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { Button } from "@/components/ui/button";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import {
  WEBSITE_BUILD_STATUS,
  WEBSITE_BUILD_STATUS_STYLES,
  isLiveWebsiteStatus,
  isPipelineWebsiteStatus,
  type WebsiteBuildStatusValue,
} from "@/lib/website-build-pipeline";
import { cn } from "@/lib/utils";
import { startWebsiteBuild } from "@/server/actions/platform-websites";
import type {
  PlatformWebsiteRow,
  PlatformWebsitesSummary,
} from "@/server/platform/websites";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const FILTERS = [
  { id: "all", label: "All shops" },
  { id: "pipeline", label: "In pipeline" },
  { id: "live", label: "Live" },
  { id: "upkeep_due", label: "Upkeep due" },
  { id: WEBSITE_BUILD_STATUS.QUOTE_REQUESTED, label: "Quote requested" },
  { id: WEBSITE_BUILD_STATUS.IN_BUILD, label: "In build" },
  { id: WEBSITE_BUILD_STATUS.CLIENT_REVIEW, label: "Client review" },
  { id: WEBSITE_BUILD_STATUS.UPKEEP, label: "Upkeep" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function PlatformWebsitesDashboard({
  rows,
  summary,
  activeShopId,
}: {
  rows: PlatformWebsiteRow[];
  summary: PlatformWebsitesSummary;
  activeShopId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = (searchParams.get("filter") as FilterId) || "all";
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    if (activeFilter === "all") return rows;
    if (activeFilter === "pipeline") {
      return rows.filter((r) => isPipelineWebsiteStatus(r.buildStatus));
    }
    if (activeFilter === "live") {
      return rows.filter((r) => isLiveWebsiteStatus(r.buildStatus));
    }
    if (activeFilter === "upkeep_due") {
      return rows.filter((r) => r.reviewOverdue);
    }
    return rows.filter((r) => r.buildStatus === activeFilter);
  }, [rows, activeFilter]);

  function setFilter(id: FilterId) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("filter");
    else params.set("filter", id);
    router.push(`${MASTER_CRM_HOME}/websites?${params.toString()}`);
  }

  function handleStartBuild(shopId: string) {
    setError(null);
    start(async () => {
      const res = await startWebsiteBuild(shopId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6" data-planned-change="PLAT-05">
      <PlatformPageIntro
        title="Customer websites"
        description="Track ShopSite builds you launch for shops — from quote request through launch and ongoing upkeep. Content edits live in each shop's CRM."
      >
        <Button asChild variant="outline" size="sm" className="border-brand-navy/30">
          <Link href={`${MASTER_CRM_HOME}/support`}>Website build tickets</Link>
        </Button>
      </PlatformPageIntro>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard icon={Globe} label="Shops tracked" value={summary.total} />
        <PlatformKpiCard icon={Plus} label="In pipeline" value={summary.pipeline} sub="Not live yet" />
        <PlatformKpiCard icon={Globe} label="Live sites" value={summary.live} tint="bg-emerald-100 text-emerald-700" />
        <PlatformKpiCard icon={AlertTriangle} label="Upkeep due" value={summary.upkeepDue} sub="Review overdue" />
        <PlatformKpiCard icon={Inbox} label="Open requests" value={summary.openRequests} sub="WEBSITE_BUILD tickets" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === f.id
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">SEO</th>
              <th className="px-4 py-3">Next review</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.shopId} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`${MASTER_CRM_HOME}/websites/${row.shopId}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {row.shopName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.shopCode}
                    {row.city ? ` · ${row.city}${row.state ? `, ${row.state}` : ""}` : ""}
                  </p>
                  {activeShopId === row.shopId ? (
                    <p className="text-xs text-brand-navy">Active context</p>
                  ) : null}
                  {row.openBuildTicketId ? (
                    <Link
                      href={`${MASTER_CRM_HOME}/support?ticket=${row.openBuildTicketId}`}
                      className="mt-0.5 block text-xs text-sky-700 hover:underline"
                    >
                      Open build request
                    </Link>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      WEBSITE_BUILD_STATUS_STYLES[row.buildStatus as WebsiteBuildStatusValue],
                    )}
                  >
                    {row.buildStatusLabel}
                  </span>
                  {row.reviewOverdue ? (
                    <p className="mt-1 text-[10px] font-medium text-brand-red">Review overdue</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.published ? "Live" : "Draft"}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                  {row.customDomain ?? row.slug}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.seoScore}%</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.nextReviewDueAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {row.buildStatus === WEBSITE_BUILD_STATUS.NOT_STARTED ||
                    row.buildStatus === WEBSITE_BUILD_STATUS.QUOTE_REQUESTED ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-brand-navy/30 text-brand-navy"
                        disabled={pending}
                        onClick={() => handleStartBuild(row.shopId)}
                      >
                        Start build
                      </Button>
                    ) : null}
                    {row.published ? (
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                        <a href={row.siteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    <EnterShopCrmButton
                      shopId={row.shopId}
                      shopName={row.shopName}
                      size="sm"
                      variant="outline"
                      className="h-8 border-brand-navy/30 text-brand-navy"
                    >
                      Shop CRM
                    </EnterShopCrmButton>
                    <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                      <Link href={`${MASTER_CRM_HOME}/websites/${row.shopId}`}>Manage</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No shops match this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
