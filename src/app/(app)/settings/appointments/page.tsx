import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { shopTimezone } from "@/lib/shop-timezone";
import { parseApptWeeklyHours } from "@/lib/appt-hours";
import { AppointmentsSettings } from "@/components/settings/appointments-settings";

export default async function AppointmentsSettingsPage() {
  const shop = await prisma.shop.findUnique({
    where: { id: await getShopId() },
    select: {
      apptDayStart: true,
      apptDayEnd: true,
      apptDefaultDurationMins: true,
      apptWeeklyHours: true,
      state: true,
    },
  });
  if (!shop) notFound();

  const weeklyHours = parseApptWeeklyHours(shop.apptWeeklyHours, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  return (
    <AppointmentsSettings
      initial={{
        weeklyHours,
        apptDefaultDurationMins: shop.apptDefaultDurationMins ?? 60,
      }}
      timezone={shopTimezone(shop.state)}
    />
  );
}
