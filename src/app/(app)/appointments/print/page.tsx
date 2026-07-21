import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppointmentsDayPrint } from "@/components/appointments/appointments-day-print";
import { AutoPrint } from "@/components/print/auto-print";
import { Button } from "@/components/ui/button";
import {
  addDays,
  isSameDay,
  parseDateInput,
  toDateInputValue,
} from "@/lib/appointments-date";
import { formatShopHoursRange } from "@/lib/appointments";
import { getShopId } from "@/lib/shop";
import { prisma } from "@/db/client";
import {
  getAppointmentSettings,
  listAppointments,
  listCalendarBlocks,
} from "@/server/appointments";

export const dynamic = "force-dynamic";

export default async function AppointmentsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();

  const day =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? parseDateInput(sp.date)
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })();
  const dayEnd = addDays(day, 1);
  const dateIso = toDateInputValue(day);
  const todayIso = toDateInputValue(new Date());

  const [settings, appointments, blocks, shop] = await Promise.all([
    getAppointmentSettings(shopId),
    listAppointments({ shopId, rangeStart: day, rangeEnd: dayEnd }),
    listCalendarBlocks({ shopId, rangeStart: day, rangeEnd: dayEnd }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, phone: true, landlineNumber: true },
    }),
  ]);

  const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day));
  const dayBlocks = blocks.filter((b) => isSameDay(new Date(b.startAt), day));
  const shopPhone = shop?.phone ?? shop?.landlineNumber ?? null;

  const dayLabel = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:min-h-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.45in 0.5in; }
          html, body { background: white !important; }
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/appointments">
            <ArrowLeft className="size-4" /> Back to appointments
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-brand-navy">Day sheet preview</div>
          <div className="truncate text-xs text-muted-foreground">{dayLabel}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/appointments/print?date=${toDateInputValue(addDays(day, -1))}`}>
              Previous day
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/appointments/print?date=${toDateInputValue(addDays(day, 1))}`}>
              Next day
            </Link>
          </Button>
          {dateIso !== todayIso ? (
            <Button asChild size="sm" className="bg-brand-navy hover:bg-brand-navy/90">
              <Link href={`/appointments/print?date=${todayIso}`}>Today</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Floating Print + auto-open print dialog after short delay */}
      <AutoPrint autoTrigger />

      <div className="mx-auto max-w-[8.5in] px-3 py-6 print:p-0">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <AppointmentsDayPrint
            shopName={shop?.name ?? "Shop"}
            shopPhone={shopPhone}
            dayLabel={dayLabel}
            shopHours={formatShopHoursRange(settings.apptDayStart, settings.apptDayEnd)}
            appointments={dayAppts}
            blocks={dayBlocks}
          />
        </div>
      </div>
    </div>
  );
}
