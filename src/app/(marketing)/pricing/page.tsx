import { Suspense } from "react";

import { PricingPageContent } from "@/components/pricing/pricing-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { shoprallyStarterPricePairLabel } from "@/lib/plans";

export const metadata = marketingPageMetadata({
  path: "/pricing",
  title: "Shop management software pricing — Ignition",
  description: `ShopRally Ignition shop management software pricing — ${shoprallyStarterPricePairLabel()}. PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections included. Website & Local SEO available as a companion offer. Launching Q4 2026.`,
});

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">
          Loading pricing…
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
