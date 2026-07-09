import { inngest } from "@/inngest/client";
import { runWeeklySeoAudits } from "@/server/seo-automation";

/** Monday 06:00 UTC — weekly local SEO audit for all active properties. */
export const seoWeeklyAudit = inngest.createFunction(
  { id: "seo-weekly-audit", name: "SEO weekly audit", triggers: [{ cron: "0 6 * * 1" }] },
  async ({ step }) => {
    const result = await step.run("run-weekly-audits", () => runWeeklySeoAudits());
    return result;
  },
);
