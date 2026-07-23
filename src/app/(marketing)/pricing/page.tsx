import { PricingPageContent } from "@/components/pricing/pricing-page";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { shoprallyStarterPricePairLabel } from "@/lib/plans";

export const metadata = marketingPageMetadata({
  path: "/pricing",
  title: "Shop management software pricing — Ignition, Pro & Elite",
  description: `ShopRally Ignition shop management software pricing — ${shoprallyStarterPricePairLabel()}. PartsTech, Carfax, two-way SMS, Google Reviews inbox, and digital vehicle inspections included. Compare Ignition Pro and Ignition Elite roadmap tiers. Launching Q4 2026.`,
});

export default function PricingPage() {
  return <PricingPageContent />;
}
