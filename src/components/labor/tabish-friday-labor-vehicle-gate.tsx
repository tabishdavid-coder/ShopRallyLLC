"use client";

import { useState, useTransition } from "react";
import { Info, Loader2, Search } from "lucide-react";

import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { quickLaborVehicleLabel } from "@/lib/quick-labor";
import { TABISH_FRIDAY_LABOR_TITLE } from "@/lib/tabish-friday-labor";
import {
  CORE_VEHICLE_SEARCH_HELPER,
  CORE_VEHICLE_SEARCH_PLACEHOLDER,
} from "@/lib/core-vehicle-decode";
import { useAutodevDecodingUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";
import { decodeVin, lookupPlate } from "@/server/actions/vehicles";
import type { DecodedVin } from "@/server/services/vin";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY",
];

const input =
  "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export type TabishFridayVehicleContext = {
  vehicle: QuickLaborVehicle;
  decoded: DecodedVin;
  displayVin: string | null;
};

function toVehicle(
  decoded: DecodedVin,
  vin: string | null,
  plate: string | null,
  plateState: string,
): QuickLaborVehicle {
  return {
    vin: vin ?? null,
    year: decoded.year,
    make: decoded.make,
    model: decoded.model,
    trim: decoded.trim,
    engine: decoded.engine,
    drivetrain: decoded.drivetrain,
    plate,
    plateState: plate ? plateState : null,
  };
}

/** Compact strip after decode — change vehicle resets gate. */
export function TabishFridayVehicleStrip({
  context,
  onChange,
  className,
}: {
  context: TabishFridayVehicleContext;
  onChange: () => void;
  className?: string;
}) {
  const label = quickLaborVehicleLabel(context.vehicle);
  const engine = [context.vehicle.engine, context.vehicle.drivetrain].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/20 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-navy">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {[context.displayVin ? `VIN ${context.displayVin}` : null, engine || null]
            .filter(Boolean)
            .join(" · ") || "Vehicle identified"}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
      >
        Change vehicle
      </button>
    </div>
  );
}

/**
 * VIN / plate decode gate — required before Tabish Friday Labor workspace loads.
 * Reuses ShopRally decodeVin + lookupPlate server actions.
 */
export function TabishFridayLaborVehicleGate({
  onIdentified,
  compact = false,
  className,
}: {
  onIdentified: (ctx: TabishFridayVehicleContext) => void;
  compact?: boolean;
  className?: string;
}) {
  const [lookup, setLookup] = useState("");
  const [lookupState, setLookupState] = useState("NY");
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [decoding, startDecode] = useTransition();
  const autodevDecodingOk = useAutodevDecodingUiEnabled();

  const looksLikeVin = lookup.trim().replace(/\s/g, "").length === 17;

  function runLookup() {
    setLookupNote(null);
    const v = lookup.trim().replace(/\s/g, "");
    if (!v) return;

    startDecode(async () => {
      if (v.length === 17) {
        const res = await decodeVin(v);
        if (res.ok) {
          onIdentified({
            vehicle: toVehicle(res.decoded, v.toUpperCase(), null, lookupState),
            decoded: res.decoded,
            displayVin: v.toUpperCase(),
          });
        } else {
          setLookupNote(res.error);
        }
      } else if (!autodevDecodingOk) {
        setLookupNote(
          "Plate lookup is not included on Core. Enter a 17-character VIN for NHTSA decode.",
        );
      } else {
        const res = await lookupPlate(lookupState, v);
        if (res.ok) {
          onIdentified({
            vehicle: toVehicle(res.decoded, res.vin, v.toUpperCase(), lookupState),
            decoded: res.decoded,
            displayVin: res.vin,
          });
        } else {
          setLookupNote(res.error);
        }
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-4 py-8",
        compact ? "py-6" : "min-h-[280px]",
        className,
      )}
    >
      <div className="max-w-md space-y-1 text-center">
        <h2 className="text-base font-bold text-brand-navy">{TABISH_FRIDAY_LABOR_TITLE}</h2>
        <p className="text-xs text-muted-foreground">
          Decode a VIN or license plate to load labor times, fluid specs, combined jobs, and
          procedures for this vehicle.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runLookup();
              }}
              placeholder={
                autodevDecodingOk
                  ? "License plate or 17-character VIN"
                  : CORE_VEHICLE_SEARCH_PLACEHOLDER
              }
              className={cn(input, "w-full pl-8 font-mono uppercase")}
              autoFocus
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={lookupState}
              onChange={(e) => setLookupState(e.target.value)}
              className={cn(input, "w-16 px-1")}
              disabled={looksLikeVin}
              aria-label="Plate state"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={runLookup}
              disabled={decoding || !lookup.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-navy px-4 text-sm font-medium text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
            >
              {decoding ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {autodevDecodingOk ? "Decode & open" : "Decode VIN"}
            </button>
          </div>
        </div>
        {lookupNote ? (
          <div className="flex items-start gap-1.5 text-xs text-amber-900">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {lookupNote}
          </div>
        ) : autodevDecodingOk ? (
          <p className="text-[11px] text-muted-foreground">
            Pro/Elite · plate lookup enabled · demo plate{" "}
            <span className="font-mono font-medium">RP1000</span> (NY)
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{CORE_VEHICLE_SEARCH_HELPER}</p>
        )}
      </div>
    </div>
  );
}
