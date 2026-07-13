import "server-only";

import {
  engineDetailsFromAutoDev,
  engineDetailsFromNhtsa,
  mergeEngineDetails,
  parseEngineString,
  type EngineDetails,
} from "@/lib/engine-details";

/**
 * VIN + license-plate decoding behind a swappable provider interface.
 *
 * PRIMARY: Auto.dev (rich US-market data — make/model/trim/engine, + plate→VIN)
 * when AUTODEV_API_KEY is set. FALLBACK: free NHTSA vPIC. The rest of the app
 * only sees our `DecodedVin` model.
 */

export type DecodedVin = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  /** Structured engine breakdown for UI (displacement, cylinders, fuel, etc.). */
  engineDetails: EngineDetails;
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  /** Full raw provider payload, cached on the Vehicle. */
  raw: unknown;
};

export interface VinProvider {
  decode(vin: string): Promise<DecodedVin | null>;
}

export function isValidVin(vin: string): boolean {
  // 17 chars, no I/O/Q.
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

/* ───────────────────────── NHTSA (fallback) ───────────────────────── */

type NhtsaResult = Record<string, string> & {
  ErrorCode?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Trim?: string;
  Series?: string;
  DisplacementL?: string;
  EngineCylinders?: string;
  FuelTypePrimary?: string;
  TransmissionStyle?: string;
  TransmissionSpeeds?: string;
  DriveType?: string;
  BodyClass?: string;
};

function nhtsaEngine(r: NhtsaResult): string | null {
  const parts: string[] = [];
  if (r.DisplacementL) parts.push(`${Number(r.DisplacementL).toFixed(1)}L`);
  if (r.EngineCylinders) parts.push(`${r.EngineCylinders}-cyl`);
  if (r.FuelTypePrimary && r.FuelTypePrimary !== "Not Applicable") parts.push(r.FuelTypePrimary.replace(/\s*\(.*\)/, ""));
  return parts.length ? parts.join(" ") : null;
}

function nhtsaTransmission(r: NhtsaResult): string | null {
  const parts: string[] = [];
  if (r.TransmissionSpeeds) parts.push(`${r.TransmissionSpeeds}-Speed`);
  if (r.TransmissionStyle) parts.push(r.TransmissionStyle);
  return parts.length ? parts.join(" ") : null;
}

function mapNhtsa(r: NhtsaResult): DecodedVin {
  const year = r.ModelYear ? Number(r.ModelYear) : null;
  const engine = nhtsaEngine(r);
  const structured = engineDetailsFromNhtsa(r);
  const fromSummary = parseEngineString(engine);
  return {
    year: Number.isFinite(year) ? year : null,
    make: r.Make || null,
    model: r.Model || null,
    trim: r.Trim || r.Series || null,
    engine,
    engineDetails: mergeEngineDetails(structured, fromSummary),
    transmission: nhtsaTransmission(r),
    drivetrain: r.DriveType || null,
    bodyClass: r.BodyClass || null,
    raw: r,
  };
}

class NhtsaVinProvider implements VinProvider {
  async decode(vin: string): Promise<DecodedVin | null> {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin.trim())}?format=json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { Results?: NhtsaResult[] };
    const r = json.Results?.[0];
    if (!r) return null;
    return mapNhtsa(r);
  }
}

/* ───────────────────────── Auto.dev (primary) ───────────────────────── */

const AUTODEV_VIN = "https://api.auto.dev";

type AutoDevVin = {
  vinValid?: boolean;
  make?: string;
  model?: string;
  trim?: string;
  style?: string;
  body?: string;
  engine?: string;
  drive?: string;
  transmission?: string;
  years?: number[];
  vehicle?: { year?: number; make?: string; model?: string; vin?: string };
};

function mapAutoDev(j: AutoDevVin): DecodedVin {
  const year = j.vehicle?.year ?? (Array.isArray(j.years) && j.years.length === 1 ? j.years[0] : null);
  const engine = j.engine ?? j.style ?? null;
  const structured = engineDetailsFromAutoDev(j);
  const fromSummary = parseEngineString(engine);
  return {
    year: year ?? null,
    make: j.make ?? j.vehicle?.make ?? null,
    model: j.model ?? j.vehicle?.model ?? null,
    trim: j.trim ?? null,
    engine,
    engineDetails: mergeEngineDetails(structured, fromSummary),
    transmission: j.transmission ?? null,
    drivetrain: j.drive ?? null,
    bodyClass: j.body ?? null,
    raw: j,
  };
}

class AutoDevVinProvider implements VinProvider {
  constructor(private key: string) {}
  async decode(vin: string): Promise<DecodedVin | null> {
    const res = await fetch(`${AUTODEV_VIN}/vin/${encodeURIComponent(vin.trim())}`, {
      headers: { Authorization: `Bearer ${this.key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as AutoDevVin;
    if (j.vinValid === false) return null;
    if (!j.make && !j.model && !j.vehicle?.make) return null;
    return mapAutoDev(j);
  }
}

/** Tries the primary provider, falls back to NHTSA on null/error. */
class FallbackVinProvider implements VinProvider {
  constructor(private primary: VinProvider | null, private fallback: VinProvider) {}
  async decode(vin: string): Promise<DecodedVin | null> {
    if (this.primary) {
      try {
        const r = await this.primary.decode(vin);
        if (r) return r;
      } catch {
        /* fall through */
      }
    }
    return this.fallback.decode(vin);
  }
}

const autodevKey = process.env.AUTODEV_API_KEY?.trim();

const nhtsaVinProvider = new NhtsaVinProvider();

/** Shop-plan-aware VIN decode — Core uses free NHTSA only; Pro+ may use Auto.dev when configured. */
export async function decodeVinForShop(shopId: string, vin: string): Promise<DecodedVin | null> {
  const { canUseFeature } = await import("@/lib/subscription");
  const autodev = await canUseFeature(shopId, "autodevDecoding");
  if (autodev) return vinService.decode(vin);
  return nhtsaVinProvider.decode(vin);
}

export const vinService: VinProvider = new FallbackVinProvider(
  autodevKey ? new AutoDevVinProvider(autodevKey) : null,
  new NhtsaVinProvider(),
);
