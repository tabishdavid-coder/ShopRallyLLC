import Link from "next/link";
import { CalendarDays, Settings } from "lucide-react";

import { AppointmentsView } from "@/components/appointments/appointments-view";
import { CrmPageHeader } from "@/components/crm/crm-page-header";
import { Button } from "@/components/ui/button";
import {
  formatShopHoursRange,
  parseCalendarDateParam,
  parseCalendarView,
  resolveCalendarRange,
  toDateInputValue,
} from "@/lib/appointments";
import { getShopId } from "@/lib/shop";
import {
  listAppointments,
  listCalendarBlocks,
  getAppointmentSettings,
} from "@/server/appointments";
import { getShopTechnicians } from "@/server/staff";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; date?: string; view?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const view = parseCalendarView(sp.view);
  const focusDate = parseCalendarDateParam(sp.date, sp.week);
  const { rangeStart, rangeEnd, label } = resolveCalendarRange(view, focusDate);

  const [settings, appointments, blocks, employees] = await Promise.all([
    getAppointmentSettings(shopId),
    listAppointments({
      shopId,
      rangeStart,
      rangeEnd,
      q: sp.q,
    }),
    listCalendarBlocks({
      shopId,
      rangeStart,
      rangeEnd,
    }),
    getShopTechnicians(shopId),
  ]);

  const shopHours = formatShopHoursRange(settings.apptDayStart, settings.apptDayEnd);
  const viewTitle =
    view === "day" ? "Day" : view === "month" ? "Month" : "Week";

  return (
    <div className="flex min-h-0 flex-1 flex-col crm-workspace">
      <CrmPageHeader
        className="mb-4 shrink-0"
        icon={CalendarDays}
        title="Appointments"
        description={`${viewTitle} · ${label} · Shop hours ${shopHours}`}
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-brand-navy"
          >
            <Link href="/settings/appointments">
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
        }
      />
      <AppointmentsView
        view={view}
        focusDateIso={toDateInputValue(focusDate)}
        rangeStartIso={toDateInputValue(rangeStart)}
        rangeLabel={label}
        query={sp.q ?? ""}
        settings={settings}
        appointments={appointments}
        blocks={blocks}
        employees={employees}
      />
    </div>
  );
}
