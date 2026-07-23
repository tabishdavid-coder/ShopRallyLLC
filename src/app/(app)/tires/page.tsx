import Link from "next/link";
import { Plus } from "lucide-react";

import {
  CatalogListHeader,
  CatalogListPage,
  CatalogListStats,
} from "@/components/catalog/catalog-list-chrome";
import { TireStockStatsRow } from "@/components/tires/tire-stock-stats";
import { TireStockTable } from "@/components/tires/tire-stock-table";
import { Button } from "@/components/ui/button";
import { getShopId } from "@/lib/shop";
import { getTireStockList, getTireStockStats } from "@/server/tire-stock";
import type { TireCondition } from "@/generated/prisma";

export default async function TiresPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    perPage?: string;
    condition?: string;
    lowStock?: string;
  }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const q = sp.q ?? "";
  const page = Number(sp.page) || 1;
  const perPage = Number(sp.perPage) || 25;
  const conditionRaw = sp.condition ?? "all";
  const conditionFilter: TireCondition | "all" =
    conditionRaw === "NEW" || conditionRaw === "USED" ? conditionRaw : "all";
  const lowStockFilter = sp.lowStock === "1" || sp.lowStock === "true";

  const [{ rows, total }, stats] = await Promise.all([
    getTireStockList({
      shopId,
      q,
      page,
      perPage,
      condition: conditionFilter,
      lowStock: lowStockFilter,
    }),
    getTireStockStats(shopId),
  ]);

  return (
    <CatalogListPage className="workspace-surface">
      <CatalogListHeader
        title="Tires"
        description="Tires on hand — new and used. Track size, brand, bin location, and reorder levels."
        action={
          <Button asChild className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/tires/new">
              <Plus className="size-4" />
              Tire
            </Link>
          </Button>
        }
      />
      <CatalogListStats>
        <TireStockStatsRow stats={stats} />
      </CatalogListStats>
      <TireStockTable
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        query={q}
        conditionFilter={conditionFilter}
        lowStockFilter={lowStockFilter}
      />
    </CatalogListPage>
  );
}
