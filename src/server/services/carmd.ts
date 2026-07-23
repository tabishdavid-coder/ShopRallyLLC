import "server-only";

import type {
  CarMdDtcLookupResult,
  CarMdMaintenanceItem,
  CarMdRepairHint,
  CarMdRepairPart,
} from "@/lib/carmd-types";

export type {
  CarMdDtcLookupResult,
  CarMdMaintenanceItem,
  CarMdRepairHint,
  CarMdRepairPart,
} from "@/lib/carmd-types";

/**
 * CarMD Vehicle API — diagnostics, DTC definitions, maintenance, repair cost hints.
 *
 * Portal / signup: https://api.carmd.com/member/ (unreachable 2026-07-22 — contact carmd.com/pages/contact)
 * Docs: https://api.carmd.com/member/docs (same host — down)
 * Base URL: https://api.carmd.com/v3.0 (TCP timeout from public internet as of 2026-07-22)
 * Legacy https://www.carmd.com/api/ → 404 (Shopify migration). See docs/integrations-carmd.md.
 *
 * Auth headers (from CarMD developer dashboard):
 *   authorization: Basic <token>   (full value — include the "Basic " prefix)
 *   partner-token: <partner id>
 *
 * Live when both env vars resolve; otherwise MockCarMdProvider (no network).
 * Call only from explicit user actions — never on RO/estimate idle load.
 */

const DEFAULT_BASE = "https://api.carmd.com/v3.0";

export type CarMdCredentials = {
  authorization?: string;
  partnerToken?: string;
  baseUrl: string;
};

export type CarMdVehicleInput = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  mileage?: number | null;
};

export interface CarMdProvider {
  readonly mode: "live" | "mock";
  lookupDtc(input: { code: string; vehicle: CarMdVehicleInput }): Promise<CarMdDtcLookupResult>;
  getMaintenance(vehicle: CarMdVehicleInput): Promise<CarMdMaintenanceItem[]>;
  verifyConnection(): Promise<void>;
}

type CarMdEnvelope<T> = {
  message?: { code?: number; message?: string; credentials?: string; version?: string; server_time?: string };
  data?: T;
};

type CarMdCodeRow = {
  code?: string;
  desc?: string;
  definition?: string;
  title?: string;
};

type CarMdRepairRow = {
  desc?: string;
  urgency?: number;
  urgency_desc?: string;
  repair?: {
    difficulty?: number;
    hours?: number;
    labor_rate_per_hour?: number;
    part_cost?: number | string;
    labor_cost?: number | string;
    misc_cost?: number | string;
    total_cost?: number | string;
  };
  parts?: { desc?: string; price?: number | string; qty?: string }[];
};

