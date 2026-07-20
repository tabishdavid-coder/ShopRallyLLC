import { Suspense } from "react";

import { PricingPageContent } from "@/components/pricing/pricing-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "Pricing — ShopRally Ignition · Website & SEO",
  description:
    "ShopRally Ignition CRM $89.99/mo launches Q4 2026 — includes PartsTech. Website & SEO (ShopSite + Local SEO, Google Business Profile, and local Google Ads when applicable) is a separate offer. Reserve a founding seat or request a site.",
};

export default async function PricingPage() {
  const waitlist = await getFoundingWaitlistStats();
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">
          Loading pricing…
        </div>
      }
    >
      <PricingPageContent foundingSpotsClaimed={waitlist.claimed} />
    </Suspense>
  );
}
