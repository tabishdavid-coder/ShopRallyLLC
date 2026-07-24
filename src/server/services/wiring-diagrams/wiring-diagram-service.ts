import "server-only";

import path from "node:path";

import type { WiringSystem } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { oemBrandFromMake } from "@/lib/wiring-systems";
import {
  buildWiringDiagramKey,
  getCloudStorage,
  newWiringDiagramId,
} from "@/server/services/cloud-storage";
import {
  acquireDownloadMutex,
  markDownloadCompleted,
  markDownloadFailed,
  markDownloadRunning,
  releaseStaleRunningJobs,
} from "./download-mutex";
import { hondaTechInfoProvider } from "./providers/honda-techinfo";
import { checkWiringDownloadRateLimit } from "./rate-limit";
import {
  type WiringDiagramProvider,
  WiringProviderError,
  type WiringDownloadRequest,
} from "./types";

export type WiringDiagramSummary = {
  id: string;
  wiringSystem: WiringSystem;
  mimeType: string;
  fileName: string | null;
  sourceBrand: string;
  downloadedAt: string;
  viewUrl: string;
};

export type WiringAvailability = {
  featureEnabled: boolean;
  releaseEnabled: boolean;
  brand: string | null;
  hasActiveSubscription: boolean;
  subscriptionEndsAt: string | null;
  cachedSystems: WiringSystem[];
  activeDownloadJobId: string | null;
  providerMode: "live" | "stub";
};

const PROVIDERS: Record<string, WiringDiagramProvider> = {
  honda: hondaTechInfoProvider,
  acura: hondaTechInfoProvider,
};

function providerForBrand(brand: string): WiringDiagramProvider | null {
  return PROVIDERS[brand.toLowerCase()] ?? null;
}

