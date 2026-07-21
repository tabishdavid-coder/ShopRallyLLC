"use client";

import type { AppointmentStatus } from "@/generated/prisma";
import { APPOINTMENT_STATUS_META } from "@/lib/appointments";
import { cn } from "@/lib/utils";

export type AppointmentChipData = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  title: string;
  serviceName?: string | null;
  customer: { name: string } | null;
  vehicle: { label: string } | null;
};

const STATUS_STRIPE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-white/35",
  CONFIRMED: "bg-brand-light",
  IN_PROGRESS: "bg-emerald-400",
  COMPLETED: "bg-emerald-600",
  CANCELED: "bg-muted-foreground/40",
  NO_SHOW: "bg-brand-red",
};

function formatChipTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentEventChip({
  appointment,
  selected,
  onClick,
  className,
  style,
  compact = false,
}: {
  appointment: AppointmentChipData;
  selected?: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** Narrow overlap column — prioritize time + name. */
  compact?: boolean;
}) {
  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];
  const customerName = appointment.customer?.name ?? appointment.title;
  const time = formatChipTime(appointment.startAt);
  const typeLabel = appointment.serviceName?.trim() || null;
  const vehicleLabel = appointment.vehicle?.label?.trim() || null;
  const secondary = [vehicleLabel, typeLabel].filter(Boolean).join(" · ");

  const heightPx =
    typeof style?.height === "number"
      ? style.height
      : typeof style?.height === "string"
        ? Number.parseFloat(style.height)
        : NaN;
  const tall = Number.isFinite(heightPx) ? heightPx >= 52 : !compact;
  const showStatus = !compact && tall;
  const showSecondary = !compact && tall && Boolean(secondary);

  const titleParts = [
    time,
    customerName,
    vehicleLabel,
    typeLabel,
    statusMeta.label,
  ].filter(Boolean);

  return (
    <button
      type="button"
      title={titleParts.join(" · ")}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute z-10 flex overflow-hidden rounded-md text-left text-white shadow-sm transition",
        "border border-white/25 bg-brand-navy hover:bg-brand-navy/92",
        selected && "ring-2 ring-brand-light ring-offset-1",
        !style?.left && !style?.right && "inset-x-1",
        className,
      )}
      style={style}
    >
      <span
        className={cn("w-1 shrink-0 self-stretch", STATUS_STRIPE[appointment.status])}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden px-1.5 py-0.5 sm:px-2",
          tall ? "flex flex-col justify-start gap-0.5" : "flex items-center",
        )}
      >
        {tall ? (
          <>
            <span className="flex items-baseline gap-1.5">
              <span className="shrink-0 text-[10px] font-semibold tabular-nums opacity-95">
                {time}
              </span>
              {showStatus ? (
                <span className="truncate rounded bg-white/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-white/95">
                  {statusMeta.label}
                </span>
              ) : null}
            </span>
            <span className="line-clamp-2 break-words text-[11px] font-semibold leading-snug">
              {customerName}
            </span>
            {showSecondary ? (
              <span className="line-clamp-1 break-words text-[10px] leading-tight text-white/85">
                {secondary}
              </span>
            ) : null}
          </>
        ) : (
          <span className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 text-[10px] font-semibold tabular-nums opacity-95">
              {time}
            </span>
            <span className="min-w-0 truncate text-[11px] font-semibold leading-tight">
              {customerName}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
