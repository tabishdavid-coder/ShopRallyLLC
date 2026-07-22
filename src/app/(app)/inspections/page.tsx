import { getInspections } from "@/server/inspections";
import { getShopId } from "@/lib/shop";
import { InspectionsTable } from "@/components/inspections/inspections-table";
import { InspectionTemplatesAdmin } from "@/components/inspections/inspection-templates-admin";
import { InspectionStatus } from "@/generated/prisma";
import { listInspectionTemplatesForPicker } from "@/server/inspection-templates";

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
      : Object.values(InspectionStatus).includes(statusRaw as InspectionStatus)
        ? (statusRaw as InspectionStatus)
        : "ALL";

  const [{ rows, total }, templates] = await Promise.all([
    getInspections({
      shopId,
      q,
      page,
      perPage,
      status,
    }),
    listInspectionTemplatesForPicker(shopId),
  ]);

  return (
    <div className="space-y-4 workspace-surface">
      <div>
        <h1 className="text-lg font-semibold">Inspections</h1>
        <p className="text-sm text-muted-foreground">
          Manage inspection templates and review digital vehicle inspections across repair orders.
        </p>
      </div>

      <InspectionTemplatesAdmin templates={templates} />

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
