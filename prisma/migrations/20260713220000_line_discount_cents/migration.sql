-- Expand: per-line discount on labor/part rows (Tekmetric Amount / Discount / Net).
-- Default 0 keeps existing totals behavior until discounts are entered.

ALTER TABLE "LaborLine" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PartLine" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
