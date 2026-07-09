import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";

import { ShopSiteFooter, ShopSiteHeader } from "@/components/website-seo/shop-site";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/app-url";
import { getPublishedShopWebsite } from "@/server/website-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) return { title: "Not found" };

  const title = `Contact | ${site.metaTitle}`;
  const description = `Contact ${site.shopName}. Call, visit, or book online.`;
  return {
    title,
    description,
    openGraph: { title, description, url: publicUrl(`/sites/${slug}/contact`) },
  };
}

export default async function ShopSiteContactPage({ params }: Props) {
  const { slug } = await params;
  const site = await getPublishedShopWebsite(slug);
  if (!site) notFound();

  const address = [site.address, site.address2, site.city, site.state, site.zip]
    .filter(Boolean)
    .join(", ");
  const mapsQuery = encodeURIComponent(address || site.shopName);

  return (
    <div className="min-h-dvh bg-background">
      <ShopSiteHeader site={site} active="contact" />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold">Contact {site.shopName}</h1>
        <p className="mt-2 text-muted-foreground">{site.hoursLabel}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {site.phone ? (
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <Phone className="size-5 text-brand-navy" />
              <h2 className="mt-2 font-semibold">Phone</h2>
              <a href={`tel:${site.phone.replace(/\D/g, "")}`} className="mt-1 block text-brand-navy hover:underline">
                {site.phone}
              </a>
            </div>
          ) : null}
          {site.email ? (
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <Mail className="size-5 text-brand-navy" />
              <h2 className="mt-2 font-semibold">Email</h2>
              <a href={`mailto:${site.email}`} className="mt-1 block text-brand-navy hover:underline">
                {site.email}
              </a>
            </div>
          ) : null}
          {address ? (
            <div className="rounded-lg border bg-card p-5 shadow-sm sm:col-span-2">
              <MapPin className="size-5 text-brand-navy" />
              <h2 className="mt-2 font-semibold">Address</h2>
              <p className="mt-1 text-sm text-muted-foreground">{address}</p>
              <a
                href={`https://maps.google.com/?q=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-brand-navy hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
          ) : null}
        </div>

        {site.onlineBookingEnabled && site.bookingSlug ? (
          <div className="mt-8 rounded-lg border border-brand-light/40 bg-brand-light/10 p-5">
            <h2 className="font-semibold">Ready to schedule?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Book your appointment online in minutes.</p>
            <Button asChild className="mt-3 bg-brand-navy hover:bg-brand-navy/90">
              <Link href={publicUrl(`/book/${site.bookingSlug}`)}>Book now</Link>
            </Button>
          </div>
        ) : null}
      </main>
      <ShopSiteFooter site={site} />
    </div>
  );
}
