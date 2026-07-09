-- Cache GSC analytics on ShopSeoSettings for fast SEO Autopilot dashboard loads.
ALTER TABLE "ShopSeoSettings" ADD COLUMN "gscMetricsCache" JSONB;
ALTER TABLE "ShopSeoSettings" ADD COLUMN "gscMetricsCachedAt" TIMESTAMP(3);
