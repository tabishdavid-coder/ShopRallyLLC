"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_STATUS_LABEL,
} from "@/lib/campaigns";
import { GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import type { CampaignListItem } from "@/server/campaigns";
import { CampaignStatusBadge } from "@/components/marketing/campaigns/campaign-template-cards";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["ALL", "DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"] as const;

export function CampaignsList({
  campaigns,
  activeFilter,
}: {
  campaigns: CampaignListItem[];
  activeFilter: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/marketing/campaigns" : `/marketing/campaigns?status=${f}`}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              activeFilter === f
                ? "bg-brand-navy text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "ALL" ? "All" : CAMPAIGN_STATUS_LABEL[f as keyof typeof CAMPAIGN_STATUS_LABEL]}
          </Link>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No campaigns yet. Pick a template above or{" "}
          <Link href="/marketing/campaigns/new" className="font-medium text-brand-navy underline">
            create one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Sent</th>
                <th className="px-4 py-3 text-right">Delivered</th>
                <th className="px-4 py-3 text-right">Failed</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/campaigns/${c.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.type.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {CAMPAIGN_CHANNEL_LABEL[c.channel as keyof typeof CAMPAIGN_CHANNEL_LABEL]}
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.sentCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.deliveredCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.failedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CampaignsPageHeader({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {GROWTH_PRODUCTS.outreach.shortDescription}
        </p>
      </div>
      {canCreate ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-1.5 border-brand-navy/30 text-brand-navy">
            <Link href="/marketing/campaigns/winback">
              <Users className="size-4" />
              Win back customers
            </Link>
          </Button>
          <Button asChild className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/marketing/campaigns/new">
              <Plus className="size-4" />
              New outreach
            </Link>
          </Button>
        </div>
      ) : (
        <Button asChild variant="outline">
          <Link href="/settings/subscription">Upgrade for Outreach</Link>
        </Button>
      )}
    </div>
  );
}
