-- Job board auto-archive: shop settings + RO archivedAt
ALTER TABLE "Shop"
  ADD COLUMN "completedRoAutoArchiveEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "completedRoAutoArchiveDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "RepairOrder"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "RepairOrder_shopId_archivedAt_idx" ON "RepairOrder"("shopId", "archivedAt");
