"use client";

import { useCallback, useState, useTransition } from "react";

import { decodeVin, lookupPlate } from "@/server/actions/vehicles";
import { useAutodevDecodingUiEnabled } from "@/lib/shop-capabilities";
import type { DecodedVin } from "@/server/services/vin";

export type VehicleLookupFields = {
  vin?: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  bodyClass?: string | null;
  decodedData?: unknown;
};

export type PlateVinLookupResult = {
  vin: string | null;
  fields: VehicleLookupFields;
};

/** Merge decoded vehicle data — only fills empty target fields unless `overwrite` is true. */
export function mergeDecodedFields(
  current: VehicleLookupFields,
  decoded: DecodedVin,
  vin: string | null,
  opts?: { overwrite?: boolean },
): VehicleLookupFields {
  const overwrite = opts?.overwrite ?? false;
  const pick = <T>(next: T | null | undefined, prev: T | null | undefined): T | null | undefined =>
    overwrite ? (next ?? prev) : (prev ?? next);

  return {
    vin: vin ?? current.vin,
    year: pick(decoded.year, current.year) ?? null,
    make: pick(decoded.make, current.make) ?? null,
    model: pick(decoded.model, current.model) ?? null,
    trim: pick(decoded.trim, current.trim) ?? null,
    engine: pick(decoded.engine, current.engine) ?? null,
    transmission: pick(decoded.transmission, current.transmission) ?? null,
    drivetrain: pick(decoded.drivetrain, current.drivetrain) ?? null,
    bodyClass: pick(decoded.bodyClass, current.bodyClass) ?? null,
    decodedData: decoded.raw,
  };
}

export function usePlateVinLookup() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const autodevDecodingOk = useAutodevDecodingUiEnabled();

  const clearMessages = useCallback(() => {
    setError(null);
    setNote(null);
  }, []);

  const lookupByPlate = useCallback(
    (
      state: string,
      plate: string,
      current: VehicleLookupFields,
      onSuccess: (result: PlateVinLookupResult) => void,
      opts?: { overwrite?: boolean },
    ) => {
      const pl = plate.trim();
      if (!pl) {
        setError("Enter a license plate.");
        return;
      }
      if (!autodevDecodingOk) {
        setError(
          "Plate lookup is not included on Core. Enter the plate manually or decode a 17-character VIN.",
        );
        return;
      }
      setError(null);
      setNote(null);
      startTransition(async () => {
        const res = await lookupPlate(state, pl);
        if (res.ok) {
          const fields = mergeDecodedFields(current, res.decoded, res.vin, opts);
          onSuccess({ vin: res.vin ?? fields.vin ?? null, fields });
          setNote(
            [fields.year, fields.make, fields.model, fields.trim].filter(Boolean).join(" ") ||
              "Vehicle found",
          );
        } else {
          setError(res.error);
        }
      });
    },
    [autodevDecodingOk],
  );

  const lookupByVin = useCallback(
    (
      rawVin: string,
      current: VehicleLookupFields,
      onSuccess: (result: PlateVinLookupResult) => void,
      opts?: { overwrite?: boolean },
    ) => {
      const v = rawVin.trim().replace(/\s/g, "").toUpperCase();
      if (v.length !== 17) return;
      setError(null);
      setNote(null);
      startTransition(async () => {
        const res = await decodeVin(v);
        if (res.ok) {
          const fields = mergeDecodedFields(current, res.decoded, v, opts);
          onSuccess({ vin: v, fields });
          const ymm =
            [fields.year, fields.make, fields.model, fields.trim].filter(Boolean).join(" ") ||
            "VIN decoded";
          setNote(autodevDecodingOk ? ymm : `${ymm} · NHTSA vPIC`);
        } else {
          setError(res.error);
        }
      });
    },
    [autodevDecodingOk],
  );

  return { pending, error, note, clearMessages, lookupByPlate, lookupByVin };
}

type LookupFail = { ok: false; error: string };
type LookupOk = { ok: true; result: PlateVinLookupResult };

/** Awaitable VIN decode for save flows (intake forms, etc.). */
export async function resolveVehicleFromVin(
  rawVin: string,
  current: VehicleLookupFields,
  opts?: { overwrite?: boolean },
): Promise<LookupOk | LookupFail> {
  const v = rawVin.trim().replace(/\s/g, "").toUpperCase();
  if (v.length !== 17) {
    return { ok: false, error: "Enter a complete 17-character VIN." };
  }
  const res = await decodeVin(v);
  if (!res.ok) return { ok: false, error: res.error };
  const fields = mergeDecodedFields(current, res.decoded, v, opts);
  return { ok: true, result: { vin: v, fields } };
}

/** Awaitable plate lookup for save flows. */
export async function resolveVehicleFromPlate(
  state: string,
  plate: string,
  current: VehicleLookupFields,
  opts?: { overwrite?: boolean },
): Promise<LookupOk | LookupFail> {
  const pl = plate.trim();
  if (!pl) return { ok: false, error: "Enter a license plate." };
  const res = await lookupPlate(state, pl);
  if (!res.ok) return { ok: false, error: res.error };
  const fields = mergeDecodedFields(current, res.decoded, res.vin, opts);
  return { ok: true, result: { vin: res.vin ?? fields.vin ?? null, fields } };
}
