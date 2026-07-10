"use client";

import { useState } from "react";
import {
  Car,
  Check,
  ChevronRight,
  Copy,
  MessageSquare,
  UserRound,
} from "lucide-react";

import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";
import type { ContextDrawerTab } from "@/components/estimate-building/estimate-lab-context-drawer";
import type { EstimateWorkspaceVariant } from "@/components/estimate-building/estimate-building-lab-panel";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { formatPhoneInput } from "@/lib/phone";
import { VinDisplay } from "@/components/vin-display";
import {
  formatVehicleContextLabel,
  smsPhoneHref,
  splitVinForDisplay,
} from "@/lib/ro-context-display";
import { SMS_ENABLED } from "@/lib/features";
import { cn } from "@/lib/utils";

function QuickAction({
  label,
  href,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-brand-navy/20 hover:bg-white/85 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/70";

  if (href) {
    return (
      <a
        href={href}
        className={className}
        aria-label={label}
        title={label}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function CopyFieldButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <QuickAction label={copied ? "Copied" : label} onClick={onCopy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </QuickAction>
  );
}

const CONTEXT_CARD =
  "group relative flex min-h-11 min-w-0 shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-brand-navy/35 bg-gradient-to-r from-brand-light/20 via-white to-white px-3 py-2.5 text-left shadow-[0_1px_0_rgba(22,88,142,0.12),0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-150 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-brand-navy/75 hover:-translate-y-px hover:border-brand-navy/65 hover:from-brand-light/30 hover:shadow-[0_1px_0_rgba(22,88,142,0.16),0_10px_22px_rgba(15,23,42,0.08)] focus-within:border-brand-navy focus-within:ring-2 focus-within:ring-brand-light/70";

function ContextCardChevron() {
  return (
    <span className="relative z-10 flex size-7 shrink-0 items-center justify-center self-center rounded-full border border-brand-navy/15 bg-white/80 text-brand-navy/65 transition-colors group-hover:border-brand-navy/30 group-hover:bg-brand-navy group-hover:text-white">
      <ChevronRight className="size-4" aria-hidden />
    </span>
  );
}

function onCardKeyDown(e: React.KeyboardEvent, open: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
}

/** Customer + vehicle context strip — separate clickable blocks open drawer tabs. */
export function EstimateLabContextStack({
  variant = "lab",
  customer,
  customerId,
  vehicle,
  mileageIn,
  odometerNotWorking,
  canEdit: _canEdit,
  drawerData: _drawerData,
  vehicleSpecs: _vehicleSpecs,
}: {
  variant?: EstimateWorkspaceVariant;
  customer: EditableCustomerRecord;
  customerId: string;
  vehicle: EditableVehicle | null;
  mileageIn: number | null;
  odometerNotWorking: boolean;
  canEdit: boolean;
  drawerData: EstimateContextDrawerData | null;
  vehicleSpecs: EstimateLabVehicleSpecsBundle | null;
}) {
  const ctx = useEstimateLabContextDrawerOptional();

  const isBusiness = Boolean(customer.company?.trim());
  const personName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  const displayName = isBusiness ? (customer.company ?? "") : personName;
  const phoneFormatted = customer.phone ? formatPhoneInput(customer.phone) : "";

  const vehicleLabel = formatVehicleContextLabel(vehicle);
  const vinDisplay = vehicle?.vin ? splitVinForDisplay(vehicle.vin) : null;
  const mileageLabel = odometerNotWorking
    ? "Odo N/W"
    : mileageIn != null
      ? `${mileageIn.toLocaleString("en-US")} mi`
      : null;

  function openDrawerTab(tab: ContextDrawerTab) {
    ctx?.openDrawer(tab);
  }

  return (
    <>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        {/* Customer block → Profile tab */}
        <div className={cn(CONTEXT_CARD, "min-w-0 flex-1")}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => openDrawerTab("profile")}
            onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("profile"))}
            className="relative z-10 flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
            aria-label={`Open customer profile for ${displayName || "customer"}`}
          >
            <UserRound
              className="size-4.5 shrink-0 text-brand-navy/80 group-hover:text-brand-navy"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <span className="block min-w-0 truncate text-base leading-snug">
                <span className="font-semibold text-brand-navy">{displayName || "Customer"}</span>
                {phoneFormatted ? (
                  <>
                    <span className="mx-1.5 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="text-sm font-normal tabular-nums text-muted-foreground">{phoneFormatted}</span>
                  </>
                ) : null}
              </span>
            </div>
          </div>

          {phoneFormatted ? (
            <div
              className="relative z-10 flex shrink-0 items-center gap-0.5 self-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {customer.phone ? (
                SMS_ENABLED && ctx ? (
                  <QuickAction label="Text customer" onClick={() => ctx.openMessages()}>
                    <MessageSquare className="size-3.5" />
                  </QuickAction>
                ) : customer.phone ? (
                  <QuickAction label="Text customer" href={smsPhoneHref(customer.phone)}>
                    <MessageSquare className="size-3.5" />
                  </QuickAction>
                ) : null
              ) : null}
              {customer.phone ? (
                <CopyFieldButton value={customer.phone} label="Copy phone" />
              ) : null}
            </div>
          ) : null}

          <ContextCardChevron />
        </div>

        {/* Vehicle block → Vehicles tab */}
        {vehicle ? (
          <div className={cn(CONTEXT_CARD, "min-w-0 flex-1")}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => openDrawerTab("vehicles")}
              onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("vehicles"))}
              className="relative z-10 flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
              aria-label={`Open vehicles for ${vehicleLabel.full || "vehicle"}`}
            >
              <Car
                className="size-4.5 shrink-0 text-brand-navy/80 group-hover:text-brand-navy"
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-center overflow-hidden text-base leading-snug">
                <span
                  className="truncate font-semibold text-brand-navy"
                  title={vehicleLabel.full}
                >
                  {vehicleLabel.display}
                </span>
                {vinDisplay ? (
                  <>
                    <span className="mx-1.5 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <VinDisplay
                      vin={vinDisplay.full}
                      className="shrink-0 text-sm font-normal"
                    />
                    <CopyFieldButton value={vinDisplay.full} label="Copy VIN" />
                  </>
                ) : null}
                {vehicle.plate ? (
                  <>
                    <span className="mx-1.5 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 text-sm font-normal text-muted-foreground">{vehicle.plate}</span>
                    <CopyFieldButton value={vehicle.plate} label="Copy plate" />
                  </>
                ) : null}
                {vehicle.plateState ? (
                  <>
                    <span className="mx-1.5 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 text-sm font-normal text-muted-foreground">
                      {vehicle.plateState}
                    </span>
                  </>
                ) : null}
                {mileageLabel ? (
                  <>
                    <span className="mx-1.5 shrink-0 text-muted-foreground/45" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
                      {mileageLabel}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <ContextCardChevron />
          </div>
        ) : (
          <div className={cn(CONTEXT_CARD, "min-w-0 flex-1")}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => openDrawerTab("vehicles")}
              onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("vehicles"))}
              className="relative z-10 flex min-w-0 flex-1 items-center gap-2 text-base text-muted-foreground focus-visible:outline-none"
              aria-label="Open vehicles — no vehicle on this RO"
            >
              <Car className="size-4.5 shrink-0 text-brand-navy/75" aria-hidden />
              No vehicle
            </div>
            <ContextCardChevron />
          </div>
        )}
      </div>
    </>
  );
}
