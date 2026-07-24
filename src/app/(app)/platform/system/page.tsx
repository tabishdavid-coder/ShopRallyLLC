import { PlatformSystem } from "@/components/platform/platform-system";
import { PlatformRetentionRuns } from "@/components/platform/platform-retention-runs";
import { PlatformOemAutomation } from "@/components/platform/platform-oem-automation";
import { isPlatformOemAutomationUiEnabled } from "@/lib/oem-automation-sources";
import { listRecentRetentionRuns } from "@/server/platform/compliance-audit";
import {
  getLatestJobRunsByName,
  listOpenHealthAlerts,
  listRecentAutomationJobRuns,
  listRecentFallbackEvents,
  listRecentSourceHealthLogs,
  listScraperSources,
} from "@/server/platform/oem-automation";

export const metadata = { title: "Platform system — ShopRally" };

export default async function PlatformSystemPage() {
  const retentionRuns = await listRecentRetentionRuns(15);
  const showOem = isPlatformOemAutomationUiEnabled();

  const [sources, alerts, jobRuns, latestByJob, fallbackEvents, healthLogs] = showOem
    ? await Promise.all([
        listScraperSources(),
        listOpenHealthAlerts(25),
        listRecentAutomationJobRuns(15),
        getLatestJobRunsByName(),
        listRecentFallbackEvents(20),
        listRecentSourceHealthLogs(25),
      ])
    : [[], [], [], {}, [], []];

  return (
    <div className="space-y-8">
      <PlatformSystem />
      {showOem ? (
        <PlatformOemAutomation
          sources={sources}
          alerts={alerts}
          jobRuns={jobRuns}
          latestByJob={latestByJob}
          fallbackEvents={fallbackEvents}
          healthLogs={healthLogs}
        />
      ) : null}
      <PlatformRetentionRuns rows={retentionRuns} />
    </div>
  );
}
