-- CreateEnum
CREATE TYPE "PayrollType" AS ENUM ('SALARY', 'FLAT_RATE', 'HOURLY');

-- AlterTable User (contact fields for Employees module)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address2" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "zip" TEXT;

-- AlterTable Membership (employment + permissions)
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "payrollType" "PayrollType";
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "canPerformWork" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "certificationNumber" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "permissionGroup" TEXT;
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "permissionMode" TEXT NOT NULL DEFAULT 'GROUP';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "accessTimes" TEXT NOT NULL DEFAULT 'Anytime';
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable LoginEvent
CREATE TABLE IF NOT EXISTS "LoginEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoginEvent_shopId_userId_loggedInAt_idx" ON "LoginEvent"("shopId", "userId", "loggedInAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
