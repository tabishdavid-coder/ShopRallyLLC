import { Suspense } from "react";

import { PricingPageContent } from "@/components/pricing/pricing-page";

export const metadata = {
  title: "Pricing — All-in-one shop management · Ignition & Website & SEO",
  description:
    "ShopRally Ignition is all-in-one auto repair shop management software at $89.99/mo — launches Q4 2026 with PartsTech and digital vehicle inspections. Website & SEO (ShopSite + Local SEO) is a separate companion offer. Reserve a founding seat or request a site.",
};

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
