"use client";

import { useMemo, useState } from "react";

import { AppointmentsToolbar, TodayAppointmentsSidebar } from "@/components/appointments/appointments-toolbar";
import { AppointmentsWeekCalendar } from "@/components/appointments/appointments-week-calendar";
import { AppointmentDetailSheet } from "@/components/appointments/appointment-detail-sheet";
import {
  NewAppointmentDialog,
  type AppointmentBookDefaults,
} from "@/components/appointments/new-appointment-dialog";
import { isSameDay, toDateInputValue } from "@/lib/appointments";
import type { AppointmentRow, AppointmentSettings } from "@/server/appointments";

export function AppointmentsView({
  weekStartIso,
  query,
  settings,
  appointments,
  employees,
}: {
  weekStartIso: string;
  query: string;
  settings: AppointmentSettings;
  appointments: AppointmentRow[];
  employees: { id: string; name: string }[];
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [bookDefaults, setBookDefaults] = useState<AppointmentBookDefaults | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selected = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? null,
    [appointments, selectedId],
  );

  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments
      .filter((a) => isSameDay(new Date(a.startAt), today))
      .map((a) => ({
        id: a.id,
        title: a.title,
        startAt: a.startAt,
        customerName: a.customer?.name ?? a.title,
        vehicleLabel: a.vehicle?.label ?? null,
      }));
  }, [appointments]);

  function openDetail(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function openNewAppointment(defaults?: AppointmentBookDefaults) {
    setBookDefaults(defaults);
    setNewOpen(true);
  }

  return (
    <>
      <AppointmentsToolbar
        weekStartIso={weekStartIso}
        query={query}
        shopHours={`${settings.apptDayStart} – ${settings.apptDayEnd}`}
        onNewAppointment={() => openNewAppointment({ date: toDateInputValue(new Date()) })}
      />

      <div className="flex min-h-0 flex-1 gap-4">
        <AppointmentsWeekCalendar
          weekStartIso={weekStartIso}
          dayStart={settings.apptDayStart}
          dayEnd={settings.apptDayEnd}
          weeklyHours={settings.weeklyHours}
          appointments={appointments}
          selectedId={selectedId}
          onSelect={openDetail}
          onBookSlot={(date, startTime) => openNewAppointment({ date, startTime })}
        />
        <TodayAppointmentsSidebar
          appointments={todayAppointments}
          onSelect={openDetail}
          onBookToday={() => openNewAppointment({ date: toDateInputValue(new Date()) })}
        />
      </div>

      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultDurationMins={settings.apptDefaultDurationMins}
        employees={employees}
        defaults={bookDefaults}
      />

      <AppointmentDetailSheet
        appointment={selected}
        employees={employees}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
