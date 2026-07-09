import { notFound } from "next/navigation";

import { PlatformWebsiteDetailView } from "@/components/platform/platform-website-detail";
import { getPlatformWebsiteDetail } from "@/server/platform/websites";

export const metadata = { title: "Website project — ShopRally Master CRM" };

type Params = Promise<{ shopId: string }>;

export default async function PlatformWebsiteDetailPage({ params }: { params: Params }) {
  const { shopId } = await params;
  const site = await getPlatformWebsiteDetail(shopId);
  if (!site) notFound();
  return <PlatformWebsiteDetailView site={site} />;
}
