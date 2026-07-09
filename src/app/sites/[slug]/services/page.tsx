import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ShopSiteFooter,
  ShopSiteHeader,
  ShopSiteServicesGrid,
} from "@/components/website-seo/shop-site";
import { publicUrl } from "@/lib/app-url";
import { getPublishedShopWebsite } from "@/server/website-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) return { title: "Not found" };

  const title = `Services | ${site.metaTitle}`;
  const description = `Auto repair services at ${site.shopName}. ${site.metaDescription}`;
  return {
    title,
    description,
    openGraph: { title, description, url: publicUrl(`/sites/${slug}/services`) },
  };
}

export default async function ShopSiteServicesPage({ params }: Props) {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <ShopSiteHeader site={site} active="services" />
      <main className="py-6">
        <ShopSiteServicesGrid site={site} />
      </main>
      <ShopSiteFooter site={site} />
    </div>
  );
}