type CarMdMaintRow = {
  desc?: string;
  due_mileage?: number;
  is_oem?: boolean;
  repair?: { total_cost?: number | string };
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizeAuthorization(raw: string | undefined): string | undefined {
  const v = str(raw);
  if (!v) return undefined;
  if (/^basic\s/i.test(v)) return v;
  return `Basic ${v}`;
}

function dollarsToCents(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function normalizeDtc(code: string): string {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

function vehicleQuery(vehicle: CarMdVehicleInput): URLSearchParams {
  const q = new URLSearchParams();
  const vin = str(vehicle.vin);
  if (vin) {
    q.set("vin", vin);
  } else {
    if (vehicle.year) q.set("year", String(vehicle.year));
    const make = str(vehicle.make);
    const model = str(vehicle.model);
    if (make) q.set("make", make);
    if (model) q.set("model", model);
  }
  if (vehicle.mileage != null && Number.isFinite(vehicle.mileage)) {
    q.set("mileage", String(Math.max(0, Math.round(vehicle.mileage))));
  }
  return q;
}

function mapRepairRow(row: CarMdRepairRow): CarMdRepairHint {
  const r = row.repair ?? {};
  return {
    description: row.desc?.trim() || "Repair",
    urgency: typeof row.urgency === "number" ? row.urgency : null,
    urgencyDescription: str(row.urgency_desc) ?? null,
    difficulty: typeof r.difficulty === "number" ? r.difficulty : null,
    laborHours: typeof r.hours === "number" ? r.hours : null,
    laborCostCents: dollarsToCents(r.labor_cost),
    partsCostCents: dollarsToCents(r.part_cost),
    totalCostCents: dollarsToCents(r.total_cost),
    parts: (row.parts ?? []).map((p) => ({
      description: p.desc?.trim() || "Part",
      priceCents: dollarsToCents(p.price),
      qty: str(p.qty) ?? null,
    })),
  };
}

function mapMaintRow(row: CarMdMaintRow): CarMdMaintenanceItem {
  return {
    description: row.desc?.trim() || "Maintenance item",
    dueMileage: typeof row.due_mileage === "number" ? row.due_mileage : null,
    isOem: Boolean(row.is_oem),
    totalCostCents: dollarsToCents(row.repair?.total_cost),
  };
}

/** Merge shop integration config with platform env fallbacks. */
export function mergeCarMdCredentials(shopConfig: Record<string, unknown> = {}): CarMdCredentials & { ready: boolean } {
  const authorization =
    normalizeAuthorization(str(shopConfig.authorization)) ??
    normalizeAuthorization(process.env.CARMD_AUTHORIZATION?.trim()) ??
    normalizeAuthorization(process.env.CARMD_API_KEY?.trim());
  const partnerToken =
    str(shopConfig.partnerToken) ??
    process.env.CARMD_PARTNER_TOKEN?.trim() ??
    process.env.CARMD_PARTNER_ID?.trim();
  const baseUrl =
    str(shopConfig.baseUrl) ?? process.env.CARMD_API_BASE_URL?.trim() ?? DEFAULT_BASE;

  return {
    authorization,
    partnerToken,
    baseUrl,
    ready: Boolean(authorization && partnerToken),
  };
}

export function isCarMdConfigured(shopConfig: Record<string, unknown> = {}): boolean {
  return mergeCarMdCredentials(shopConfig).ready;
}

class LiveCarMdProvider implements CarMdProvider {
  readonly mode = "live" as const;

  constructor(private cfg: { authorization: string; partnerToken: string; baseUrl: string }) {}

  async #get<T>(path: string, query: URLSearchParams): Promise<T> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}?${query.toString()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        authorization: this.cfg.authorization,
        "partner-token": this.cfg.partnerToken,
      },
    });
    const text = await res.text();
    let json: CarMdEnvelope<T>;
    try {
      json = JSON.parse(text) as CarMdEnvelope<T>;
    } catch {
      throw new Error(`CarMD returned non-JSON (${res.status}).`);
    }
    if (!res.ok) {
      const msg = json.message?.message ?? text.slice(0, 200);
      throw new Error(`CarMD ${path} failed (${res.status}): ${msg}`);
    }
    const code = json.message?.code;
    if (code != null && code !== 0) {
      throw new Error(json.message?.message ?? `CarMD error code ${code}`);
    }
    return (json.data ?? null) as T;
  }

  async verifyConnection(): Promise<void> {
    const q = new URLSearchParams({ vin: "1HGCM82633A004352" });
    await this.#get<unknown>("fields", q);
  }

  async lookupDtc(input: { code: string; vehicle: CarMdVehicleInput }): Promise<CarMdDtcLookupResult> {
    const code = normalizeDtc(input.code);
    const codeQ = new URLSearchParams({ code: code.toLowerCase() });
    const codeData = await this.#get<CarMdCodeRow | CarMdCodeRow[]>("code", codeQ);
    const codeRow = Array.isArray(codeData) ? codeData[0] : codeData;

    const repairsQ = vehicleQuery(input.vehicle);
    repairsQ.set("dtc", code.toLowerCase());
    const repairData = await this.#get<CarMdRepairRow | CarMdRepairRow[]>("repairs", repairsQ);
    const repairRows = Array.isArray(repairData) ? repairData : repairData ? [repairData] : [];

    return {
      code,
      title: str(codeRow?.title) ?? str(codeRow?.desc) ?? null,
      definition: str(codeRow?.definition) ?? str(codeRow?.desc) ?? null,
      repairs: repairRows.map(mapRepairRow),
      mode: "live",
    };
  }

  async getMaintenance(vehicle: CarMdVehicleInput): Promise<CarMdMaintenanceItem[]> {
    const q = vehicleQuery(vehicle);
    if (!q.has("vin") && !q.has("make")) {
      throw new Error("Maintenance lookup requires a VIN or year/make/model.");
    }
    if (!q.has("mileage")) {
      throw new Error("Maintenance lookup requires mileage.");
    }
    const data = await this.#get<CarMdMaintRow | CarMdMaintRow[]>("maint", q);
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    return rows.map(mapMaintRow);
  }
}

class MockCarMdProvider implements CarMdProvider {
  readonly mode = "mock" as const;

  async verifyConnection(): Promise<void> {
    throw new Error("CarMD mock mode — set CARMD_AUTHORIZATION and CARMD_PARTNER_TOKEN in .env.");
  }

