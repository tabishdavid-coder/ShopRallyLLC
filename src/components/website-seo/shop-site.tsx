import Link from "next/link";
import { MapPin, Phone } from "lucide-react";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serviceSlug } from "@/lib/service-slugs";
import { publicUrl } from "@/lib/app-url";
import type { ShopWebsitePublic } from "@/server/website-seo";

type SiteNavProps = {
  site: ShopWebsitePublic;
  active?: "home" | "services" | "contact";
};

export function ShopSiteHeader({ site, active }: SiteNavProps) {
  const base = `/sites/${site.slug}`;
  const links = [
    { href: base, label: "Home", key: "home" as const },
    { href: `${base}/services`, label: "Services", key: "services" as const },
    { href: `${base}/contact`, label: "Contact", key: "contact" as const },
  ];

  return (
    <header className="border-b bg-brand-navy text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={base} className="text-lg font-bold tracking-tight hover:opacity-90">
            {site.shopName}
          </Link>
          {site.city ? (
            <p className="text-sm text-brand-light/90">
              {site.city}
              {site.state ? `, ${site.state}` : ""}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === link.key
                  ? "bg-brand-red text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {site.onlineBookingEnabled && site.bookingSlug ? (
          <Button asChild size="sm" className="bg-brand-red hover:bg-brand-red/90">
            <Link href={publicUrl(`/book/${site.bookingSlug}`)}>Book Now</Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export function ShopSiteFooter({ site }: { site: ShopWebsitePublic }) {
  const address = [site.address, site.city, site.state, site.zip].filter(Boolean).join(", ");
  const mapsQuery = encodeURIComponent(address || site.shopName);

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold">{site.shopName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{site.hoursLabel}</p>
          {site.phone ? (
            <a
              href={`tel:${site.phone.replace(/\D/g, "")}`}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
            >
              <Phone className="size-3.5" />
              {site.phone}
            </a>
          ) : null}
        </div>
        {address ? (
          <div>
            <h3 className="font-semibold">Location</h3>
            <p className="mt-2 text-sm text-muted-foreground">{address}</p>
            <a
              href={`https://maps.google.com/?q=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline"
            >
              <MapPin className="size-3.5" />
              Get directions
            </a>
          </div>
        ) : null}
      </div>
      <div className="border-t py-3 text-center">
        <PoweredByShopRally />
      </div>
    </footer>
  );
}

export function ShopSiteHero({ site }: { site: ShopWebsitePublic }) {
  return (
    <section className="bg-gradient-to-br from-brand-navy via-brand-navy to-brand-light/80 px-4 py-14 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{site.heroHeadline}</h1>
        <p className="mt-3 max-w-2xl text-lg text-brand-light/95">{site.heroSubtext}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {site.onlineBookingEnabled && site.bookingSlug ? (
            <Button asChild size="lg" className="bg-brand-red hover:bg-brand-red/90">
              <Link href={publicUrl(`/book/${site.bookingSlug}`)}>Book an appointment</Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
            <Link href={`/sites/${site.slug}/contact`}>Contact us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ShopSiteReviews({ site }: { site: ShopWebsitePublic }) {
  if (site.reviews.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold">What customers say</h2>
      {site.averageRating ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {site.averageRating.toFixed(1)}★ average from recent Google reviews
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {site.reviews.map((review, i) => (
          <blockquote key={i} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium">{review.reviewerName}</p>
            <p className="text-xs text-amber-600">{"★".repeat(review.starRating)}</p>
            {review.comment ? (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{review.comment}</p>
            ) : null}
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export function ShopSiteServicesGrid({ site }: { site: ShopWebsitePublic }) {
  const base = `/sites/${site.slug}`;
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-xl font-semibold">Our services</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {site.services.map((service) => (
          <Link
            key={service.title}
            href={`${base}/services/${serviceSlug(service.title)}`}
            className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-brand-navy/40 hover:shadow-md"
          >
            <h3 className="font-semibold text-brand-navy">{service.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{service.description}</p>
            <span className="mt-3 inline-block text-xs font-medium text-brand-navy">Learn more →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ShopSiteAbout({ site }: { site: ShopWebsitePublic }) {
  return (
    <section className="border-t bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-xl font-semibold">About us</h2>
        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {site.aboutText}
        </p>
      </div>
    </section>
  );
}
