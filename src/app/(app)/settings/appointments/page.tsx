import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { shopTimezone } from "@/lib/shop-timezone";
import { AppointmentsSettings } from "@/components/settings/appointments-settings";

export default async function AppointmentsSettingsPage() {
  const shop = await prisma.shop.findUnique({
    where: { id: await getShopId() },
    select: {
      apptDayStart: true,
      apptDayEnd: true,
      apptDefaultDurationMins: true,
      state: true,
    },
  });
  if (!shop) notFound();

  return (
    <AppointmentsSettings
      initial={{
        apptDayStart: shop.apptDayStart ?? "08:00",
        apptDayEnd: shop.apptDayEnd ?? "17:00",
        apptDefaultDurationMins: shop.apptDefaultDurationMins ?? 60,
      }}
      timezone={shopTimezone(shop.state)}
    />
  );
}
