import "server-only";

import { prisma } from "@/db/client";

/**
 * PartsTech parts-ordering integration, behind a provider interface so the rest
 * of the app only sees our own models (project convention).
 *
 * Credential model:
 *  - Platform env: PARTSTECH_PARTNER_ID (ShopRally SMS partner ID)
 *  - Per shop (ShopIntegration): username + apiKey (+ optional partnerId override)
 *
 * Live when partner + user + key resolve from shop config and/or env; else mock.
 */

export type PartSearchInput = {
  query: string;
  vehicle?: { year: number | null; make: string | null; model: string | null };
};

export type PartResult = {
  partstechId: string;
  brand: string;
  partNumber: string;
  description: string;
  costCents: number;
  retailCents: number;
  availability?: string;
  supplier?: string;
};

export type PunchoutInput = {
  vehicle?: { year: number | null; make: string | null; model: string | null; vin?: string | null };
  returnUrl: string;
};

export type PunchoutSession = { redirectUrl: string; sessionId: string };

export type PartsTechCredentials = {
  partner?: string;
  user?: string;
  key?: string;
};

export interface PartsTechProvider {
  readonly mode: "live" | "mock";
  searchParts(input: PartSearchInput): Promise<PartResult[]>;
  createPunchoutSession?(input: PunchoutInput): Promise<PunchoutSession>;
  getQuote?(sessionId: string): Promise<PartResult[]>;
  verifyAuth?(): Promise<void>;
}

const SANDBOX_BASE = "https://api.beta.partstech.com";
const PROD_BASE = "https://api.partstech.com";

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function partstechBaseUrl(): string {
  return process.env.PARTSTECH_ENV === "production" ? PROD_BASE : SANDBOX_BASE;
}

/** Merge shop integration config with platform env fallbacks. */
export function mergePartstechCredentials(shopConfig: Record<string, unknown> = {}): PartsTechCredentials {
  return {
    partner: str(shopConfig.partnerId) ?? process.env.PARTSTECH_PARTNER_ID?.trim(),
    user:
      str(shopConfig.username) ??
      process.env.PARTSTECH_USER?.trim() ??
      process.env.PARTSTECH_USERNAME?.trim(),
    key: str(shopConfig.apiKey) ?? process.env.PARTSTECH_API_KEY?.trim(),
  };
}

export function isPartstechLiveReady(creds: PartsTechCredentials): creds is {
  partner: string;
  user: string;
  key: string;
} {
  return Boolean(creds.partner && creds.user && creds.key);
}

function missingPartstechFields(creds: PartsTechCredentials): string[] {
  const missing: string[] = [];
  if (!creds.partner) missing.push("Partner ID");
  if (!creds.user) missing.push("username");
  if (!creds.key) missing.push("API key");
  return missing;
}

class LivePartsTechProvider implements PartsTechProvider {
  readonly mode = "live" as const;
  #token: { value: string; expiresAt: number } | null = null;

  constructor(
    private cfg: { baseUrl: string; user: string; key: string; partner: string },
  ) {}

  async verifyAuth(): Promise<void> {
    await this.#accessToken();
  }

  async #accessToken(): Promise<string> {
    if (this.#token && this.#token.expiresAt > Date.now() + 30_000) return this.#token.value;
    const res = await fetch(`${this.cfg.baseUrl}/oauth/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        accessType: "user",
        credentials: { user: this.cfg.user, key: this.cfg.key, partner: this.cfg.partner },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PartsTech auth failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { accessToken?: string; expiresIn?: number };
    if (!json.accessToken) throw new Error("PartsTech auth returned no accessToken.");
    this.#token = {
      value: json.accessToken,
      expiresAt: Date.now() + (json.expiresIn ?? 3600) * 1000,
    };
    return json.accessToken;
  }

  async searchParts(input: PartSearchInput): Promise<PartResult[]> {
    const token = await this.#accessToken();
    const res = await fetch(`${this.cfg.baseUrl}/punchout/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        searchParams: { keyword: input.query },
        vehicle: input.vehicle
          ? { year: input.vehicle.year, make: input.vehicle.make, model: input.vehicle.model }
          : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PartsTech search failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { parts?: RawPart[] };
    return (json.parts ?? []).map(mapRawPart);
  }

  async createPunchoutSession({ vehicle, returnUrl }: PunchoutInput): Promise<PunchoutSession> {
    const token = await this.#accessToken();
    const path = process.env.PARTSTECH_PUNCHOUT_PATH || "/punchout";
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: token },
      body: JSON.stringify({
        vehicle: vehicle
          ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, vin: vehicle.vin ?? undefined }
          : undefined,
        urls: { returnUrl, callbackUrl: returnUrl },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PartsTech punchout failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { redirectUrl?: string; url?: string; sessionId?: string; id?: string };
    const redirectUrl = json.redirectUrl ?? json.url;
    const sessionId = json.sessionId ?? json.id;
    if (!redirectUrl || !sessionId) throw new Error("PartsTech punchout returned no redirect URL.");
    return { redirectUrl, sessionId };
  }

  async getQuote(sessionId: string): Promise<PartResult[]> {
    const token = await this.#accessToken();
    const path = (process.env.PARTSTECH_QUOTE_PATH || "/punchout/quote/{id}").replace(
      "{id}",
      encodeURIComponent(sessionId),
    );
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      headers: { Accept: "application/json", Authorization: token },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PartsTech quote fetch failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { parts?: RawPart[] };
    return (json.parts ?? []).map(mapRawPart);
  }
}

type RawPart = {
  id?: string;
  partNumber?: string;
  brand?: string;
  title?: string;
  description?: string;
  cost?: number;
  listPrice?: number;
  availability?: string;
  supplier?: string;
};

function mapRawPart(p: RawPart): PartResult {
  const cost = Math.round((p.cost ?? 0) * 100);
  const retail = Math.round((p.listPrice ?? p.cost ?? 0) * 100);
  return {
    partstechId: p.id ?? p.partNumber ?? crypto.randomUUID(),
    brand: p.brand ?? "",
    partNumber: p.partNumber ?? "",
    description: p.title ?? p.description ?? "Part",
    costCents: cost,
    retailCents: retail || cost,
    availability: p.availability,
    supplier: p.supplier,
  };
}

class MockPartsTechProvider implements PartsTechProvider {
  readonly mode = "mock" as const;