function isSubscriptionActive(start: Date | null, end: Date | null, now = new Date()): boolean {
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

export async function getWiringAvailability(
  shopId: string,
  vehicleId: string,
  opts: { featureEnabled: boolean; releaseEnabled: boolean },
): Promise<WiringAvailability> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { make: true },
  });
  const brand = oemBrandFromMake(vehicle?.make);

  let hasActiveSubscription = false;
  let subscriptionEndsAt: string | null = null;
  if (brand) {
    const source = await prisma.wiringDiagramSource.findFirst({
      where: { shopId, brand, enabled: true },
      select: { subscriptionStart: true, subscriptionEnd: true },
    });
    if (source && isSubscriptionActive(source.subscriptionStart, source.subscriptionEnd)) {
      hasActiveSubscription = true;
      subscriptionEndsAt = source.subscriptionEnd?.toISOString() ?? null;
    }
  }

  const cached = await prisma.wiringDiagram.findMany({
    where: { shopId, vehicleId },
    select: { wiringSystem: true },
  });

  const activeJob = await prisma.wiringDiagramDownloadJob.findFirst({
    where: {
      shopId,
      vehicleId,
      status: { in: ["PENDING", "RUNNING"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const provider = brand ? providerForBrand(brand) : null;

  return {
    featureEnabled: opts.featureEnabled,
    releaseEnabled: opts.releaseEnabled,
    brand,
    hasActiveSubscription,
    subscriptionEndsAt,
    cachedSystems: cached.map((c) => c.wiringSystem),
    activeDownloadJobId: activeJob?.id ?? null,
    providerMode: provider?.mode ?? "stub",
  };
}

export async function listWiringDiagrams(
  shopId: string,
  vehicleId: string,
): Promise<WiringDiagramSummary[]> {
  const rows = await prisma.wiringDiagram.findMany({
    where: { shopId, vehicleId },
    orderBy: { wiringSystem: "asc" },
    select: {
      id: true,
      wiringSystem: true,
      mimeType: true,
      fileName: true,
      sourceBrand: true,
      downloadedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    wiringSystem: r.wiringSystem,
    mimeType: r.mimeType,
    fileName: r.fileName,
    sourceBrand: r.sourceBrand,
    downloadedAt: r.downloadedAt.toISOString(),
    viewUrl: `/api/wiring-diagrams/${r.id}`,
  }));
}

export async function downloadWiringDiagram(
  shopId: string,
  vehicleId: string,
  wiringSystem: WiringSystem,
  downloadedByUserId?: string | null,
): Promise<
  | { ok: true; diagram: WiringDiagramSummary; jobId: string }
  | { ok: false; error: string; code?: string; jobId?: string }
> {
  await releaseStaleRunningJobs(shopId);

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: {
      vin: true,
      year: true,
      make: true,
      model: true,
      trim: true,
    },
  });
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  const brand = oemBrandFromMake(vehicle.make);
  if (!brand) {
    return { ok: false, error: "Vehicle make is required to resolve OEM wiring portal.", code: "no_brand" };
  }

  const source = await prisma.wiringDiagramSource.findFirst({
    where: { shopId, brand, enabled: true },
    select: {
      brand: true,
      credentialsEnvKey: true,
      subscriptionStart: true,
      subscriptionEnd: true,
    },
  });
  if (!source || !isSubscriptionActive(source.subscriptionStart, source.subscriptionEnd)) {
    return {
      ok: false,
      error: `No active ${brand} wiring diagram subscription for this shop.`,
      code: "no_subscription",
    };
  }

  const provider = providerForBrand(brand);
  if (!provider) {
    return {
      ok: false,
      error: `Wiring diagram provider for ${brand} is not configured yet.`,
      code: "no_provider",
    };
  }

  const rate = checkWiringDownloadRateLimit(shopId, brand);
  if (!rate.allowed) {
    const secs = Math.ceil(rate.retryAfterMs / 1000);
    return {
      ok: false,
      error: `OEM rate limit reached. Try again in ${secs}s.`,
      code: "rate_limit",
    };
  }

  const mutex = await acquireDownloadMutex(shopId, vehicleId, wiringSystem, brand);
  if (!mutex.ok) {
    if (mutex.reason === "in_progress") {
      return {
        ok: false,
        error: "A download is already in progress for this system.",
        code: "in_progress",
        jobId: mutex.jobId,
      };
    }
    return { ok: false, error: mutex.message, code: "mutex_error" };
  }

  const jobId = mutex.jobId;
  await markDownloadRunning(jobId, shopId);

  const request: WiringDownloadRequest = {
    shopId,
    vehicleId,
    wiringSystem,
    brand,
    vehicle,
    credentialsEnvKey: source.credentialsEnvKey,
  };

  try {
    const result = await provider.download(request);
    const diagramId = newWiringDiagramId();
    const ext = path.extname(result.fileName).toLowerCase() || ".pdf";
    const storageKey = buildWiringDiagramKey({
      shopId,
      vehicleId,
      diagramId,
      wiringSystem,
      ext,
    });

    const storage = getCloudStorage();
    await storage.upload(storageKey, result.buffer, result.mimeType);

    const saved = await prisma.wiringDiagram.upsert({
      where: {
        shopId_vehicleId_wiringSystem: { shopId, vehicleId, wiringSystem },
      },
      create: {
        id: diagramId,
        shopId,
        vehicleId,
        wiringSystem,
        storageKey,
        mimeType: result.mimeType,
        fileName: result.fileName,
        sourceBrand: brand,
        pageCount: result.pageCount ?? null,
        downloadedByUserId: downloadedByUserId ?? null,
      },
      update: {
        storageKey,
        mimeType: result.mimeType,
        fileName: result.fileName,
        sourceBrand: brand,
        pageCount: result.pageCount ?? null,
        downloadedAt: new Date(),
        downloadedByUserId: downloadedByUserId ?? null,
      },
      select: {
        id: true,
        wiringSystem: true,
        mimeType: true,
        fileName: true,
        sourceBrand: true,
        downloadedAt: true,
      },
    });

    await markDownloadCompleted(jobId, shopId, saved.id);

    return {
      ok: true,
      jobId,
      diagram: {
        id: saved.id,
        wiringSystem: saved.wiringSystem,
        mimeType: saved.mimeType,
        fileName: saved.fileName,
        sourceBrand: saved.sourceBrand,
        downloadedAt: saved.downloadedAt.toISOString(),
        viewUrl: `/api/wiring-diagrams/${saved.id}`,
      },
    };
  } catch (e) {
    const message =
      e instanceof WiringProviderError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Wiring diagram download failed.";
    await markDownloadFailed(jobId, shopId, message);
    return {
      ok: false,
      error: message,
      code: e instanceof WiringProviderError ? e.code : "download_failed",
      jobId,
    };
  }
}

export async function getWiringDiagramForShop(
  shopId: string,
  diagramId: string,
): Promise<{ storageKey: string; mimeType: string; fileName: string | null } | null> {
  const row = await prisma.wiringDiagram.findFirst({
    where: { id: diagramId, shopId },
    select: { storageKey: true, mimeType: true, fileName: true },
  });
  return row;
}

export const wiringDiagramService = {
  getAvailability: getWiringAvailability,
  list: listWiringDiagrams,
  download: downloadWiringDiagram,
  getForShop: getWiringDiagramForShop,
};
