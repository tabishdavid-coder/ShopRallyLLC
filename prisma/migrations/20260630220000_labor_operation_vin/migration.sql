-- Labor cache: store VIN when row is VIN-keyed for strict vehicle alignment
ALTER TABLE "LaborOperation" ADD COLUMN IF NOT EXISTS "vehicleVin" TEXT;

CREATE INDEX IF NOT EXISTS "LaborOperation_vehicleVin_idx" ON "LaborOperation"("vehicleVin");
