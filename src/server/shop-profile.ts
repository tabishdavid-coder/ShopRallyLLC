import "server-only";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";

export type ShopProfileView = {
  id: string;
  name: string;
  code: string;
  masterId: string;
  masterIdCreatedAt: Date;
  bookingSlug: string | null;
  shopIdLabel: string | null;
  licenseNo: string | null;
  taxId: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

/** Shop profile for Settings → Shop Profile (owner read-only on Master ID). */
export async function getShopProfile(shopId?: string): Promise<ShopProfileView | null> {
  const id = shopId ?? (await getShopId());
  return prisma.shop.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      masterId: true,
      masterIdCreatedAt: true,
      bookingSlug: true,
      shopIdLabel: true,
      licenseNo: true,
      taxId: true,
      address: true,
      address2: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      email: true,
      website: true,
      logoUrl: true,
    },
  });
}
