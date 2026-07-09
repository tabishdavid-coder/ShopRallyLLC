import { HomePageContent } from "@/components/marketing-site/home-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "ShopRally — Auto Repair Shop Management Software",
  description:
    "Cloud shop management for independent repair shops. CRM, Growth Engine, and monthly ShopSite & Local SEO subscriptions.",
};

export default async function HomePage() {
  const waitlist = await getFoundingWaitlistStats();
  return <HomePageContent foundingSpotsClaimed={waitlist.claimed} />;
}
