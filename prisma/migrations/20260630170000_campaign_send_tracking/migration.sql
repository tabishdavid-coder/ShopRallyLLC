-- Campaign send open/click tracking (MVP analytics)
ALTER TABLE "CampaignSend" ADD COLUMN "openedAt" TIMESTAMP(3);
ALTER TABLE "CampaignSend" ADD COLUMN "clickedAt" TIMESTAMP(3);
