-- Custom job board pipeline columns (shop labels + optional extra sections)
ALTER TABLE "Shop" ADD COLUMN "jobBoardPipeline" JSONB;

ALTER TABLE "RepairOrder" ADD COLUMN "jobBoardColumnId" TEXT;

CREATE INDEX "RepairOrder_shopId_jobBoardColumnId_idx" ON "RepairOrder"("shopId", "jobBoardColumnId");
