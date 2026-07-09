-- CreateEnum
CREATE TYPE "TireOrderStatus" AS ENUM ('LEAD', 'DEPOSIT_RECEIVED', 'SCHEDULED', 'INSTALLED', 'COMPLETE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TireOrderSource" AS ENUM ('WEBSITE', 'CRM');

-- CreateTable
CREATE TABLE "TireOrder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "appointmentId" TEXT,
    "status" "TireOrderStatus" NOT NULL DEFAULT 'LEAD',
    "source" "TireOrderSource" NOT NULL DEFAULT 'CRM',
    "tireSizeFront" TEXT,
    "tireSizeRear" TEXT,
    "tireBrand" TEXT,
    "tireQuantity" INTEGER NOT NULL DEFAULT 4,
    "tireType" TEXT,
    "dropOffType" TEXT,
    "estimatedTotalCents" INTEGER,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "depositPaidAt" TIMESTAMP(3),
    "depositMethod" "PaymentMethod",
    "depositReference" TEXT,
    "websiteSubmissionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TireOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TireOrder_websiteSubmissionId_key" ON "TireOrder"("websiteSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "TireOrder_shopId_number_key" ON "TireOrder"("shopId", "number");

-- CreateIndex
CREATE INDEX "TireOrder_shopId_idx" ON "TireOrder"("shopId");

-- CreateIndex
CREATE INDEX "TireOrder_shopId_status_idx" ON "TireOrder"("shopId", "status");

-- CreateIndex
CREATE INDEX "TireOrder_customerId_idx" ON "TireOrder"("customerId");

-- CreateIndex
CREATE INDEX "TireOrder_appointmentId_idx" ON "TireOrder"("appointmentId");

-- AddForeignKey
ALTER TABLE "TireOrder" ADD CONSTRAINT "TireOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireOrder" ADD CONSTRAINT "TireOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireOrder" ADD CONSTRAINT "TireOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireOrder" ADD CONSTRAINT "TireOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
