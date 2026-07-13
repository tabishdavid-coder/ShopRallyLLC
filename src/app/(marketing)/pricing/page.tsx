import { PricingPageContent } from "@/components/pricing/pricing-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "Pricing — ShopRally",
  description: "ShopRally Ignition — $49.99/mo shop CRM. Optional AI Plus add-on $20/mo.",
};

export default async function PricingPage() {
  const waitlist = await getFoundingWaitlistStats();
  return <PricingPageContent foundingSpotsClaimed={waitlist.claimed} />;
}
