"use client";

import { type CSSProperties, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  MessageSquare,
  Phone,
} from "lucide-react";

import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import type { EditableVehicle } from "@/components/repair-order/edit-vehicle-dialog";
import type { ContextDrawerTab } from "@/components/estimate-building/estimate-lab-context-drawer";
import type { EstimateWorkspaceVariant } from "@/components/estimate-building/estimate-building-lab-panel";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { formatPhoneInput } from "@/lib/phone";
import {
  formatVehicleContextLabel,
  smsPhoneHref,
  splitVinForDisplay,
} from "@/lib/ro-context-display";
import { useSmsUiEnabled } from "@/lib/shop-capabilities";
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
    "inline-flex size-6 shrink-0 items-center justify-center rounded-none border border-transparent text-[color:var(--jb-azure,#1e7fe0)] transition-colors hover:border-[color:var(--jb-line,#dde5ef)] hover:bg-[color:var(--jb-surface,#f0f3f8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--jb-azure,#1e7fe0)]/40";

  if (href) {
    return (
      <a href={href} className={className} aria-label={label} title={label} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>
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
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </QuickAction>
  );
}

const CONTEXT_CARD_BASE =
  "group relative flex min-w-0 flex-1 cursor-pointer items-stretch gap-0 overflow-hidden rounded-none border border-[color:var(--jb-line,#dde5ef)] bg-white text-left shadow-[0_1px_2px_rgba(11,31,59,0.04)] transition-colors hover:border-[color:var(--jb-hover-line,#b9c8dc)] focus-within:border-[color:var(--jb-azure,#1e7fe0)] focus-within:ring-2 focus-within:ring-[color:var(--jb-azure,#1e7fe0)]/30";