  async searchParts(input: PartSearchInput): Promise<PartResult[]> {
    const q = input.query.trim() || "part";
    const seed = q.toLowerCase();
    const brands = ["Bosch", "Denso", "ACDelco", "Moog", "Bilstein"];
    const suppliers = ["WorldPac", "NAPA", "AutoZone Pro", "O'Reilly First Call"];
    return Array.from({ length: 5 }, (_, i) => {
      const cost = 1500 + ((seed.length * 7 + i * 53) % 9000);
      const retail = Math.round(cost * (1.6 + (i % 3) * 0.3));
      return {
        partstechId: `mock-${seed.replace(/\s+/g, "-")}-${i}`,
        brand: brands[i % brands.length],
        partNumber: `${seed.slice(0, 3).toUpperCase()}-${1000 + i * 7}`,
        description: `${q} — ${["OE", "Premium", "Economy", "HD", "Performance"][i % 5]}`,
        costCents: cost,
        retailCents: retail,
        availability: i === 0 ? "In stock" : `${(i + 1) * 3} in stock`,
        supplier: suppliers[i % suppliers.length],
      };
    });
  }
}

function liveProviderFromCredentials(creds: { partner: string; user: string; key: string }): PartsTechProvider {
  return new LivePartsTechProvider({
    baseUrl: partstechBaseUrl(),
    user: creds.user,
    key: creds.key,
    partner: creds.partner,
  });
}

function shopConfigFromRow(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  return config as Record<string, unknown>;
}

/** Resolve PartsTech for a shop — prefers ShopIntegration config, falls back to platform env. */
export async function getPartsTechForShop(shopId: string): Promise<PartsTechProvider> {
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: "partstech" } },
    select: { config: true },
  });
  const creds = mergePartstechCredentials(shopConfigFromRow(row?.config));
  if (isPartstechLiveReady(creds)) return liveProviderFromCredentials(creds);
  return new MockPartsTechProvider();
}

/** Live OAuth check for the vendor setup page. */
export async function testPartsTechConnection(
  shopId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: "partstech" } },
    select: { config: true },
  });
  const creds = mergePartstechCredentials(shopConfigFromRow(row?.config));

  if (!isPartstechLiveReady(creds)) {
    const missing = missingPartstechFields(creds);
    const hint =
      missing.includes("Partner ID")
        ? " Partner ID comes from ShopRally platform onboarding (or save one per shop)."
        : "";
    return {
      ok: false,
      error: `Not ready for live PartsTech — missing ${missing.join(", ")}.${hint}`,
    };
  }

  try {
    const provider = liveProviderFromCredentials(creds);
    await provider.verifyAuth!();
    const envLabel = process.env.PARTSTECH_ENV === "production" ? "production" : "sandbox";
    return {
      ok: true,
      message: `PartsTech OAuth succeeded (${envLabel}). Catalog and punchout are ready for this shop.`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PartsTech connection failed." };
  }
}

/**
 * @deprecated Prefer `getPartsTechForShop(shopId)`. Env-only fallback for legacy callers.
 */
export function getPartsTech(): PartsTechProvider {
  const creds = mergePartstechCredentials({});
  if (isPartstechLiveReady(creds)) return liveProviderFromCredentials(creds);
  return new MockPartsTechProvider();
}
