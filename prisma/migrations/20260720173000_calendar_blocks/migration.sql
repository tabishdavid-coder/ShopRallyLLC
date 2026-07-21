-- Expand-only: advisor calendar blocks (unavailable time).
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarBlock_shopId_idx" ON "CalendarBlock"("shopId");
CREATE INDEX "CalendarBlock_shopId_startAt_idx" ON "CalendarBlock"("shopId", "startAt");

ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