  async lookupDtc(input: { code: string; vehicle: CarMdVehicleInput }): Promise<CarMdDtcLookupResult> {
    const code = normalizeDtc(input.code);
    const sample: Record<string, { title: string; definition: string; repair: CarMdRepairHint }> = {
      P0420: {
        title: "Catalyst System Efficiency Below Threshold",
        definition:
          "The catalytic converter is not cleaning exhaust gases efficiently. Common causes include a failing converter, exhaust leaks, or faulty oxygen sensors.",
        repair: {
          description: "Replace catalytic converter(s) with new OE catalytic converter(s)",
          urgency: 2,
          urgencyDescription:
            "Repair immediately if drivability issues are present. Threat to essential system components if not repaired as soon as possible.",
          difficulty: 3,
          laborHours: 2.3,
          laborCostCents: 24467,
          partsCostCents: 196701,
          totalCostCents: 223668,
          parts: [
            { description: "Catalytic converter (bank 1)", priceCents: 68367, qty: "1" },
            { description: "Catalytic converter (bank 2)", priceCents: 128334, qty: "1" },
          ],
        },
      },
      P0300: {
        title: "Random/Multiple Cylinder Misfire Detected",
        definition:
          "Engine misfires detected across multiple cylinders. Check spark plugs, ignition coils, vacuum leaks, and fuel delivery.",
        repair: {
          description: "Diagnose and repair engine misfire — inspect ignition and fuel system",
          urgency: 2,
          urgencyDescription: "Repair soon — continued misfire can damage the catalytic converter.",
          difficulty: 2,
          laborHours: 1.5,
          laborCostCents: 15957,
          partsCostCents: 8900,
          totalCostCents: 24857,
          parts: [{ description: "Spark plug set", priceCents: 4500, qty: "1" }],
        },
      },
    };

    const hit = sample[code];
    return {
      code,
      title: hit?.title ?? `${code} (mock)`,
      definition:
        hit?.definition ??
        "Mock CarMD response — configure CARMD_AUTHORIZATION + CARMD_PARTNER_TOKEN for live DTC definitions and repair estimates.",
      repairs: hit ? [hit.repair] : [],
      mode: "mock",
    };
  }

  async getMaintenance(vehicle: CarMdVehicleInput): Promise<CarMdMaintenanceItem[]> {
    const mileage = vehicle.mileage ?? 50000;
    return [
      {
        description: "Inspect for fluid leaks",
        dueMileage: mileage + 2500,
        isOem: true,
        totalCostCents: 615,
      },
      {
        description: "Replace engine oil and filter",
        dueMileage: mileage + 5000,
        isOem: true,
        totalCostCents: 8999,
      },
    ];
  }
}

let cachedLive: LiveCarMdProvider | null = null;
let cachedMock: MockCarMdProvider | null = null;

function liveFromCredentials(creds: CarMdCredentials & { ready: true }): LiveCarMdProvider {
  return new LiveCarMdProvider({
    authorization: creds.authorization!,
    partnerToken: creds.partnerToken!,
    baseUrl: creds.baseUrl,
  });
}

/** Platform env credentials (vendor setup / smoke tests). */
export function getCarMd(): CarMdProvider {
  const creds = mergeCarMdCredentials({});
  if (creds.ready) {
    if (!cachedLive) cachedLive = liveFromCredentials(creds as CarMdCredentials & { ready: true });
    return cachedLive;
  }
  if (!cachedMock) cachedMock = new MockCarMdProvider();
  return cachedMock;
}

/** Shop-aware provider — shop config overrides platform env when both token fields are set. */
export async function getCarMdForShop(shopId: string): Promise<CarMdProvider> {
  const { prisma } = await import("@/db/client");
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: "carmd" } },
    select: { config: true },
  });
  const config =
    row?.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  const creds = mergeCarMdCredentials(config);
  if (creds.ready) return liveFromCredentials(creds as CarMdCredentials & { ready: true });
  return getCarMd();
}

export async function testCarMdConnection(
  shopId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { prisma } = await import("@/db/client");
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: "carmd" } },
    select: { config: true },
  });
  const config =
    row?.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  const creds = mergeCarMdCredentials(config);

  if (!creds.ready) {
    return {
      ok: false,
      error:
        "Not configured — set CARMD_AUTHORIZATION and CARMD_PARTNER_TOKEN in .env. api.carmd.com portal is unreachable (2026-07-22); contact carmd.com/pages/contact for B2B API access.",
    };
  }

  try {
    const provider = liveFromCredentials(creds as CarMdCredentials & { ready: true });
    await provider.verifyConnection();
    return {
      ok: true,
      message: `CarMD API verified (${provider.mode}). DTC lookup and maintenance are ready on demand.`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "CarMD connection failed." };
  }
}
