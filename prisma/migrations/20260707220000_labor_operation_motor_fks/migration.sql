-- M3: MOTOR taxonomy alignment FKs on LaborOperation cache rows

ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "baseVehicleId" INTEGER;
ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "motorApplicationId" INTEGER;
ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "motorSubGroupId" INTEGER;
ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "motorGroupId" INTEGER;
ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "motorSystemId" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "LaborOperation_baseVehicleId_motorApplicationId_key"
  ON "LaborOperation"("baseVehicleId", "motorApplicationId");

CREATE INDEX IF NOT EXISTS "LaborOperation_baseVehicleId_motorSubGroupId_idx"
  ON "LaborOperation"("baseVehicleId", "motorSubGroupId");
