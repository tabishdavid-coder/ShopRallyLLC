import { inngest } from "@/inngest/client";
import {
  CAMPAIGN_BATCH_SIZE,
  CAMPAIGN_LAUNCH_EVENT,
  dispatchDueScheduledCampaigns,
  sendCampaignBatch,
} from "@/server/services/campaign-send";

/** Process campaign sends in batches (50/recipient batch, rate-limit friendly). */
export const campaignsLaunch = inngest.createFunction(
  {
    id: "campaigns-launch",
    name: "Campaign launch batch",
    concurrency: { limit: 5 },
    triggers: [{ event: CAMPAIGN_LAUNCH_EVENT }],
  },
  async ({ event, step }) => {
    const { campaignId, shopId, offset = 0 } = event.data as {
      campaignId: string;
      shopId: string;
      offset?: number;
    };

    const result = await step.run("send-batch", () =>
      sendCampaignBatch(campaignId, shopId, offset, CAMPAIGN_BATCH_SIZE),
    );

    if (result.hasMore) {
      await step.sendEvent("next-batch", {
        name: CAMPAIGN_LAUNCH_EVENT,
        data: { campaignId, shopId, offset: offset + CAMPAIGN_BATCH_SIZE },
      });
    }

    return result;
  },
);

/** Every 15 minutes — dispatch scheduled campaigns whose send time has passed. */
export const campaignsDispatchScheduled = inngest.createFunction(
  {
    id: "campaigns-dispatch-scheduled",
    name: "Campaign scheduled dispatch",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("dispatch-due", () => dispatchDueScheduledCampaigns());
    return result;
  },
);
