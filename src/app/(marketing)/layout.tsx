import { MarketingShell } from "@/components/marketing-site/marketing-shell";
import { getFoundingWaitlistStats } from "@/server/marketing-launch-stats";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const waitlist = await getFoundingWaitlistStats();
  return <MarketingShell foundingSpotsClaimed={waitlist.claimed}>{children}</MarketingShell>;
}
