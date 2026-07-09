import { inngest } from "@/inngest/client";
import { runAllShopSeoContentGeneration } from "@/server/services/seo-content-generation";

/** 1st and 15th at 07:00 UTC — enrich microsite services/keywords from canned jobs. */
export const seoBiweeklyContent = inngest.createFunction(
  { id: "seo-biweekly-content", name: "SEO bi-weekly content", triggers: [{ cron: "0 7 1,15 * *" }] },
  async ({ step }) => {
    const result = await step.run("run-content-generation", () =>
      runAllShopSeoContentGeneration(),
    );
    return result;
  },
);
