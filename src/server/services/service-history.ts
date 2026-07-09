import "server-only";

/**
 * Vehicle service-history (prior repair records) behind a swappable provider.
 *
 * PRIMARY: Carfax Service History Check — requires a Carfax Service Data Transfer
 * Facilitation Agreement (not self-serve). Once approved, Carfax issues a
 * Product Data ID + Location ID; set CARFAX_PRODUCT_DATA_ID + CARFAX_LOCATION_ID
 * to flip the live provider on. FALLBACK: a mock provider returning sample
 * records so the UI is exercised before credentials land.
 *
 * Wire-ahead: the live request/response shape below follows the public Carfax
 * service-socket pattern and is intentionally defensive — finalize the exact
 * endpoint + field names from your Carfax onboarding docs.
 */

export type ServiceHistoryRecord = {
  date: string | null; // provider display date (formats vary)
  odometer: number | null;
  services: string[]; // line-item descriptions
  source: string | null; // facility / dealer / "Service Facility"
  type: string | null; // "service" | "recall" | ...
};

export type VehicleHistory = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  records: ServiceHistoryRecord[];
};

export interface ServiceHistoryProvider {
  readonly mode: "live" | "mock";
  lookup(vin: string): Promise<VehicleHistory | null>;
}

/* ───────────────────────── Carfax (live) ───────────────────────── */

const CARFAX_URL = process.env.CARFAX_SERVICE_HISTORY_URL?.trim() || "https://servicesocket.carfax.com/data/1";

type CarfaxRecord = {
  displayDate?: string;
  date?: string;
  odometer?: number | string;
  type?: string;
  text?: string[];
  services?: string[];
  serviceDetails?: string;
  facility?: string;
};

type CarfaxResponse = {
  serviceHistory?: { displayRecords?: CarfaxRecord[]; records?: CarfaxRecord[] };
  vehicle?: { year?: number; make?: string; model?: string };
};

class CarfaxServiceHistoryProvider implements ServiceHistoryProvider {
  readonly mode = "live" as const;
  constructor(private cfg: { productDataId: string; locationId: string }) {}

  async lookup(vin: string): Promise<VehicleHistory | null> {
    const res = await fetch(CARFAX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ productDataId: this.cfg.productDataId, locationId: this.cfg.locationId, vin: vin.trim().toUpperCase() }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as CarfaxResponse;
    const raw = json.serviceHistory?.displayRecords ?? json.serviceHistory?.records ?? [];
    const records: ServiceHistoryRecord[] = raw.map((r) => ({
      date: r.displayDate ?? r.date ?? null,
      odometer: r.odometer != null ? Number(r.odometer) || null : null,
      services: r.text ?? r.services ?? (r.serviceDetails ? [r.serviceDetails] : []),
      source: r.facility ?? null,
      type: r.type ?? null,
    }));
    return {
      vin: vin.trim().toUpperCase(),
      year: json.vehicle?.year ?? null,
      make: json.vehicle?.make ?? null,
      model: json.vehicle?.model ?? null,
      records,
    };
  }
}

/* ───────────────────────── Mock (fallback) ───────────────────────── */

class MockServiceHistoryProvider implements ServiceHistoryProvider {
  readonly mode = "mock" as const;
  async lookup(vin: string): Promise<VehicleHistory | null> {
    // Deterministic sample so the panel renders before Carfax is live.
    return {
      vin: vin.trim().toUpperCase(),
      year: null,
      make: null,
      model: null,
      records: [
        { date: "03/14/2024", odometer: 42150, services: ["Synthetic oil & filter change", "Tire rotation", "Multi-point inspection"], source: "Service Facility", type: "service" },
        { date: "09/02/2023", odometer: 36820, services: ["Replaced front brake pads & rotors", "Brake fluid flush"], source: "Dealer", type: "service" },
        { date: "02/20/2023", odometer: 29540, services: ["Oil change", "Cabin air filter replaced"], source: "Service Facility", type: "service" },
        { date: "08/10/2022", odometer: 21000, services: ["Factory scheduled maintenance — 20k service"], source: "Dealer", type: "service" },
      ],
    };
  }
}

let cached: ServiceHistoryProvider | null = null;

/** Live Carfax when credentials are set, otherwise mock. */
export function getServiceHistory(): ServiceHistoryProvider {
  if (cached) return cached;
  const productDataId = process.env.CARFAX_PRODUCT_DATA_ID?.trim();
  const locationId = process.env.CARFAX_LOCATION_ID?.trim();
  cached =
    productDataId && locationId
      ? new CarfaxServiceHistoryProvider({ productDataId, locationId })
      : new MockServiceHistoryProvider();
  return cached;
}

/** Whether the live Carfax provider is configured. */
export const carfaxEnabled = Boolean(
  process.env.CARFAX_PRODUCT_DATA_ID?.trim() && process.env.CARFAX_LOCATION_ID?.trim(),
);
