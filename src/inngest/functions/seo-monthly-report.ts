import { inngest } from "@/inngest/client";
import { runAllShopSeoMonthlyReports } from "@/server/services/seo-monthly-report";

/** 1st of each month at 08:00 UTC — email SEO summary to shop owners. */
export const seoMonthlyReport = inngest.createFunction(
  { id: "seo-monthly-report", name: "SEO monthly report", triggers: [{ cron: "0 8 1 * *" }] },
  async ({ step }) => {
    const result = await step.run("send-monthly-reports", () => runAllShopSeoMonthlyReports());
    return result;
  },
);
