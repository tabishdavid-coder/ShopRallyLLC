import { HomePageContent } from "@/components/marketing-site/home-page";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export const metadata = {
  title: "ShopRally — Ignition shop CRM · launching Q4 2026",
  description:
    "ShopRally Ignition launches Q4 2026 at $89.99/mo with PartsTech included. Reserve one of 50 founding seats — job board, digital vehicle inspections, estimates, appointments, and Live Operations Daily Snapshot. AI Plus $49.99/mo. Not available yet.",
};

export default async function HomePage() {
  const waitlist = await getFoundingWaitlistStats();
  return <HomePageContent foundingSpotsClaimed={waitlist.claimed} />;
}
