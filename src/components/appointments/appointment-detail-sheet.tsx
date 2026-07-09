"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Trash2, Wrench } from "lucide-react";

import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { customerFieldInputClass } from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_STATUS_META, toDateInputValue } from "@/lib/appointments";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import type { AppointmentRow } from "@/server/appointments";
import {
  cancelAppointment,
  createRepairOrderFromAppointment,
  updateAppointment,
} from "@/server/actions/appointments";

export function AppointmentDetailSheet({
  appointment,
  employees,
  open,
  onOpenChange,
}: {
  appointment: AppointmentRow | null;
  employees: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMins, setDurationMins] = useState(60);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW"
  >("SCHEDULED");
  const [technicianId, setTechnicianId] = useState("none");

  useEffect(() => {
    if (!appointment) return;
    const start = new Date(appointment.startAt);
    setDate(toDateInputValue(start));
    setStartTime(
      `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`,
    );
    setDurationMins(appointment.durationMins);
    setNotes(appointment.notes ?? "");
    setStatus(
      appointment.status === "CANCELED"
        ? "SCHEDULED"
        : appointment.status,
    );
    setTechnicianId(appointment.technician?.id ?? "none");
    setError(null);
  }, [appointment]);

  if (!appointment) return null;

  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];

  function saveChanges() {
    setError(null);
    startTransition(async () => {
      const result = await updateAppointment({
        id: appointment!.id,
        date,
        startTime,
        durationMins,
        notes: notes || null,
        technicianId: technicianId === "none" ? null : technicianId,
        status,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm("Cancel this appointment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(appointment!.id);
      if (!result.ok) setError(result.error);
      else {
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function handleCreateRo() {
    setError(null);
    startTransition(async () => {
      const result = await createRepairOrderFromAppointment(appointment!.id);
      if (!result.ok) setError(result.error);
      else if (result.roId) {
        router.push(`/repair-orders/${result.roId}/estimate`);
        onOpenChange(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-brand-light/30 sm:max-w-md">
        <SheetHeader className="border-b border-brand-light/30 pb-4">
          <SheetTitle className="pr-8 text-brand-navy">{appointment.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            {appointment.repairOrderNumber && appointment.repairOrderId ? (
              <Link
                href={defaultRoOpenHref(appointment.repairOrderId)}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
              >
                RO #{appointment.repairOrderNumber}
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </div>

          <div className="space-y-1 rounded-lg border border-brand-light/30 bg-brand-light/5 p-3 text-sm">
            {appointment.customer ? (
              <>
                <div className="font-medium text-brand-navy">{appointment.customer.name}</div>
                {appointment.customer.phone ? (
                  <div className="text-muted-foreground">{appointment.customer.phone}</div>
                ) : null}
              </>
            ) : null}
            {appointment.vehicle ? (
              <div className="text-muted-foreground">{appointment.vehicle.label}</div>
            ) : null}
            <div className="pt-1 text-muted-foreground">
              {start.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" – "}
              {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
            {appointment.technician ? (
              <div className="text-muted-foreground">
                Assigned: {appointment.technician.name}
              </div>
            ) : null}
          </div>

          <CrmFormSection title="Reschedule" accent="navy">
            <div className="grid grid-cols-2 gap-3">
              <CrmFormField label="Date" required>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={customerFieldInputClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Start time" required>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={customerFieldInputClass}
                  required
                />
              </CrmFormField>
            </div>
            <CrmFormField label="Duration (mins)" className="mt-3">
              <Input
                type="number"
                min={15}
                step={15}
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className={customerFieldInputClass}
                required
              />
            </CrmFormField>
            <CrmFormField label="Status" className="mt-3">
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(
                    v as "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW",
                  )
                }
              >
                <SelectTrigger className={customerFieldInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPOINTMENT_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Employee" className="mt-3">
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger className={customerFieldInputClass}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Notes" className="mt-3">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={customerFieldInputClass}
              />
            </CrmFormField>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={saveChanges}
              className="mt-3 bg-brand-navy hover:bg-brand-navy/90"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
            </Button>
          </CrmFormSection>

          {error ? <p className="text-sm text-brand-red">{error}</p> : null}

          <div className="flex flex-wrap gap-2 border-t border-brand-light/30 pt-4">
            {appointment.repairOrderId ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 border-brand-light/50 text-brand-navy"
              >
                <Link href={defaultRoOpenHref(appointment.repairOrderId)}>
                  <ExternalLink className="size-4" /> Open RO
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                onClick={handleCreateRo}
                disabled={pending || !appointment.vehicle}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wrench className="size-4" />
                )}
                Create repair order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-brand-red/30 text-brand-red hover:bg-brand-red/5 hover:text-brand-red"
              onClick={handleCancel}
              disabled={pending}
            >
              <Trash2 className="size-4" /> Cancel appointment
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
