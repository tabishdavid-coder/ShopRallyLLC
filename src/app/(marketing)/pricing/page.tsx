import { PricingPageContent } from "@/components/pricing/pricing-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "Pricing — ShopRally",
  description: "Core, Pro, and Elite — per-location shop management with Growth Engine and AI tiers.",
};

export default async function PricingPage() {
  const waitlist = await getFoundingWaitlistStats();
  return <PricingPageContent foundingSpotsClaimed={waitlist.claimed} />;
}
