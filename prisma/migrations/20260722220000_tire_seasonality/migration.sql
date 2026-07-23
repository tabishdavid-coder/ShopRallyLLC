-- Expand-only: tire seasonality + structured size fields
CREATE TYPE "TireSeasonality" AS ENUM ('SUMMER', 'WINTER', 'ALL_SEASON', 'ALL_WEATHER');

ALTER TABLE "TireStock" ADD COLUMN "width" INTEGER;
ALTER TABLE "TireStock" ADD COLUMN "aspectRatio" INTEGER;
ALTER TABLE "TireStock" ADD COLUMN "rimDiameter" INTEGER;
ALTER TABLE "TireStock" ADD COLUMN "seasonality" "TireSeasonality";
