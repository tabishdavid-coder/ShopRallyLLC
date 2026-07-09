import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ShopSiteAbout,
  ShopSiteFooter,
  ShopSiteHeader,
  ShopSiteHero,
  ShopSiteReviews,
  ShopSiteServicesGrid,
} from "@/components/website-seo/shop-site";
import { publicUrl } from "@/lib/app-url";
import {
  buildLocalBusinessJsonLd,
  getPublishedShopWebsite,
} from "@/server/website-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) return { title: "Not found" };

  const url = publicUrl(`/sites/${slug}`);
  return {
    title: site.metaTitle,
    description: site.metaDescription,
    keywords: site.keywords.length ? site.keywords : undefined,
    openGraph: {
      title: site.metaTitle,
      description: site.metaDescription,
      url,
      type: "website",
      siteName: site.shopName,
    },
    twitter: {
      card: "summary_large_image",
      title: site.metaTitle,
      description: site.metaDescription,
    },
    alternates: { canonical: url },
  };
}

export default async function ShopSiteHomePage({ params }: Props) {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) notFound();

  const siteUrl = publicUrl(`/sites/${slug}`);
  const jsonLd = site.schemaEnabled ? buildLocalBusinessJsonLd(site, siteUrl) : null;

  return (
    <div className="min-h-dvh bg-background">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {site.googleAnalyticsId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${site.googleAnalyticsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.googleAnalyticsId}');`,
            }}
          />
        </>
      ) : null}
      <ShopSiteHeader site={site} active="home" />
      <main>
        <ShopSiteHero site={site} />
        <ShopSiteServicesGrid site={site} />
        <ShopSiteAbout site={site} />
        <ShopSiteReviews site={site} />
      </main>
      <ShopSiteFooter site={site} />
    </div>
  );
}
