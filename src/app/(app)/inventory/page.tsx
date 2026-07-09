import {
  InventoryModuleHeader,
  InventoryStatsRow,
} from "@/components/inventory/inventory-stats";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { getShopId } from "@/lib/shop";
import {
  getInventoryCategories,
  getInventoryParts,
  getInventoryStats,
} from "@/server/inventory";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    perPage?: string;
    category?: string;
    lowStock?: string;
  }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const q = sp.q ?? "";
  const page = Number(sp.page) || 1;
  const perPage = Number(sp.perPage) || 25;
  const categoryFilter = sp.category ?? "all";
  const lowStockFilter = sp.lowStock === "1" || sp.lowStock === "true";

  const [{ rows, total }, stats, categories] = await Promise.all([
    getInventoryParts({
      shopId,
      q,
      page,
      perPage,
      category: categoryFilter,
      lowStock: lowStockFilter,
    }),
    getInventoryStats(shopId),
    getInventoryCategories(shopId),
  ]);

  return (
    <div className="flex flex-col gap-6 workspace-surface">
      <InventoryModuleHeader />
      <InventoryStatsRow stats={stats} />
      <InventoryTable
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        query={q}
        categoryFilter={categoryFilter}
        lowStockFilter={lowStockFilter}
        categories={categories}
      />
    </div>
  );
}
