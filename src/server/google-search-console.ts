import "server-only";

import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import {
  GOOGLE_GSC_VENDOR_KEY,
  isGoogleGscConnected,
  isGoogleGscConfigured,
  parseGoogleGscConfig,
  type GoogleGscConnectionConfig,
} from "@/server/services/google-search-console";

export type GoogleGscIntegrationView = {
  configured: boolean;
  connected: boolean;
  sites: string[];
  config: GoogleGscConnectionConfig;
};

export async function getGoogleGscIntegration(shopId: string): Promise<GoogleGscIntegrationView> {
  const row = await prisma.shopIntegration.findUnique({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_GSC_VENDOR_KEY } },
  });
  const config = parseGoogleGscConfig(row?.config);
  return {
    configured: isGoogleGscConfigured(),
    connected: isGoogleGscConnected(config),
    sites: config.sites ?? [],
    config,
  };
}

export async function upsertGoogleGscConfig(
  shopId: string,
  config: GoogleGscConnectionConfig,
): Promise<void> {
  const connected = isGoogleGscConnected(config);
  await prisma.shopIntegration.upsert({
    where: { shopId_vendorKey: { shopId, vendorKey: GOOGLE_GSC_VENDOR_KEY } },
    create: {
      shopId,
      vendorKey: GOOGLE_GSC_VENDOR_KEY,
      config: config as Prisma.InputJsonValue,
      enabled: true,
      connectedAt: connected ? new Date() : null,
    },
    update: {
      config: config as Prisma.InputJsonValue,
      connectedAt: connected ? new Date() : null,
    },
  });
}
