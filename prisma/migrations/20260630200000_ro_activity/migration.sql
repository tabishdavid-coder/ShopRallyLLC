-- CreateEnum
CREATE TYPE "RoActivityType" AS ENUM ('NOTE', 'PHONE_CALL', 'EMAIL', 'OTHER');

-- CreateTable
CREATE TABLE "RoActivity" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "type" "RoActivityType" NOT NULL DEFAULT 'NOTE',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoActivity_repairOrderId_idx" ON "RoActivity"("repairOrderId");

-- CreateIndex
CREATE INDEX "RoActivity_shopId_repairOrderId_idx" ON "RoActivity"("shopId", "repairOrderId");

-- AddForeignKey
ALTER TABLE "RoActivity" ADD CONSTRAINT "RoActivity_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoActivity" ADD CONSTRAINT "RoActivity_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
