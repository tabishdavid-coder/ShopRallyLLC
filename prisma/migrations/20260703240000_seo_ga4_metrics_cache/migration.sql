-- GA4 analytics cache for SEO Autopilot Analytics tab
ALTER TABLE "ShopSeoSettings" ADD COLUMN "ga4PropertyId" TEXT;
ALTER TABLE "ShopSeoSettings" ADD COLUMN "ga4MetricsCache" JSONB;
ALTER TABLE "ShopSeoSettings" ADD COLUMN "ga4MetricsCachedAt" TIMESTAMP(3);
