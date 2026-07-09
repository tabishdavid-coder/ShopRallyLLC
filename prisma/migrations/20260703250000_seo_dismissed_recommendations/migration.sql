-- Dismissed SEO audit recommendations on Health tab
ALTER TABLE "ShopSeoSettings" ADD COLUMN "dismissedRecommendations" JSONB NOT NULL DEFAULT '[]';
