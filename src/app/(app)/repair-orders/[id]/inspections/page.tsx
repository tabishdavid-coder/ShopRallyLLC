import { notFound } from "next/navigation";

import { getRepairOrder } from "@/server/repair-order";
import { getShopId } from "@/lib/shop";
import { InspectionEditor } from "@/components/inspections/inspection-editor";
import { customerDisplayName } from "@/lib/format";
import type { InspectionDetail } from "@/server/inspections";
import { inspectionProgress } from "@/lib/inspection";

export default async function RoInspectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id });
  if (!ro) notFound();

  const inspections: InspectionDetail[] = ro.inspections.map((insp) => {
    const items = insp.items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      status: i.status,
      note: i.note,
      photoUrls: i.photoUrls,
      sortOrder: i.sortOrder,
    }));
    return {
      id: insp.id,
      templateName: insp.templateName,
      status: insp.status,
      performedAt: insp.performedAt,
      shareToken: insp.shareToken,
      items,
      progress: inspectionProgress(items),
    };
  });

  const phones = [
    ro.customer.phone ? { label: `${ro.customer.phone} - Mobile`, value: ro.customer.phone } : null,
    ro.customer.altPhone ? { label: `${ro.customer.altPhone} - Other`, value: ro.customer.altPhone } : null,
  ].filter((p): p is { label: string; value: string } => Boolean(p));

  return (
    <InspectionEditor
      roId={ro.id}
      roNumber={ro.number}
      customerFirstName={ro.customer.firstName}
      shopName={ro.shop.name}
      phones={phones}
      email={ro.customer.email}
      inspections={inspections}
    />
  );
}
