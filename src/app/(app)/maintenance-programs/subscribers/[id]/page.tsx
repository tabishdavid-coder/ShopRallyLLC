import { notFound } from "next/navigation";

import { SubscriptionDetailView } from "@/components/maintenance/subscription-detail-view";
import { appUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { getSubscriptionDetail } from "@/server/maintenance-subscriptions";
import { getSubscriptionServiceProfile } from "@/server/maintenance-service-visits";
import { prisma } from "@/db/client";

export const metadata = { title: "Subscriber — Maintenance Programs" };
export const dynamic = "force-dynamic";

export default async function SubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = await getShopId();
  const canAccess = await canUseFeature(shopId, "maintenance_programs");
  if (!canAccess) notFound();

  const user = await getCurrentUser();
  const techName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const [sub, shop, profile] = await Promise.all([
    getSubscriptionDetail(shopId, id),
    prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }),
    getSubscriptionServiceProfile(shopId, id),
  ]);
  if (!sub || !shop || !profile) notFound();

  const memberUrl = await appUrl(`/member/${sub.memberPortalToken}`);

  return (
    <SubscriptionDetailView
      sub={sub}
      profile={profile}
      shopName={shop.name}
      memberUrl={memberUrl}
      defaultTechnicianName={techName}
    />
  );
}
