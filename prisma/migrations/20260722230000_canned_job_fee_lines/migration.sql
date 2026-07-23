-- Expand-only: canned job fee lines (shop-scoped template fees)
CREATE TABLE "CannedJobFeeLine" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cannedJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "AdjustMethod" NOT NULL DEFAULT 'FIXED',
    "base" "AdjustBase" NOT NULL DEFAULT 'LABOR_PARTS',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "capCents" INTEGER,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CannedJobFeeLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CannedJobFeeLine_cannedJobId_idx" ON "CannedJobFeeLine"("cannedJobId");

ALTER TABLE "CannedJobFeeLine" ADD CONSTRAINT "CannedJobFeeLine_cannedJobId_fkey" FOREIGN KEY ("cannedJobId") REFERENCES "CannedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
