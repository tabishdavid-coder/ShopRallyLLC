import {
  TireStockModuleHeader,
  TireStockStatsRow,
} from "@/components/tires/tire-stock-stats";
import { TireStockTable } from "@/components/tires/tire-stock-table";
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
    <div className="flex flex-col gap-6 workspace-surface">
      <TireStockModuleHeader />
      <TireStockStatsRow stats={stats} />
      <TireStockTable
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        query={q}
        conditionFilter={conditionFilter}
        lowStockFilter={lowStockFilter}
      />
    </div>
  );
}
