-- CreateEnum
CREATE TYPE "WiringSystem" AS ENUM ('ENGINE_MANAGEMENT', 'ABS', 'BODY_CONTROL', 'HVAC', 'OTHER');

-- CreateEnum
CREATE TYPE "WiringDiagramDownloadStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "WiringDiagramSource" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "portalUrlPattern" TEXT,
    "credentialsEnvKey" TEXT,
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WiringDiagramSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WiringDiagram" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "wiringSystem" "WiringSystem" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT,
    "sourceBrand" TEXT NOT NULL,
    "pageCount" INTEGER,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WiringDiagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WiringDiagramDownloadJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "wiringSystem" "WiringSystem" NOT NULL,
    "sourceBrand" TEXT NOT NULL,
    "status" "WiringDiagramDownloadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "wiringDiagramId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WiringDiagramDownloadJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WiringDiagramSource_shopId_idx" ON "WiringDiagramSource"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "WiringDiagramSource_shopId_brand_key" ON "WiringDiagramSource"("shopId", "brand");

-- CreateIndex
CREATE INDEX "WiringDiagram_shopId_vehicleId_idx" ON "WiringDiagram"("shopId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "WiringDiagram_shopId_vehicleId_wiringSystem_key" ON "WiringDiagram"("shopId", "vehicleId", "wiringSystem");

-- CreateIndex
CREATE INDEX "WiringDiagramDownloadJob_shopId_vehicleId_status_idx" ON "WiringDiagramDownloadJob"("shopId", "vehicleId", "status");

-- CreateIndex
CREATE INDEX "WiringDiagramDownloadJob_shopId_status_idx" ON "WiringDiagramDownloadJob"("shopId", "status");

-- AddForeignKey
ALTER TABLE "WiringDiagramSource" ADD CONSTRAINT "WiringDiagramSource_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringDiagram" ADD CONSTRAINT "WiringDiagram_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringDiagram" ADD CONSTRAINT "WiringDiagram_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringDiagramDownloadJob" ADD CONSTRAINT "WiringDiagramDownloadJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringDiagramDownloadJob" ADD CONSTRAINT "WiringDiagramDownloadJob_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringDiagramDownloadJob" ADD CONSTRAINT "WiringDiagramDownloadJob_wiringDiagramId_fkey" FOREIGN KEY ("wiringDiagramId") REFERENCES "WiringDiagram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
