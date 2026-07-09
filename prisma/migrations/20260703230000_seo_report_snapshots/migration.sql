-- SEO Autopilot in-app monthly report archive
CREATE TABLE "SeoReportSnapshot" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "sentTo" TEXT,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeoReportSnapshot_shopId_createdAt_idx" ON "SeoReportSnapshot"("shopId", "createdAt");

ALTER TABLE "SeoReportSnapshot" ADD CONSTRAINT "SeoReportSnapshot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
