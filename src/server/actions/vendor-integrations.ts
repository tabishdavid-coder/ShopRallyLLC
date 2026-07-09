"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { type VendorKey, vendorByKey } from "@/lib/integrations";
import { getShopId } from "@/lib/shop";
import { getShopIntegrationRow, mergeConfig } from "@/server/integrations";
import { gates } from "@/server/permission-gates";

export type VendorActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const emptyToUndefined = z
  .string()
  .trim()
  .transform((s) => (s.length ? s : undefined))
  .optional();

function cfgStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const PartstechInput = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: emptyToUndefined,
  partnerId: emptyToUndefined,
  apiKey: emptyToUndefined,
});

const WeldonInput = z.object({
  accountNumber: z.string().trim().min(1, "Account number is required."),
  territory: emptyToUndefined,
  mode: z.enum(["manual", "api"]),
});

const CarfaxInput = z.object({
  productDataId: z.string().trim().min(1, "Product Data ID is required."),
  locationId: z.string().trim().min(1, "Location ID is required."),
  partnerId: emptyToUndefined,
  apiKey: emptyToUndefined,
});

const VinDecoderInput = z.object({
  provider: z.enum(["nhtsa", "autodev", "dataone"]),
  autodevApiKey: emptyToUndefined,
  dataOneApiKey: emptyToUndefined,
});

function revalidateVendor(vendorKey: VendorKey) {
  revalidatePath("/vendors/integrations");
  revalidatePath(`/vendors/integrations/${vendorKey}`);
  if (vendorKey === "partstech") revalidatePath("/repair-orders", "layout");
  if (vendorKey === "weldon") revalidatePath("/tires");
}

export async function saveVendorIntegration(
  vendorKey: Exclude<VendorKey, "stripe">,
  raw: unknown,
): Promise<VendorActionResult> {
  vendorByKey(vendorKey);
  const shopId = await getShopId();
  const denied = await gates.vendorsManage(shopId);
  if (denied) return denied;
  const existing = await getShopIntegrationRow(vendorKey);
  const prev = (existing?.config && typeof existing.config === "object" && !Array.isArray(existing.config)
    ? existing.config
    : {}) as Record<string, unknown>;

  let config: Record<string, unknown>;
  let ready = false;

  switch (vendorKey) {
    case "partstech": {
      const parsed = PartstechInput.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      config = mergeConfig(prev, parsed.data, ["password", "apiKey"]);
      const partnerReady = Boolean(
        parsed.data.partnerId || cfgStr(prev.partnerId) || process.env.PARTSTECH_PARTNER_ID?.trim(),
      );
      ready = Boolean(
        parsed.data.username && (parsed.data.apiKey || cfgStr(prev.apiKey)) && partnerReady,
      );
      break;
    }
    case "weldon": {
      const parsed = WeldonInput.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      config = { ...parsed.data };
      ready = Boolean(parsed.data.accountNumber);
      break;
    }
    case "carfax": {
      const parsed = CarfaxInput.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      config = mergeConfig(prev, parsed.data, ["apiKey"]);
      ready = Boolean(parsed.data.productDataId && parsed.data.locationId);
      break;
    }
    case "vin-decoder": {
      const parsed = VinDecoderInput.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
      config = mergeConfig(prev, parsed.data, ["autodevApiKey", "dataOneApiKey"]);
      ready = true;
      break;
    }
    default:
      return { ok: false, error: "Unknown vendor." };
  }

  await prisma.shopIntegration.upsert({
    where: { shopId_vendorKey: { shopId, vendorKey } },
    create: {
      shopId,
      vendorKey,
      config: config as Prisma.InputJsonValue,
      enabled: true,
      connectedAt: ready ? new Date() : null,
    },
    update: {
      config: config as Prisma.InputJsonValue,
      enabled: true,
      connectedAt: ready ? (existing?.connectedAt ?? new Date()) : null,
    },
  });

  revalidateVendor(vendorKey);
  return {
    ok: true,
    message: ready
      ? "Credentials saved. Live API verification pending partnership where required."
      : "Settings saved.",
  };
}

/** Honest connection test — no fake live API calls. */
export async function testVendorConnection(
  vendorKey: Exclude<VendorKey, "stripe">,
): Promise<VendorActionResult> {
  const shopId = await getShopId();
  const denied = await gates.vendorsManage(shopId);
  if (denied) return denied;
  const { getIntegrationStatus } = await import("@/server/integrations");
  const status = await getIntegrationStatus(vendorKey);

  switch (vendorKey) {
    case "partstech": {
      const { testPartsTechConnection } = await import("@/server/services/partstech");
      const result = await testPartsTechConnection(shopId);
      if (result.ok) return { ok: true, message: result.message };
      return { ok: false, error: result.error };
    }

    case "weldon":
      if (status.envConfigured) {
        return {
          ok: true,
          message: "WELDON_API_KEY is set — live order API not attempted until aggregator endpoint is confirmed.",
        };
      }
      if (status.shopConfigured) {
        return {
          ok: true,
          message:
            status.safeConfig.mode === "api"
              ? "Account saved in API mode — live test pending Tireweb/Tirewire partnership."
              : "Manual mode — orders are logged for placement in the Weldon portal after manager approval.",
        };
      }
      return { ok: false, error: "Not configured. Add your Weldon commercial account number." };

    case "carfax":
      if (status.envConfigured || status.shopConfigured) {
        return {
          ok: true,
          message: "Credentials present — live Carfax pull not attempted (finalize endpoint with Carfax onboarding).",
        };
      }
      return { ok: false, error: "Not configured. Requires Product Data ID and Location ID from Carfax." };

    case "vin-decoder":
      return {
        ok: true,
        message:
          status.envConfigured || status.shopConfigured
            ? "NHTSA vPIC is always available. Paid provider key saved — upgrade wiring is a future provider swap."
            : "NHTSA vPIC decode is active (no key). Add Auto.dev for plate lookup.",
      };

    default:
      return { ok: false, error: "Unknown vendor." };
  }
}
