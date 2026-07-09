import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { PartsMatrixEditor } from "@/components/settings/matrix-editor";

export const metadata = { title: "Parts Matrix — ShopRally" };

export default async function PartsMatrixPage() {
  const shopId = await getShopId();
  const tiers = await prisma.partMatrixTier.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <PartsMatrixEditor tiers={tiers} />
    </div>
  );
}
