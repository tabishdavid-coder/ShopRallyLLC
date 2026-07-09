-- Per-shop SMS platform fields (Twilio Messaging Service, setup timestamp, opt-out footer)
ALTER TABLE "Shop" ADD COLUMN "twilioMessagingServiceSid" TEXT;
ALTER TABLE "Shop" ADD COLUMN "smsConfiguredAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN "smsOptOutFooter" TEXT;
