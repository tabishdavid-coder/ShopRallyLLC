-- CreateEnum
CREATE TYPE "PlansPageTemplate" AS ENUM ('CLASSIC', 'MODERN', 'BOLD', 'PREMIUM');

-- AlterTable
ALTER TABLE "MaintenanceProgramSettings" ADD COLUMN "pageTemplate" "PlansPageTemplate" NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "MaintenanceProgramSettings" ADD COLUMN "themeConfig" JSONB;
