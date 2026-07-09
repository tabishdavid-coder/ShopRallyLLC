-- AlterEnum
ALTER TYPE "AiFeature" ADD VALUE 'VOICE_RECEPTIONIST';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "aiVoiceAgentEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiVoiceAgentSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customerId" TEXT,
    "state" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiVoiceAgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ringing',
    "durationSeconds" INTEGER,
    "recordingUrl" TEXT,
    "summary" TEXT,
    "customerId" TEXT,
    "appointmentId" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiVoiceAgentSession_callSid_key" ON "AiVoiceAgentSession"("callSid");

-- CreateIndex
CREATE INDEX "AiVoiceAgentSession_shopId_expiresAt_idx" ON "AiVoiceAgentSession"("shopId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCallLog_callSid_key" ON "VoiceCallLog"("callSid");

-- CreateIndex
CREATE INDEX "VoiceCallLog_shopId_createdAt_idx" ON "VoiceCallLog"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiVoiceAgentSession" ADD CONSTRAINT "AiVoiceAgentSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallLog" ADD CONSTRAINT "VoiceCallLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
