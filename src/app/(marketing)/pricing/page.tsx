import { Suspense } from "react";

import { PricingPageContent } from "@/components/pricing/pricing-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/pricing",
  title: "Pricing for auto repair shop management software",
  description:
    "ShopRally Ignition pricing for auto repair shops — $89.99 monthly · $84.99 annual. PartsTech and digital vehicle inspections included. Website & Local SEO available as a companion offer. Launching Q4 2026.",
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
