-- Customer phone search key (normalized digits for format-agnostic contains).
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneDigits" TEXT;
