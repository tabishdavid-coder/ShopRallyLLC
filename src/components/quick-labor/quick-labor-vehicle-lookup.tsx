"use client";

import { useState, useTransition } from "react";
import { Info, Loader2, Search } from "lucide-react";

import { QuickLaborVehicleStrip } from "@/components/quick-labor/quick-labor-vehicle-strip";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
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
  "h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export type QuickLaborVehicleContext = {
  vehicle: QuickLaborVehicle;
  decoded: DecodedVin;
  displayVin: string | null;
};

function toQuickLaborVehicle(
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

export function QuickLaborVehicleLookup({
  context,
  onContextChange,
}: {
  context: QuickLaborVehicleContext | null;
  onContextChange: (ctx: QuickLaborVehicleContext | null) => void;
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
          onContextChange({
            vehicle: toQuickLaborVehicle(res.decoded, v.toUpperCase(), null, lookupState),
            decoded: res.decoded,
            displayVin: v.toUpperCase(),
          });
        } else {
          setLookupNote(res.error);
          onContextChange(null);
        }
      } else if (!autodevDecodingOk) {
        setLookupNote(
          "Plate lookup is not included on Core. Enter a 17-character VIN for NHTSA decode.",
        );
        onContextChange(null);
      } else {
        const res = await lookupPlate(lookupState, v);
        if (res.ok) {
          onContextChange({
            vehicle: toQuickLaborVehicle(res.decoded, res.vin, v.toUpperCase(), lookupState),
            decoded: res.decoded,
            displayVin: res.vin,
          });
        } else {
          setLookupNote(res.error);
          onContextChange(null);
        }
      }
    });
  }

  function resetLookup() {
    setLookup("");
    setLookupState("NY");
    setLookupNote(null);
    onContextChange(null);
  }

  if (context) {
    return (
      <QuickLaborVehicleStrip
        vehicle={context.vehicle}
        decoded={context.decoded}
        displayVin={context.displayVin}
        onChange={resetLookup}
      />
    );
  }

  return (
    <div className="border-b border-border/80 bg-muted/20 px-3 py-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runLookup();
            }}
            placeholder={
              autodevDecodingOk ? "License plate or 17-character VIN" : CORE_VEHICLE_SEARCH_PLACEHOLDER
            }
            className={cn(input, "w-full pl-7 font-mono uppercase")}
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
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-navy px-3 text-sm font-medium text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-50"
          >
            {decoding ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {autodevDecodingOk ? "Look up" : "Decode VIN"}
          </button>
        </div>
      </div>
      {lookupNote ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-900">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {lookupNote}
        </div>
      ) : autodevDecodingOk ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          No customer needed · demo plate{" "}
          <span className="font-mono font-medium">RP1000</span> (NY)
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{CORE_VEHICLE_SEARCH_HELPER}</p>
      )}
    </div>
  );
}
