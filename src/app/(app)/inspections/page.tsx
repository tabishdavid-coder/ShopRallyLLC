import { getInspections } from "@/server/inspections";
import { getShopId } from "@/lib/shop";
import { InspectionsTable } from "@/components/inspections/inspections-table";
import { InspectionStatus } from "@/generated/prisma";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    perPage?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const q = sp.q ?? "";
  const page = Number(sp.page) || 1;
  const perPage = Number(sp.perPage) || 15;
  const statusRaw = sp.status ?? "ALL";
  const status =
    statusRaw === "ALL" || !statusRaw
      ? "ALL"
      : (Object.values(InspectionStatus).includes(statusRaw as InspectionStatus)
          ? (statusRaw as InspectionStatus)
          : "ALL");

  const { rows, total } = await getInspections({
    shopId,
    q,
    page,
    perPage,
    status,
  });

  return (
    <div className="space-y-4 workspace-surface">
      <div>
        <h1 className="text-lg font-semibold">Inspections</h1>
        <p className="text-sm text-muted-foreground">
          Digital vehicle inspections across all repair orders — filter by status, RO, or customer.
        </p>
      </div>
      <InspectionsTable
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        query={q}
        status={status}
      />
    </div>
  );
}
