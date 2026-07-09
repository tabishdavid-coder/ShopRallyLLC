import { inngest } from "@/inngest/client";
import { refreshAllShopSeoMetricCaches } from "@/server/seo-gsc-cache-runner";

/** Daily 05:00 UTC — refresh GSC analytics cache for connected shops. */
export const seoGscCacheNightly = inngest.createFunction(
  { id: "seo-gsc-cache-nightly", name: "SEO GSC cache nightly", triggers: [{ cron: "0 5 * * *" }] },
  async ({ step }) => {
    const result = await step.run("refresh-seo-metric-caches", () => refreshAllShopSeoMetricCaches());
    return result;
  },
);
