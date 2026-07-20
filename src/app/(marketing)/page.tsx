import { HomePageContent } from "@/components/marketing-site/home-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "ShopRally — All-in-one auto repair shop management software · Q4 2026",
  description:
    "ShopRally is all-in-one auto repair shop management software — cloud shop CRM that runs the bay and the counter. Ignition launches Q4 2026 at $89.99/mo with PartsTech and digital vehicle inspections included. Reserve one of 50 founding seats. Not available yet.",
};

export default async function HomePage() {
  const waitlist = await getFoundingWaitlistStats();
  return <HomePageContent foundingSpotsClaimed={waitlist.claimed} />;
}
