-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('PLATFORM_TOS', 'PRIVACY_POLICY', 'ACCEPTABLE_USE');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "legalEntityName" TEXT,
ADD COLUMN "legalEntityState" TEXT;

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "requiresReaccept" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementType" "AgreementType" NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT,
    "signerEmail" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptanceMethod" TEXT NOT NULL DEFAULT 'clickwrap_checkbox',
    "metadata" JSONB,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgreementDocument_type_isCurrent_idx" ON "AgreementDocument"("type", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementDocument_type_version_key" ON "AgreementDocument"("type", "version");

-- CreateIndex
CREATE INDEX "LegalAcceptance_shopId_agreementType_idx" ON "LegalAcceptance"("shopId", "agreementType");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAcceptance_shopId_agreementType_agreementVersion_userI_key" ON "LegalAcceptance"("shopId", "agreementType", "agreementVersion", "userId");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
