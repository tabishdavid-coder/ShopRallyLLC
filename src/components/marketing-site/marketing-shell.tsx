import { LaunchAnnouncementBar } from "@/components/marketing-site/launch-announcement-bar";
import { MarketingFooter } from "@/components/marketing-site/marketing-footer";
import { MarketingHeader } from "@/components/marketing-site/marketing-header";

export function MarketingShell({
  children,
  foundingSpotsClaimed = 0,
}: {
  children: React.ReactNode;
  foundingSpotsClaimed?: number;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-light/10 via-background to-background">
      <LaunchAnnouncementBar foundingSpotsClaimed={foundingSpotsClaimed} />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