function ContextCardChevron() {
  return (
    <span className="relative z-10 m-2 flex size-7 shrink-0 items-center justify-center self-center rounded-none border border-[color:var(--jb-line,#dde5ef)] bg-white text-[color:var(--jb-slate,#5b7295)] transition-colors group-hover:border-[color:var(--jb-azure,#1e7fe0)] group-hover:bg-[color:var(--jb-azure,#1e7fe0)] group-hover:text-white">
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

function vehicleTitleWithDrivetrain(vehicle: EditableVehicle | null): { display: string; full: string } {
  if (!vehicle) return { display: "—", full: "—" };
  const base = formatVehicleContextLabel(vehicle, 64);
  const drive = vehicle.drivetrain?.trim();
  if (!drive) return base;
  const full = `${base.full} ${drive}`;
  return {
    full,
    display: full.length > 48 ? `${full.slice(0, 47)}…` : full,
  };
}

/** Customer + vehicle context strip — separate clickable blocks open drawer tabs. */
export function EstimateLabContextStack({
  variant: _variant = "lab",
  customer,
  customerId: _customerId,
  vehicle,
  mileageIn,
  odometerNotWorking,
  canEdit: _canEdit,
  drawerData,
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
  const smsEnabled = useSmsUiEnabled();
  const ctx = useEstimateLabContextDrawerOptional();

  const isBusiness = Boolean(customer.company?.trim());
  const personName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  const displayName = isBusiness ? (customer.company ?? "") : personName;
  const phoneFormatted = customer.phone ? formatPhoneInput(customer.phone) : "";

  const vehicleLabel = vehicleTitleWithDrivetrain(vehicle);
  const vinDisplay = vehicle?.vin ? splitVinForDisplay(vehicle.vin) : null;
  const mileageLabel = odometerNotWorking
    ? "Odo N/W"
    : mileageIn != null
      ? `${mileageIn.toLocaleString("en-US")} mi`
      : null;

  const priorRoCount = drawerData?.detail.repairOrders.length ?? null;
  const isFirstVisit = priorRoCount != null && priorRoCount <= 1;
  const prefersText = Boolean(drawerData?.detail.transactionalSmsConsent);

  // ADAS is not modeled on vehicle specs yet — hide until a real flag exists.
  const adasEquipped = false;

  function openDrawerTab(tab: ContextDrawerTab) {
    ctx?.openDrawer(tab);
  }

  const paletteStyle = {
    ["--jb-ink"]: "#0b1f3b",
    ["--jb-azure"]: "#1e7fe0",
    ["--jb-orange"]: "#e86a10",
    ["--jb-slate"]: "#5b7295",
    ["--jb-faint"]: "#8ca2c0",
    ["--jb-line"]: "#dde5ef",
    ["--jb-hover-line"]: "#b9c8dc",
    ["--jb-surface"]: "#f0f3f8",
  } as CSSProperties;

  return (
    <div className="mt-1 grid min-w-0 gap-2 sm:grid-cols-2" style={paletteStyle}>
      {/* Customer card → Profile tab */}
      <div className={CONTEXT_CARD_BASE}>
        <span
          className="w-[3px] shrink-0 self-stretch bg-[color:var(--jb-azure,#1e7fe0)]"
          aria-hidden
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => openDrawerTab("profile")}
          onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("profile"))}
          className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5 focus-visible:outline-none"
          aria-label={`Open customer profile for ${displayName || "customer"}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--jb-faint,#8ca2c0)]">
            Customer
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold leading-snug text-[color:var(--jb-ink,#0b1f3b)]">
              {displayName || "Customer"}
            </span>
            {isFirstVisit ? (
              <span className="inline-flex shrink-0 items-center rounded-none bg-[color:var(--jb-orange,#e86a10)]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--jb-orange,#e86a10)]">
                First visit
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] leading-snug">
            {phoneFormatted && customer.phone ? (
              <a
                href={`tel:${customer.phone.replace(/\D/g, "")}`}
                className="inline-flex min-w-0 items-center gap-1.5 font-medium tabular-nums text-[color:var(--jb-azure,#1e7fe0)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{phoneFormatted}</span>
              </a>
            ) : (
              <span className="text-[color:var(--jb-faint,#8ca2c0)]">Add phone</span>
            )}
            {prefersText ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-[color:var(--jb-slate,#5b7295)]">
                <MessageSquare className="size-3 shrink-0" aria-hidden />
                Prefers text
              </span>
            ) : null}
          </div>
        </div>

        {phoneFormatted && customer.phone ? (
          <div
            className="relative z-10 flex shrink-0 items-center gap-0.5 self-center pr-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {smsEnabled && ctx ? (
              <QuickAction label="Text customer" onClick={() => ctx.openMessages()}>
                <MessageSquare className="size-3.5" />
              </QuickAction>
            ) : (
              <QuickAction label="Text customer" href={smsPhoneHref(customer.phone)}>
                <MessageSquare className="size-3.5" />
              </QuickAction>
            )}
            <CopyFieldButton value={customer.phone} label="Copy phone" />
          </div>
        ) : null}

        <ContextCardChevron />
      </div>

      {/* Vehicle card → Vehicles tab */}
      {vehicle ? (
        <div className={CONTEXT_CARD_BASE}>
          <span
            className="w-[3px] shrink-0 self-stretch bg-[color:var(--jb-ink,#0b1f3b)]"
            aria-hidden
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => openDrawerTab("vehicles")}
            onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("vehicles"))}
            className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5 focus-visible:outline-none"
            aria-label={`Open vehicles for ${vehicleLabel.full || "vehicle"}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--jb-faint,#8ca2c0)]">
              Vehicle
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className="min-w-0 truncate text-[15px] font-semibold leading-snug text-[color:var(--jb-ink,#0b1f3b)]"
                title={vehicleLabel.full}
              >
                {vehicleLabel.display}
              </span>
              {vehicle.plate ? (
                <span className="inline-flex max-w-full shrink-0 items-baseline gap-1 rounded-none border-[1.5px] border-[color:var(--jb-ink,#0b1f3b)] bg-[#f4f6fa] px-1.5 py-0.5 font-mono leading-none">
                  <span className="text-[11px] font-semibold tracking-wide text-[color:var(--jb-ink,#0b1f3b)]">
                    {vehicle.plate}
                  </span>
                  {vehicle.plateState ? (
                    <span className="text-[10px] font-medium text-[color:var(--jb-faint,#8ca2c0)]">
                      {vehicle.plateState}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-snug text-[color:var(--jb-slate,#5b7295)]">
              {vinDisplay ? (
                <span className="inline-flex min-w-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span
                    className="inline-flex items-center font-mono text-[12px] tabular-nums"
                    aria-label={`VIN ${vinDisplay.full}`}
                    title={vinDisplay.full}
                  >
                    {vinDisplay.prefix ? (
                      <span className="text-[color:var(--jb-faint,#8ca2c0)]">{vinDisplay.prefix}</span>
                    ) : null}
                    <span className="rounded-sm bg-[color:var(--jb-azure,#1e7fe0)]/15 px-0.5 font-semibold text-[color:var(--jb-ink,#0b1f3b)]">
                      {vinDisplay.last8}
                    </span>
                  </span>
                  <CopyFieldButton value={vinDisplay.full} label="Copy VIN" />
                </span>
              ) : null}
              {mileageLabel ? (
                <>
                  {vinDisplay ? (
                    <span className="text-[color:var(--jb-faint,#8ca2c0)]" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span className="tabular-nums">{mileageLabel}</span>
                </>
              ) : null}
              {adasEquipped ? (
                <span className="inline-flex max-w-full items-center gap-1 rounded-none bg-[color:var(--jb-azure,#1e7fe0)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--jb-azure,#1e7fe0)]">
                  <Crosshair className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">ADAS equipped — calibration may apply</span>
                </span>
              ) : null}
            </div>
          </div>
          <ContextCardChevron />
        </div>
      ) : (
        <div className={CONTEXT_CARD_BASE}>
          <span
            className="w-[3px] shrink-0 self-stretch bg-[color:var(--jb-ink,#0b1f3b)]"
            aria-hidden
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => openDrawerTab("vehicles")}
            onKeyDown={(e) => onCardKeyDown(e, () => openDrawerTab("vehicles"))}
            className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5 text-[color:var(--jb-slate,#5b7295)] focus-visible:outline-none"
            aria-label="Open vehicles — no vehicle on this RO"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--jb-faint,#8ca2c0)]">
              Vehicle
            </span>
            <span className="text-[15px] font-semibold text-[color:var(--jb-ink,#0b1f3b)]">No vehicle</span>
          </div>
          <ContextCardChevron />
        </div>
      )}
    </div>
  );
}
