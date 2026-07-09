import { notFound } from "next/navigation";

import { MemberPortalView } from "@/components/maintenance/member-portal-view";
import { getSubscriptionByPortalToken } from "@/server/maintenance-subscriptions";
import { prisma } from "@/db/client";

export const metadata = { title: "My membership" };

export default async function MemberPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sub = await getSubscriptionByPortalToken(token);
  if (!sub) notFound();

  const shop = await prisma.shop.findUnique({
    where: { id: sub.shopId },
    select: { name: true, phone: true, bookingSlug: true, code: true },
  });
  if (!shop) notFound();

  return (
    <MemberPortalView
      shopName={shop.name}
      shopPhone={shop.phone}
      bookingSlug={shop.bookingSlug ?? shop.code.toLowerCase()}
      sub={sub}
    />
  );
}
