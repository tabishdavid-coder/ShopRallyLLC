import "server-only";

import type { WiringSystem } from "@/generated/prisma";

export type WiringVehicleContext = {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
};

export type WiringDownloadRequest = {
  shopId: string;
  vehicleId: string;
  wiringSystem: WiringSystem;
  brand: string;
  vehicle: WiringVehicleContext;
  credentialsEnvKey: string | null;
};

export type WiringDownloadResult = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  pageCount?: number;
};

export interface WiringDiagramProvider {
  readonly brand: string;
  /** Whether Playwright/OEM portal automation is wired (vs stub/mock). */
  readonly mode: "live" | "stub";
  download(request: WiringDownloadRequest): Promise<WiringDownloadResult>;
}

export class WiringProviderError extends Error {
  constructor(
    message: string,
    readonly code: "auth" | "session" | "not_found" | "rate_limit" | "portal" | "config",
  ) {
    super(message);
    this.name = "WiringProviderError";
  }
}
