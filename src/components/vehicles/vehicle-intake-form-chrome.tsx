"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Shared field chrome — matches Add Vehicle / CreateVehicleForm intake. */
export const VEHICLE_INTAKE_FIELD =
  "h-10 w-full rounded-none border border-[#d0d5dd] bg-white px-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-brand-orange/50 focus:ring-3 focus:ring-brand-orange/20 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20";

/**
 * Flat section chrome (Profile / customer-intake parity).
 * Orange icon + title, white canvas — no nested gray `#f9fafb` card cage.
 */
export function VehicleIntakeFormSection({
  icon: Icon,
  title,
  children,
  className,
  headerAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {headerAction}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function VehicleIntakeFieldLabel({
  label,
  required,
  info,
  className,
}: {
  label: string;
  required?: boolean;
  info?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-1.5 flex items-center gap-1", className)}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {info ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground/70 hover:text-muted-foreground"
              aria-label={`${label} info`}
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left">
            {info}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export const VEHICLE_INTAKE_BTN_PRIMARY =
  "h-10 gap-2 rounded-none bg-brand-orange px-5 text-white hover:bg-brand-orange/90";

export const VEHICLE_INTAKE_BTN_OUTLINE =
  "h-10 rounded-none border-[#d0d5dd] px-5 text-foreground hover:bg-muted/50";
