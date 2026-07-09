import { inngest } from "@/inngest/client";
import { runPlatformDataRetentionJob } from "@/server/jobs/data-retention";

/** Daily 04:00 UTC — purge stale comms/consent and anonymize soft-deleted customers. */
export const dataRetentionNightly = inngest.createFunction(
  {
    id: "data-retention-nightly",
    name: "Data retention nightly",
    triggers: [{ cron: "0 4 * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("run-platform-retention", () => runPlatformDataRetentionJob());
    return result;
  },
);
