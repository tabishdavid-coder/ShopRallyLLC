import "server-only";

import { parseEngineString } from "@/lib/engine-details";
import { vinService, type DecodedVin } from "@/server/services/vin";

/**
 * License-plate → vehicle lookup behind a swappable provider interface.
 *
 * DEV: MockPlateLookupProvider (deterministic demo plates, no API key).
 * LIVE: AutoDevPlateLookupProvider when AUTODEV_API_KEY is set.
 * FUTURE: swap in DataOne / VinAudit plate APIs via the same interface.
 */

export type PlateLookupData = {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  raw: unknown;
};

export interface PlateLookupProvider {
  lookupPlate(plate: string, state: string): Promise<PlateLookupData | null>;
}

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase();
}

function toDecodedVin(data: PlateLookupData): DecodedVin {
  return {
    year: data.year,
    make: data.make,
    model: data.model,
    trim: data.trim,
    engine: data.engine,
    engineDetails: parseEngineString(data.engine),
    transmission: data.transmission,
    drivetrain: data.drivetrain,
    bodyClass: data.bodyClass,
    raw: data.raw,
  };
}

/** Deterministic demo mapping for local dev / when no paid provider is configured. */
class MockPlateLookupProvider implements PlateLookupProvider {
  async lookupPlate(plate: string, state: string): Promise<PlateLookupData | null> {
    const pl = normalizePlate(plate);
    const st = normalizeState(state);
    if (!pl || !st) return null;

    // RP1000 + NY → seeded demo vehicle (2003 Honda Accord from project docs).
    if (pl === "RP1000" && st === "NY") {
      return {
        vin: "1HGCM82633A004352",
        year: 2003,
        make: "Honda",
        model: "Accord",
        trim: "EX-V6",
        engine: "3.0L 6-cyl",
        transmission: "5-Speed Automatic",
        drivetrain: "FWD",
        bodyClass: "Sedan",
        raw: { provider: "mock", plate: pl, state: st },
      };
    }

    // Any RP#### plate in NY gets a synthetic VIN pattern for testing.
    const rpMatch = /^RP(\d{4})$/.exec(pl);
    if (rpMatch && st === "NY") {
      const num = rpMatch[1];
      return {
        vin: `1HGCV1F3${num}A004352`.slice(0, 17),
        year: 2019,
        make: "Honda",
        model: "Accord",
        trim: "Sport",
        engine: "1.5L 4-cyl Turbo",
        transmission: "CVT",
        drivetrain: "FWD",
        bodyClass: "Sedan",
        raw: { provider: "mock", plate: pl, state: st },
      };
    }

    return null;
  }
}

const AUTODEV_V1 = "https://auto.dev/api";

/** Live US plate lookup via Auto.dev (requires AUTODEV_API_KEY). */
class AutoDevPlateLookupProvider implements PlateLookupProvider {
  constructor(private key: string) {}

  async lookupPlate(plate: string, state: string): Promise<PlateLookupData | null> {
    const st = normalizeState(state);
    const pl = normalizePlate(plate);
    if (!st || !pl) return null;

    const res = await fetch(`${AUTODEV_V1}/plate/${encodeURIComponent(st)}/${encodeURIComponent(pl)}`, {
      headers: { Authorization: `Bearer ${this.key}`, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let j: unknown = null;
    try {
      j = JSON.parse(text);
    } catch {
      /* string body = no result */
    }
    if (!res.ok || !j || typeof j === "string") return null;

    const o = j as {
      vin?: string;
      year?: number;
      make?: string;
      model?: string;
      trim?: string;
      vehicle?: { vin?: string; year?: number; make?: string; model?: string };
    };
    const vin = o.vin ?? o.vehicle?.vin ?? null;
    const year = o.year ?? o.vehicle?.year ?? null;
    const make = o.make ?? o.vehicle?.make ?? null;
    const model = o.model ?? o.vehicle?.model ?? null;
    if (!vin && !make && !model && !year) return null;

    return {
      vin,
      year,
      make,
      model,
      trim: o.trim ?? null,
      engine: null,
      transmission: null,
      drivetrain: null,
      bodyClass: null,
      raw: j,
    };
  }
}

class FallbackPlateLookupProvider implements PlateLookupProvider {
  constructor(
    private live: PlateLookupProvider | null,
    private mock: PlateLookupProvider,
  ) {}

  async lookupPlate(plate: string, state: string): Promise<PlateLookupData | null> {
    if (this.live) {
      try {
        const r = await this.live.lookupPlate(plate, state);
        if (r) return r;
      } catch {
        /* fall through to mock */
      }
    }
    return this.mock.lookupPlate(plate, state);
  }
}

const autodevKey = process.env.AUTODEV_API_KEY?.trim();
const mockProvider = new MockPlateLookupProvider();

export const plateLookupService: PlateLookupProvider = new FallbackPlateLookupProvider(
  autodevKey ? new AutoDevPlateLookupProvider(autodevKey) : null,
  mockProvider,
);

export type PlateResult =
  | { ok: true; decoded: DecodedVin; vin: string | null }
  | { ok: false; error: string };

/** Look up a US license plate → vehicle data; enriches via VIN decode when a VIN is returned. */
export async function lookupPlateService(plate: string, state: string): Promise<PlateResult> {
  const st = normalizeState(state);
  const pl = normalizePlate(plate);
  if (!st || !pl) return { ok: false, error: "Enter a license plate and state." };

  try {
    const data = await plateLookupService.lookupPlate(pl, st);
    if (!data) {
      return { ok: false, error: "No vehicle found for that plate." };
    }

    if (data.vin) {
      const decoded = await vinService.decode(data.vin);
      if (decoded) {
        return { ok: true, decoded, vin: data.vin };
      }
    }

    return { ok: true, vin: data.vin, decoded: toDecodedVin(data) };
  } catch {
    return { ok: false, error: "Plate lookup service is unavailable right now." };
  }
}
