"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppointmentsMonthCalendar } from "@/components/appointments/appointments-month-calendar";
import { AppointmentsToolbar, TodayAppointmentsSidebar } from "@/components/appointments/appointments-toolbar";
import { AppointmentsWeekCalendar } from "@/components/appointments/appointments-week-calendar";
import { AppointmentDetailSheet } from "@/components/appointments/appointment-detail-sheet";
import {
  BlockTimeDialog,
  type BlockTimeDefaults,
} from "@/components/appointments/block-time-dialog";
import { CalendarBlockSheet } from "@/components/appointments/calendar-block-sheet";
import {
  NewAppointmentDialog,
  type AppointmentBookDefaults,
} from "@/components/appointments/new-appointment-dialog";
import type { AppointmentStatus } from "@/generated/prisma";
import {
  formatShopHoursRange,
  isSameDay,
  toDateInputValue,
  type CalendarView,
} from "@/lib/appointments";
import { updateAppointmentStatus } from "@/server/actions/appointments";
import type {
  AppointmentRow,
  AppointmentSettings,
  CalendarBlockRow,
} from "@/server/appointments";

export function AppointmentsView({
  view,
  focusDateIso,
  rangeStartIso,
  rangeLabel,
  query,
  settings,
  appointments,
  blocks,
  employees,
}: {
  view: CalendarView;
  focusDateIso: string;
  /** Start of the visible grid (day date, week Sunday, or month 1st). */
  rangeStartIso: string;
  rangeLabel: string;
  query: string;
  settings: AppointmentSettings;
  appointments: AppointmentRow[];
  blocks: CalendarBlockRow[];
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startStatusTransition] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [bookDefaults, setBookDefaults] = useState<AppointmentBookDefaults | undefined>();
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDefaults, setBlockDefaults] = useState<BlockTimeDefaults | undefined>();
  const [editingBlock, setEditingBlock] = useState<CalendarBlockRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);

  const selected = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? null,
    [appointments, selectedId],
  );

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments
      .filter((a) => isSameDay(new Date(a.startAt), today))
      .map((a) => ({
        id: a.id,
        title: a.title,
        startAt: a.startAt,
        endAt: a.endAt,
        status: a.status,
        customerName: a.customer?.name ?? a.title,
        vehicleLabel: a.vehicle?.label ?? null,
        serviceName: a.serviceName,
        repairOrderId: a.repairOrderId,
        repairOrderNumber: a.repairOrderNumber,
      }));
  }, [appointments]);

  function openDetail(id: string) {
    setSelectedBlockId(null);
    setBlockSheetOpen(false);
    setSelectedId(id);
    setDetailOpen(true);
  }

  function openBlockDetail(id: string) {
    setSelectedId(null);
    setDetailOpen(false);
    setSelectedBlockId(id);
    setBlockSheetOpen(true);
  }

  function openNewAppointment(defaults?: AppointmentBookDefaults) {
    setBookDefaults(defaults);
    setNewOpen(true);
  }

  function openBlockTime(defaults?: BlockTimeDefaults, editing?: CalendarBlockRow | null) {
    setBlockDefaults(defaults);
    setEditingBlock(editing ?? null);
    setBlockOpen(true);
  }

  function handleStatusChange(id: string, status: AppointmentStatus) {
    startStatusTransition(async () => {
      const result = await updateAppointmentStatus(id, status);
      if (result.ok) router.refresh();
    });
  }

  function goToDayView(dateIso: string) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    sp.set("view", "day");
    sp.set("date", dateIso);
    router.push(`${pathname}?${sp.toString()}`);
  }

  /** Prefer focused calendar date (day/week/month) so Print day matches the view. */
  const printDateIso = focusDateIso;
  const shopHours = formatShopHoursRange(settings.apptDayStart, settings.apptDayEnd);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0">
          <AppointmentsToolbar
            view={view}
            focusDateIso={focusDateIso}
            rangeLabel={rangeLabel}
            query={query}
            shopHours={shopHours}
            printDateIso={printDateIso}
            onNewAppointment={() => openNewAppointment({ date: focusDateIso })}
            onBlockTime={() => openBlockTime({ date: focusDateIso })}
          />
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          {view === "month" ? (
            <AppointmentsMonthCalendar
              focusDateIso={focusDateIso}
              appointments={appointments}
              blocks={blocks}
              selectedId={selectedId}
              onSelect={openDetail}
              onSelectDay={goToDayView}
              onBookDay={(date) => openNewAppointment({ date })}
            />
          ) : (
            <AppointmentsWeekCalendar
              weekStartIso={rangeStartIso}
              dayCount={view === "day" ? 1 : 7}
              dayStart={settings.apptDayStart}
              dayEnd={settings.apptDayEnd}
              weeklyHours={settings.weeklyHours}
              defaultDurationMins={settings.apptDefaultDurationMins}
              appointments={appointments}
              blocks={blocks}
              selectedId={selectedId}
              selectedBlockId={selectedBlockId}
              onSelect={openDetail}
              onSelectBlock={openBlockDetail}
              onBookSlot={(date, startTime) =>
                openNewAppointment({
                  date,
                  startTime,
                })
              }
              onBlockSlot={(date, startTime) => openBlockTime({ date, startTime })}
            />
          )}
          <TodayAppointmentsSidebar
            appointments={todayAppointments}
            onSelect={openDetail}
            onBookToday={() => openNewAppointment({ date: toDateInputValue(new Date()) })}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultDurationMins={settings.apptDefaultDurationMins}
        employees={employees}
        defaults={bookDefaults}
      />

      <BlockTimeDialog
        open={blockOpen}
        onOpenChange={(open) => {
          setBlockOpen(open);
          if (!open) setEditingBlock(null);
        }}
        defaultDurationMins={settings.apptDefaultDurationMins}
        defaults={blockDefaults}
        editing={editingBlock}
      />

      <AppointmentDetailSheet
        appointment={selected}
        employees={employees}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <CalendarBlockSheet
        block={selectedBlock}
        open={blockSheetOpen}
        onOpenChange={setBlockSheetOpen}
        onEdit={(block) => openBlockTime(undefined, block)}
      />
    </>
  );
}
