import { Suspense } from "react";

import { PlatformWebsitesDashboard } from "@/components/platform/platform-websites-dashboard";
import { getShopId } from "@/lib/shop";
import {
  getPlatformWebsitesSummary,
  listPlatformWebsites,
} from "@/server/platform/websites";
import { WebsiteBuildStatus } from "@/generated/prisma";

export const metadata = { title: "Customer websites — ShopRally Master CRM" };

type SearchParams = Promise<{ filter?: string }>;

const STATUS_FILTERS = new Set<string>([
  ...Object.values(WebsiteBuildStatus),
  "all",
  "pipeline",
  "live",
  "upkeep_due",
]);

export default async function PlatformWebsitesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawFilter = params.filter ?? "all";
  const filter = STATUS_FILTERS.has(rawFilter)
    ? (rawFilter as WebsiteBuildStatus | "all" | "pipeline" | "live" | "upkeep_due")
    : "all";

  const [rows, summary, activeShopId] = await Promise.all([
    listPlatformWebsites({ status: filter }),
    getPlatformWebsitesSummary(),
    getShopId(),
  ]);

  return (
    <Suspense fallback={null}>
      <PlatformWebsitesDashboard rows={rows} summary={summary} activeShopId={activeShopId} />
    </Suspense>
  );
}
