-- CreateTable
CREATE TABLE "MotorCatalogApplication" (
    "id" TEXT NOT NULL,
    "baseVehicleId" INTEGER NOT NULL,
    "motorSystemId" INTEGER NOT NULL,
    "motorGroupId" INTEGER NOT NULL,
    "motorSubGroupId" INTEGER NOT NULL,
    "motorApplicationId" INTEGER NOT NULL,
    "nodeKey" TEXT,
    "literalName" TEXT NOT NULL,
    "displayName" TEXT,
    "operationType" TEXT,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "laborTimeInterval" TEXT DEFAULT 'Hours',
    "allLaborHours" DOUBLE PRECISION,
    "additionalLaborHours" DOUBLE PRECISION,
    "positionQualifier" TEXT,
    "qualifiersJson" JSONB,
    "rawJson" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorCatalogApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotorCatalogApplication_baseVehicleId_motorApplicationId_key" ON "MotorCatalogApplication"("baseVehicleId", "motorApplicationId");

-- CreateIndex
CREATE INDEX "MotorCatalogApplication_baseVehicleId_idx" ON "MotorCatalogApplication"("baseVehicleId");

-- CreateIndex
CREATE INDEX "MotorCatalogApplication_baseVehicleId_motorSubGroupId_idx" ON "MotorCatalogApplication"("baseVehicleId", "motorSubGroupId");

-- CreateIndex
CREATE INDEX "MotorCatalogApplication_baseVehicleId_motorSystemId_motorGroupId_m_idx" ON "MotorCatalogApplication"("baseVehicleId", "motorSystemId", "motorGroupId", "motorSubGroupId");

-- CreateIndex
CREATE INDEX "MotorCatalogApplication_nodeKey_idx" ON "MotorCatalogApplication"("nodeKey");
