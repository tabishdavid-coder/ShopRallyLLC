import Link from "next/link";
import { CalendarDays, Settings } from "lucide-react";

import { AppointmentsView } from "@/components/appointments/appointments-view";
import { CrmPageHeader } from "@/components/crm/crm-page-header";
import { Button } from "@/components/ui/button";
import { parseWeekParam, toDateInputValue, weekRangeEnd } from "@/lib/appointments-date";
import { getShopId } from "@/lib/shop";
import { listAppointments, getAppointmentSettings } from "@/server/appointments";
import { getShopTechnicians } from "@/server/staff";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const weekStart = parseWeekParam(sp.week);
  const rangeEnd = weekRangeEnd(weekStart);

  const [settings, appointments, employees] = await Promise.all([
    getAppointmentSettings(shopId),
    listAppointments({
      shopId,
      rangeStart: weekStart,
      rangeEnd,
      q: sp.q,
    }),
    getShopTechnicians(shopId),
  ]);

  const weekLabel = weekStart.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col workspace-surface">
      <CrmPageHeader
        icon={CalendarDays}
        title="Appointments"
        description={`Week of ${weekLabel} · Shop hours ${settings.apptDayStart} – ${settings.apptDayEnd}`}
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 border-brand-light/50 text-brand-navy hover:bg-brand-light/10"
          >
            <Link href="/settings/appointments">
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
        }
      />
      <AppointmentsView
        weekStartIso={toDateInputValue(weekStart)}
        query={sp.q ?? ""}
        settings={settings}
        appointments={appointments}
        employees={employees}
      />
    </div>
  );
}
