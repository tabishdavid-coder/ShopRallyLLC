import "server-only";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getStripeConfigStatus } from "@/lib/stripe";
import { StripeConnectStatus } from "@/generated/prisma";
import { carfaxEnabled } from "@/server/services/service-history";
import { isPartstechLiveReady, mergePartstechCredentials } from "@/server/services/partstech";
import { getWeldonTire } from "@/server/services/weldon";
import {
  type IntegrationConnectionState,
  type VendorIntegrationStatus,
  type VendorKey,
} from "@/lib/integrations";
import {
  GOOGLE_REVIEWS_VENDOR_KEY,
  isGoogleReviewsConnected,
  parseGoogleReviewsConfig,
} from "@/server/services/google-reviews";

export type { VendorIntegrationStatus };

const has = (k: string) => Boolean(process.env[k]?.trim());

type ShopIntegrationRow = { config: unknown; connectedAt: Date | null; enabled: boolean };

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function cfg(row: ShopIntegrationRow | null | undefined): Record<string, unknown> {
  if (!row?.config || typeof row.config !== "object" || Array.isArray(row.config)) return {};
  return row.config as Record<string, unknown>;
}

function redactConfig(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase().includes("password") || k.toLowerCase().includes("secret")) {
      out[`has${k.charAt(0).toUpperCase()}${k.slice(1)}`] = Boolean(str(v));
    } else if (k.toLowerCase().includes("apikey") || k === "apiKey" || k === "key") {
      out.hasApiKey = Boolean(str(v));
    } else {
      out[k] = v;
    }
  }
  return out;
}

function partstechEnvReady() {
  const partner = has("PARTSTECH_PARTNER_ID");
  const user = has("PARTSTECH_USER") || has("PARTSTECH_USERNAME");
  const key = has("PARTSTECH_API_KEY");
  return partner && user && key;
}

function partstechShopReady(c: Record<string, unknown>) {
  return Boolean(str(c.username) && str(c.apiKey));
}

function weldonEnvReady() {
  return has("WELDON_API_KEY");
}

function weldonShopReady(c: Record<string, unknown>) {
  const mode = str(c.mode) ?? "manual";
  if (mode === "api") return Boolean(str(c.accountNumber));
  return Boolean(str(c.accountNumber));
}

function carfaxEnvReady() {
  return carfaxEnabled;
}

function carfaxShopReady(c: Record<string, unknown>) {
  return Boolean(str(c.productDataId) && str(c.locationId));
}

function vinShopReady(c: Record<string, unknown>) {
  return Boolean(str(c.autodevApiKey) || str(c.dataOneApiKey));
}

function resolvePartstech(row: ShopIntegrationRow | null): VendorIntegrationStatus {
  const c = cfg(row);
  const creds = mergePartstechCredentials(c);
  const liveReady = isPartstechLiveReady(creds);
  const envOk = partstechEnvReady();
  const shopOk = partstechShopReady(c);
  const anyEnv = has("PARTSTECH_PARTNER_ID") || has("PARTSTECH_API_KEY") || has("PARTSTECH_USER");
  const anyShop = Boolean(str(c.username) || str(c.partnerId) || str(c.apiKey));

  let state: IntegrationConnectionState = "inactive";
  if (liveReady) state = "connected";
  else if (shopOk || envOk) state = "configured";
  else if (anyEnv || anyShop) state = "mock";

  const detail =
    state === "connected"
      ? "Live PartsTech catalog and punchout. Use Parts Hub on the estimate tab."
      : state === "configured"
        ? "Shop credentials saved — add Partner ID (platform env or below) and run Test connection."
        : state === "mock"
          ? "Partial credentials or mock catalog — Parts Hub works with sample data."
          : "Connect PartsTech to search catalogs and import parts onto estimates.";

  return {
    key: "partstech",
    state,
    detail,
    envConfigured: envOk,
    shopConfigured: shopOk,
    safeConfig: {
      username: str(c.username) ?? "",
      partnerId: str(c.partnerId) ?? "",
      hasApiKey: Boolean(str(c.apiKey)),
      hasPassword: Boolean(str(c.password)),
    },
  };
}

