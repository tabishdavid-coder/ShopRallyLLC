-- Expand-only: shop SMS setup request fields + platform audit event
ALTER TABLE "Shop" ADD COLUMN "smsSetupRequestedAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN "smsPreferredAreaCode" TEXT;
ALTER TABLE "Shop" ADD COLUMN "smsSetupRequestNotes" TEXT;

ALTER TYPE "PlatformAuditEventType" ADD VALUE 'SMS_NUMBER_REQUESTED';
