import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { LaborMatrixEditor } from "@/components/settings/matrix-editor";

export const metadata = { title: "Labor Matrix — ShopRally" };

export default async function LaborMatrixPage() {
  const shopId = await getShopId();
  const tiers = await prisma.laborMatrixTier.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <LaborMatrixEditor tiers={tiers} />
    </div>
  );
}
