-- AlterTable
ALTER TABLE "MaintenanceProgramService" ADD COLUMN "cannedJobId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceProgramService_shopId_cannedJobId_key" ON "MaintenanceProgramService"("shopId", "cannedJobId");

-- AddForeignKey
ALTER TABLE "MaintenanceProgramService" ADD CONSTRAINT "MaintenanceProgramService_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
