-- Online booking: shop slug + enable flag, customer lead source, appointment source
ALTER TABLE "Shop" ADD COLUMN "bookingSlug" TEXT;
ALTER TABLE "Shop" ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "leadSource" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "source" TEXT;

CREATE UNIQUE INDEX "Shop_bookingSlug_key" ON "Shop"("bookingSlug");
