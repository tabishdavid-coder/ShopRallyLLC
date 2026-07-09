-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "shareToken" TEXT,
ADD COLUMN "shareSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_shareToken_key" ON "Invoice"("shareToken");
