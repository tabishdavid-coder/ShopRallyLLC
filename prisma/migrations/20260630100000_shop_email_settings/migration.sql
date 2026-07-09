-- Per-shop outbound email (from address, reply-to, enable flag).
ALTER TABLE "Shop" ADD COLUMN "emailFromName" TEXT;
ALTER TABLE "Shop" ADD COLUMN "emailFromAddress" TEXT;
ALTER TABLE "Shop" ADD COLUMN "emailReplyTo" TEXT;
ALTER TABLE "Shop" ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shop" ADD COLUMN "emailConfiguredAt" TIMESTAMP(3);
