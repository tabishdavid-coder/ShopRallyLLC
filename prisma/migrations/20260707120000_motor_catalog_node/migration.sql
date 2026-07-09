-- CreateTable
CREATE TABLE "MotorCatalogNode" (
    "id" TEXT NOT NULL,
    "baseVehicleId" INTEGER NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "motorSystemId" INTEGER NOT NULL,
    "motorGroupId" INTEGER,
    "motorSubGroupId" INTEGER,
    "name" TEXT NOT NULL,
    "parentNodeKey" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorCatalogNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotorCatalogNode_baseVehicleId_nodeKey_key" ON "MotorCatalogNode"("baseVehicleId", "nodeKey");

-- CreateIndex
CREATE INDEX "MotorCatalogNode_baseVehicleId_idx" ON "MotorCatalogNode"("baseVehicleId");

-- CreateIndex
CREATE INDEX "MotorCatalogNode_baseVehicleId_level_idx" ON "MotorCatalogNode"("baseVehicleId", "level");

-- CreateIndex
CREATE INDEX "MotorCatalogNode_parentNodeKey_idx" ON "MotorCatalogNode"("parentNodeKey");
