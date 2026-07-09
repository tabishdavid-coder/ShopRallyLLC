-- AlterTable
ALTER TABLE "Message" ADD COLUMN "repairOrderId" TEXT;

-- CreateIndex
CREATE INDEX "Message_repairOrderId_idx" ON "Message"("repairOrderId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
