import { notFound } from "next/navigation";

import { OnlineBookingSettings } from "@/components/marketing/online-booking-settings";
import { getMarketingOnlineBooking } from "@/server/actions/marketing-booking";

export default async function MarketingOnlineBookingPage() {
  const data = await getMarketingOnlineBooking();
  if (!data) notFound();

  return (
    <OnlineBookingSettings
      initial={{
        onlineBookingEnabled: data.onlineBookingEnabled,
        bookingSlug: data.bookingSlug,
        code: data.code,
        bookingSettings: data.bookingSettings,
      }}
      bookingUrl={data.bookingUrl}
      embedIframe={data.embedIframe}
      embedLink={data.embedLink}
    />
  );
}
