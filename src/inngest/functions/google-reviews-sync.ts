import { inngest } from "@/inngest/client";
import { syncAllConnectedGoogleReviews } from "@/server/google-reviews-sync-runner";

/** Every 6 hours — pull new/updated Google reviews for connected shops. */
export const googleReviewsSyncScheduled = inngest.createFunction(
  {
    id: "google-reviews-sync-scheduled",
    name: "Google Reviews sync (fleet)",
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("sync-connected-shops", () =>
      syncAllConnectedGoogleReviews({ concurrency: 3 }),
    );
    return result;
  },
);