function resolveWeldon(row: ShopIntegrationRow | null): VendorIntegrationStatus {
  const c = cfg(row);
  const envOk = weldonEnvReady();
  const shopOk = weldonShopReady(c);
  const mode = str(c.mode) ?? "manual";

  let state: IntegrationConnectionState = "inactive";
  if (envOk && getWeldonTire().mode === "live") state = "connected";
  else if (shopOk && mode === "api") state = "configured";
  else if (shopOk) state = "mock";
  else if (envOk) state = "configured";

  const detail =
    state === "connected"
      ? "API ordering enabled — approve tire orders on /tires to submit to Weldon."
      : state === "configured"
        ? "Shop account saved — live API test pending aggregator partnership."
        : state === "mock"
          ? `Manual mode: place orders in the Weldon portal after approval on /tires.`
          : "Add your Weldon commercial account to streamline tire supplier approval.";

  return {
    key: "weldon",
    state,
    detail,
    envConfigured: envOk,
    shopConfigured: shopOk,
    safeConfig: {
      accountNumber: str(c.accountNumber) ?? "",
      territory: str(c.territory) ?? "",
      mode: mode === "api" ? "api" : "manual",
    },
  };
}

function resolveCarfax(row: ShopIntegrationRow | null): VendorIntegrationStatus {
  const c = cfg(row);
  const envOk = carfaxEnvReady();
  const shopOk = carfaxShopReady(c);
  const any = envOk || shopOk || str(c.productDataId) || str(c.locationId);

  let state: IntegrationConnectionState = "inactive";
  if (envOk || shopOk) state = "connected";
  else if (any) state = "mock";

  const detail =
    state === "connected"
      ? "Live Carfax Service History on repair orders with a VIN."
      : state === "mock"
        ? "Sample service history until Carfax agreement provides Product Data + Location IDs."
        : "Requires Carfax for Business partnership — connect to pull prior service records.";

  return {
    key: "carfax",
    state,
    detail,
    envConfigured: envOk,
    shopConfigured: shopOk,
    safeConfig: {
      productDataId: str(c.productDataId) ?? "",
      locationId: str(c.locationId) ?? "",
      partnerId: str(c.partnerId) ?? "",
      hasApiKey: Boolean(str(c.apiKey)),
    },
  };
}

function resolveVinDecoder(row: ShopIntegrationRow | null): VendorIntegrationStatus {
  const c = cfg(row);
  const autodevEnv = has("AUTODEV_API_KEY");
  const shopPaid = vinShopReady(c);

  let state: IntegrationConnectionState = "connected";
  const detail = autodevEnv || shopPaid
    ? "NHTSA vPIC active. Auto.dev / paid provider configured for richer decode + plate lookup."
    : "NHTSA vPIC active. Add Auto.dev or DataOne/VinAudit for plate lookup and richer trim data.";

  return {
    key: "vin-decoder",
    state,
    detail,
    envConfigured: autodevEnv,
    shopConfigured: shopPaid,
    safeConfig: {
      provider: str(c.provider) ?? "nhtsa",
      hasAutodevApiKey: Boolean(str(c.autodevApiKey)),
      hasDataOneApiKey: Boolean(str(c.dataOneApiKey)),
    },
  };
}

function resolveGoogleReviews(row: ShopIntegrationRow | null): VendorIntegrationStatus {
  const c = parseGoogleReviewsConfig(row?.config);
  const envOk = has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET");
  const shopOk = isGoogleReviewsConnected(c);

  let state: IntegrationConnectionState = "inactive";
  if (shopOk && envOk) state = "connected";
  else if (shopOk || (c.refreshToken && envOk)) state = "configured";
  else if (envOk || c.refreshToken || c.googleLocationId) state = "mock";
  else state = "mock"; // demo reviews available without connection

  const detail =
    state === "connected"
      ? `Live reviews from ${c.googleLocationName ?? "your Google Business Profile"}. Reply from Marketing → Reviews.`
      : state === "configured"
        ? "Google account linked — add your shop location and sync reviews."
        : c.refreshToken
          ? "Google account linked — finish location setup and sync reviews."
          : "Sign in with Google to import reviews and publish replies from ShopRally.";

  return {
    key: "google-reviews",
    state,
    detail,
    envConfigured: envOk,
    shopConfigured: shopOk,
    safeConfig: {
      googleBusinessAccountId: str(c.googleBusinessAccountId) ?? "",
      googleLocationId: str(c.googleLocationId) ?? "",
      googleLocationName: str(c.googleLocationName) ?? "",
      googlePlaceId: str(c.googlePlaceId) ?? "",
      hasRefreshToken: Boolean(c.refreshToken),
    },
  };
}

