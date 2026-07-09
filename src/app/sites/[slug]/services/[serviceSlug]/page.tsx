import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ShopSiteFooter,
  ShopSiteHeader,
} from "@/components/website-seo/shop-site";
import { Button } from "@/components/ui/button";
import { findServiceBySlug } from "@/lib/service-slugs";
import { publicUrl } from "@/lib/app-url";
import { getPublishedShopWebsite } from "@/server/website-seo";

type Props = { params: Promise<{ slug: string; serviceSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, serviceSlug: svcSlug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) return { title: "Not found" };

  const service = findServiceBySlug(site.services, svcSlug);
  if (!service) return { title: "Not found" };

  const title = `${service.title} | ${site.shopName}${site.city ? ` · ${site.city}` : ""}`;
  const description = service.description.slice(0, 160);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: publicUrl(`/sites/${slug}/services/${svcSlug}`),
    },
  };
}

export default async function ShopSiteServiceDetailPage({ params }: Props) {
  const { slug, serviceSlug: svcSlug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) notFound();

  const service = findServiceBySlug(site.services, svcSlug);
  if (!service) notFound();

  const base = `/sites/${slug}`;

  return (
    <div className="min-h-dvh bg-background">
      <ShopSiteHeader site={site} active="services" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-muted-foreground">
          <Link href={`${base}/services`} className="text-brand-navy hover:underline">
            All services
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">
          {service.title}
        </h1>
        {site.city ? (
          <p className="mt-1 text-muted-foreground">
            {site.shopName} · {site.city}
            {site.state ? `, ${site.state}` : ""}
          </p>
        ) : null}
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{service.description}</p>
        {site.onlineBookingEnabled && site.bookingSlug ? (
          <Button asChild className="mt-8 bg-brand-navy hover:bg-brand-navy/90">
            <Link href={publicUrl(`/book/${site.bookingSlug}`)}>Book this service</Link>
          </Button>
        ) : null}
      </main>
      <ShopSiteFooter site={site} />
    </div>
  );
}
