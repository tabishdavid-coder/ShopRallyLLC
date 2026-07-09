import { PlatformSystem } from "@/components/platform/platform-system";
import { PlatformRetentionRuns } from "@/components/platform/platform-retention-runs";
import { listRecentRetentionRuns } from "@/server/platform/compliance-audit";

export const metadata = { title: "Platform system — ShopRally" };

export default async function PlatformSystemPage() {
  const retentionRuns = await listRecentRetentionRuns(15);

  return (
    <div className="space-y-8">
      <PlatformSystem />
      <PlatformRetentionRuns rows={retentionRuns} />
    </div>
  );
}
