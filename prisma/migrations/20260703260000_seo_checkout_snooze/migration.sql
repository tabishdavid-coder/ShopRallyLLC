-- SEO Stripe checkout fulfillment + recommendation snooze
ALTER TABLE "ShopSeoSettings" ADD COLUMN "snoozedRecommendations" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ShopSeoSettings" ADD COLUMN "seoStripeFulfillments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ShopSeoSettings" ADD COLUMN "seoAutopilotStripeSubscriptionId" TEXT;
