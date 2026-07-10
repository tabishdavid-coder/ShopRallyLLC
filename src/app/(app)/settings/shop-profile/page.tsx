import { notFound } from "next/navigation";

import { ShopProfile } from "@/components/settings/shop-profile";
import { getShopProfile } from "@/server/shop-profile";

export const metadata = { title: "Shop Profile — Shop Settings" };

export default async function ShopProfilePage() {
  const shop = await getShopProfile();
  if (!shop) notFound();

  return <ShopProfile shop={shop} />;
}
