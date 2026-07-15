"use client";

import { Phone, ShoppingCart, Truck, Wrench } from "lucide-react";

import type { IntegrationConnectionState } from "@/lib/integrations";
import { usePartsTechUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

type VendorTile = {
  id: string;
  label: string;
  state: IntegrationConnectionState;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick: () => void;
};

function connectionDot(state: IntegrationConnectionState) {
  if (state === "connected" || state === "configured") return "bg-emerald-500";
  if (state === "mock") return "bg-amber-500";
  return "bg-muted-foreground/35";
}

function VendorChip({
  label,
  state,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  state: IntegrationConnectionState;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick: () => void;
}) {
  const active = state === "connected" || state === "configured" || state === "mock";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={
        state === "mock"
          ? "Sample catalog"
          : state === "inactive"
            ? "Not connected"
            : "Connected"
      }
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium shadow-sm transition-colors",
        active && !disabled
          ? "border-brand-navy/25 text-brand-navy hover:border-brand-navy/40 hover:bg-brand-light/10"
          : "border-border text-muted-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-white",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", connectionDot(state))} aria-hidden />
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** Compact horizontal vendor chips — Manual + catalog integrations. */
export function EstimateLabPartsVendorStrip({
  canEdit,
  partstechState,
  weldonState,
  onManualOrder,
  onPartsLookup,
  onWholesaleStub,
  onTireStub,
}: {
  canEdit: boolean;
  partstechState: IntegrationConnectionState;
  weldonState: IntegrationConnectionState;
  onManualOrder: () => void;
  onPartsLookup: () => void;
  onWholesaleStub?: () => void;
  onTireStub?: () => void;
}) {
  const partsTechOk = usePartsTechUiEnabled();
  const tiles: VendorTile[] = [
    {
      id: "manual",
      label: "Manual order",
      state: "connected",
      icon: Phone,
      disabled: !canEdit,
      onClick: onManualOrder,
    },
    ...(partsTechOk
      ? [
          {
            id: "partstech",
            label: "Parts lookup",
            state: partstechState,
            icon: ShoppingCart,
            disabled: !canEdit || partstechState === "inactive",
            onClick: onPartsLookup,
          } satisfies VendorTile,
        ]
      : []),
    {
      id: "wholesale",
      label: "Wholesale",
      state: "inactive",
      icon: Truck,
      disabled: true,
      onClick: onWholesaleStub ?? (() => {}),
    },
    {
      id: "tire",
      label: "Tires",
      state: weldonState === "inactive" ? "inactive" : weldonState,
      icon: Wrench,
      disabled: true,
      onClick: onTireStub ?? (() => {}),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Order from
      </span>
      {tiles.map((t) => (
        <VendorChip
          key={t.id}
          label={t.label}
          state={t.state}
          icon={t.icon}
          disabled={t.disabled}
          onClick={t.onClick}
        />
      ))}
    </div>
  );
}
