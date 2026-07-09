import { notFound } from "next/navigation";

import { PoweredByShopRally } from "@/components/brand/powered-by-shoprally";
import { BookingIntakeForm } from "@/components/booking/booking-intake-form";
import { getShopByBookingSlug, getBookableDates } from "@/server/booking";

export const metadata = { title: "Book an appointment — ShopRally" };

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getShopByBookingSlug(slug);
  if (!shop) notFound();

  const dates = await getBookableDates(shop.id, 42);
  const addressLine = [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  const dropOff = shop.bookingSettings.dropOff;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-muted/40 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-md flex-col sm:min-h-0">
        <BookingIntakeForm
          shopSlug={shop.slug}
          shopName={shop.name}
          shopPhone={shop.phone}
          shopAddress={addressLine || undefined}
          dates={dates}
          services={shop.services}
          fieldConfig={shop.fieldConfig}
          confirmationMessage={shop.confirmationMessage}
          defaultDurationMins={shop.apptDefaultDurationMins}
          dropOffEnabled={dropOff?.enabled ?? true}
          dropOffLabel={dropOff?.label ?? "I will drop-off my vehicle"}
        />

        <PoweredByShopRally className="shrink-0 px-4 py-3 text-center sm:mt-4 sm:py-0" />
      </div>
    </div>
  );
}
