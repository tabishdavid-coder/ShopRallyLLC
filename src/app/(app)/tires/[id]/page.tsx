import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { TireOrderDetailView } from "@/components/tires/tire-order-detail";
import { Button } from "@/components/ui/button";
import { getShopId } from "@/lib/shop";
import { getTireOrder } from "@/server/tires";

export default async function TireOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getTireOrder(await getShopId(), id);
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-4 workspace-surface">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/tires">
          <ChevronLeft className="mr-1 size-4" />
          Back to tires
        </Link>
      </Button>
      <TireOrderDetailView order={order} />
    </div>
  );
}
