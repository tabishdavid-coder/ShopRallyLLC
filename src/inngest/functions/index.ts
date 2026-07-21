import { seoBiweeklyContent } from "@/inngest/functions/seo-content-generation";
import { seoGscCacheNightly } from "@/inngest/functions/seo-gsc-cache-nightly";
import { seoMonthlyReport } from "@/inngest/functions/seo-monthly-report";
import { seoWeeklyAudit } from "@/inngest/functions/seo-weekly-audit";
import { campaignsLaunch, campaignsDispatchScheduled } from "@/inngest/functions/campaigns-launch";
import { automationsTrigger, automationsRunner } from "@/inngest/functions/automations-runner";
import { dataRetentionNightly } from "@/inngest/functions/data-retention-nightly";
import { googleReviewsSyncScheduled } from "@/inngest/functions/google-reviews-sync";

export const inngestFunctions = [
  seoWeeklyAudit,
  seoBiweeklyContent,
  seoMonthlyReport,
  seoGscCacheNightly,
  campaignsLaunch,
  campaignsDispatchScheduled,
  automationsTrigger,
  automationsRunner,
  dataRetentionNightly,
  googleReviewsSyncScheduled,
];
