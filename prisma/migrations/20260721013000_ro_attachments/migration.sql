-- Expand-only: RO / inspection photo & document attachments (customer-visible via public links).
CREATE TABLE "RoAttachment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'PHOTO',
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoAttachment_shopId_repairOrderId_idx" ON "RoAttachment"("shopId", "repairOrderId");
CREATE INDEX "RoAttachment_repairOrderId_customerVisible_idx" ON "RoAttachment"("repairOrderId", "customerVisible");
CREATE INDEX "RoAttachment_storageKey_idx" ON "RoAttachment"("storageKey");

ALTER TABLE "RoAttachment" ADD CONSTRAINT "RoAttachment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoAttachment" ADD CONSTRAINT "RoAttachment_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoAttachment" ADD CONSTRAINT "RoAttachment_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
