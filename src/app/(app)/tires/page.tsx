import { TireModuleHeader, TireOrdersTable } from "@/components/tires/tire-orders-table";
import { getShopId } from "@/lib/shop";
import { getTireOrderStatusCounts, listTireOrders } from "@/server/tires";
import type { TireOrderStatus } from "@/generated/prisma";

export default async function TiresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const q = sp.q ?? "";
  const page = Number(sp.page) || 1;
  const statusFilter = sp.status ?? "all";
  const status =
    statusFilter !== "all" ? (statusFilter as TireOrderStatus) : undefined;

  const [{ rows, total }, statusCounts] = await Promise.all([
    listTireOrders({ shopId, q, status, page, perPage: 25 }),
    getTireOrderStatusCounts(shopId),
  ]);

  return (
    <div className="flex flex-col gap-6 workspace-surface">
      <TireModuleHeader />
      <TireOrdersTable
        rows={rows}
        total={total}
        page={page}
        perPage={25}
        query={q}
        statusFilter={statusFilter}
        statusCounts={statusCounts}
      />
    </div>
  );
}
