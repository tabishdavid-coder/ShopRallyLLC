import Link from "next/link";

import { CampaignTemplateCards } from "@/components/marketing/campaigns/campaign-template-cards";
import {
  CampaignsList,
  CampaignsPageHeader,
} from "@/components/marketing/campaigns/campaigns-list";
import { GROWTH_ENGINE, GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { listCampaigns, getCampaignContext } from "@/server/campaigns";
import type { CampaignStatus } from "@/generated/prisma";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.outreach.label),
};
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set([
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
]);

export default async function MarketingCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const shopId = await getShopId();
  const params = await searchParams;
  const statusFilter = params.status?.toUpperCase() ?? "ALL";
  const status =
    statusFilter !== "ALL" && VALID_STATUSES.has(statusFilter)
      ? (statusFilter as CampaignStatus)
      : undefined;

  const [canCreate, campaigns, ctx] = await Promise.all([
    canUseReleasedFeature(shopId, "marketing_campaigns"),
    listCampaigns(shopId, status),
    getCampaignContext(shopId),
  ]);

  return (
    <div className="space-y-8 workspace-surface">
      <CampaignsPageHeader canCreate={canCreate} />

      {canCreate ? (
        <Link
          href="/marketing/campaigns/winback"
          className="flex items-center justify-between gap-4 rounded-lg border border-brand-navy/20 bg-gradient-to-r from-brand-light/20 to-brand-light/5 p-4 transition-colors hover:border-brand-navy/40"
        >
          <div>
            <p className="font-semibold text-brand-navy">Win back lapsed customers</p>
            <p className="text-sm text-muted-foreground">
              Target customers who haven&apos;t visited in 6, 12, or 18+ months — with pre-built
              templates and optional offers.
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-medium text-white">
            Get started
          </span>
        </Link>
      ) : null}

      {!canCreate ? (
        <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-4 text-sm">
          {GROWTH_ENGINE.upgradeHint}{" "}
          <Link href="/settings/subscription" className="font-medium text-brand-navy underline">
            View subscription
          </Link>
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Campaign templates</h2>
          <p className="text-sm text-muted-foreground">
            Pre-built {GROWTH_ENGINE.name} templates — customize audience, message, and schedule.
          </p>
        </div>
        <CampaignTemplateCards disabled={!canCreate} />
      </section>

      {!ctx.googleReviewsConnected ? (
        <div className="flex items-center gap-2 rounded-lg border border-brand-light/40 bg-brand-light/10 p-4 text-sm">
          <p>
            <strong>Google Review Request</strong> campaigns work best with Google connected.{" "}
            <Link href="/marketing/reviews" className="font-medium text-brand-navy underline">
              Connect Google Reviews
            </Link>
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My campaigns</h2>
        <CampaignsList campaigns={campaigns} activeFilter={statusFilter} />
      </section>
    </div>
  );
}
