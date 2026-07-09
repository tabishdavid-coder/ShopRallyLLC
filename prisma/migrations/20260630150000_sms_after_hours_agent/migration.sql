-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'SMS_AFTER_HOURS';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "aiSmsAgentEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiSmsAgentSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customerId" TEXT,
    "state" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSmsAgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSmsAgentSession_shopId_phone_key" ON "AiSmsAgentSession"("shopId", "phone");

-- CreateIndex
CREATE INDEX "AiSmsAgentSession_shopId_expiresAt_idx" ON "AiSmsAgentSession"("shopId", "expiresAt");

-- AddForeignKey
ALTER TABLE "AiSmsAgentSession" ADD CONSTRAINT "AiSmsAgentSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