function resolveStripe(shopConnect?: {
  stripeConnectAccountId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeChargesEnabled: boolean;
} | null): VendorIntegrationStatus {
  const stripe = getStripeConfigStatus();
  const shopActive = Boolean(
    shopConnect &&
      shopConnect.stripeConnectStatus === StripeConnectStatus.ACTIVE &&
      shopConnect.stripeChargesEnabled &&
      shopConnect.stripeConnectAccountId,
  );

  let state: IntegrationConnectionState = "inactive";
  if (shopActive && stripe.webhookConfigured) state = "connected";
  else if (shopActive || (stripe.enabled && stripe.webhookConfigured)) state = "connected";
  else if (shopConnect?.stripeConnectAccountId || stripe.enabled) state = "configured";
  else state = "inactive";

  const detail =
    shopActive
      ? "Shop Stripe Connect active — invoice pay settles to your shop account."
      : shopConnect?.stripeConnectAccountId
        ? "Onboarding in progress — complete setup in Payments → Account."
        : stripe.enabled
          ? "Connect your shop in Payments → Account to accept online invoice payments."
          : "Platform Stripe not configured — contact ShopRally support.";

  return {
    key: "stripe",
    state,
    detail,
    envConfigured: stripe.enabled,
    shopConfigured: Boolean(shopConnect?.stripeConnectAccountId),
    safeConfig: shopConnect?.stripeConnectAccountId
      ? {
          accountId: shopConnect.stripeConnectAccountId,
          status: shopConnect.stripeConnectStatus,
        }
      : {},
  };
}

const RESOLVERS: Record<
  Exclude<VendorKey, "stripe">,
  (row: ShopIntegrationRow | null) => VendorIntegrationStatus
> = {
  partstech: resolvePartstech,
  weldon: resolveWeldon,
  carfax: resolveCarfax,
  "vin-decoder": resolveVinDecoder,
  "google-reviews": resolveGoogleReviews,
};

/** Load integration row for the current shop (server-only). */
export async function getShopIntegrationRow(vendorKey: Exclude<VendorKey, "stripe">) {
  const shopId = await getShopId();
  return prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey } },
    select: { config: true, connectedAt: true, enabled: true },
  });
}

/** Resolve status for one vendor (current shop + env fallback). */
export async function getIntegrationStatus(vendorKey: VendorKey): Promise<VendorIntegrationStatus> {
  const shopId = await getShopId();
  return getIntegrationStatusForShop(shopId, vendorKey);
}

/** Same as getIntegrationStatus but avoids an extra getShopId when shopId is already known. */
export async function getIntegrationStatusForShop(
  shopId: string,
  vendorKey: VendorKey,
): Promise<VendorIntegrationStatus> {
  if (vendorKey === "stripe") {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeChargesEnabled: true,
      },
    });
    return resolveStripe(shop);
  }
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey } },
    select: { config: true, connectedAt: true, enabled: true },
  });
  return RESOLVERS[vendorKey](row);
}

/** All vendor statuses for the integrations hub. */
export async function getAllIntegrationStatuses(): Promise<VendorIntegrationStatus[]> {
  const shopId = await getShopId();
  const [rows, shop] = await Promise.all([
    prisma.shopIntegration.findMany({
      where: {
        shopId,
        vendorKey: { in: ["partstech", "weldon", "carfax", "vin-decoder", GOOGLE_REVIEWS_VENDOR_KEY] },
      },
      select: { vendorKey: true, config: true, connectedAt: true, enabled: true },
    }),
    prisma.shop.findFirst({
      where: { id: shopId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeChargesEnabled: true,
      },
    }),
  ]);
  const byKey = new Map(rows.map((r) => [r.vendorKey, r]));

  return [
    RESOLVERS.partstech(byKey.get("partstech") ?? null),
    RESOLVERS.weldon(byKey.get("weldon") ?? null),
    RESOLVERS.carfax(byKey.get("carfax") ?? null),
    RESOLVERS["vin-decoder"](byKey.get("vin-decoder") ?? null),
    RESOLVERS["google-reviews"](byKey.get(GOOGLE_REVIEWS_VENDOR_KEY) ?? null),
    resolveStripe(shop),
  ];
}

export function mergeConfig(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  secretFields: string[],
): Record<string, unknown> {
  const next = { ...existing, ...patch };
  for (const field of secretFields) {
    const val = patch[field];
    if (val === "" || val === undefined || val === null) {
      if (existing[field]) next[field] = existing[field];
      else delete next[field];
    }
  }
  return next;
}

export { redactConfig };
