-- Shop SMS / landline fields
ALTER TABLE "Shop" ADD COLUMN "landlineNumber" TEXT;
ALTER TABLE "Shop" ADD COLUMN "twilioPhoneNumber" TEXT;
ALTER TABLE "Shop" ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Shop_twilioPhoneNumber_key" ON "Shop"("twilioPhoneNumber");

-- Estimate view tracking on repair orders
ALTER TABLE "RepairOrder" ADD COLUMN "estimateViewedAt" TIMESTAMP(3);
ALTER TABLE "RepairOrder" ADD COLUMN "estimateViewedNotifiedAt" TIMESTAMP(3);

-- Job approval timestamp (customer link)
ALTER TABLE "Job" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Message metadata for SMS threads
ALTER TABLE "Message" ADD COLUMN "fromNumber" TEXT;
ALTER TABLE "Message" ADD COLUMN "toNumber" TEXT;
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);
