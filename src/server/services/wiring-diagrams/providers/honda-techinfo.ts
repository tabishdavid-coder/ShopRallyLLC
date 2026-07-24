import "server-only";

/**
 * Honda TechInfo (techinfo.honda.com) wiring diagram provider — Playwright skeleton.
 *
 * LIVE STEPS (documented selectors — not yet stable in CI):
 * 1. Launch chromium headless (`WIRING_PLAYWRIGHT_HEADLESS=false` for debug).
 * 2. Navigate portal login URL (default https://techinfo.honda.com).
 * 3. Fill credentials from env key on the shop's WiringDiagramSource row.
 *    - `#username` / `#password` (placeholder — verify against live portal)
 *    - Submit via `button[type=submit]` or `#loginBtn`
 * 4. Detect session expiry: redirect to `/login` or `.session-expired` banner.
 * 5. Vehicle lookup: VIN field `#vinInput` → search → pick Y/M/M match.
 * 6. Wiring nav: Electrical → Wiring Diagrams → select system tab matching WiringSystem enum.
 * 7. Export PDF via portal print/download button `#exportPdf` (or print-to-PDF fallback).
 *
 * Shop-licensed cache only — do not redistribute OEM diagrams.
 *
 * Stub mode: `WIRING_DIAGRAMS_STUB=true` or missing credentials returns a minimal PDF.
 */

import type { WiringSystem } from "@/generated/prisma";
import { WIRING_SYSTEM_LABELS } from "@/lib/wiring-systems";
import {
  type WiringDiagramProvider,
  type WiringDownloadRequest,
  type WiringDownloadResult,
  WiringProviderError,
} from "../types";

const HONDA_PORTAL_URL = "https://techinfo.honda.com";

/** Documented selector map — update when portal DOM changes. */
export const HONDA_TECHINFO_SELECTORS = {
  login: {
    username: "#username",
    password: "#password",
    submit: 'button[type="submit"], #loginBtn',
  },
  session: {
    expiredBanner: ".session-expired, .login-required",
    logoutLink: 'a[href*="logout"]',
  },
  vehicle: {
    vinInput: "#vinInput, input[name=vin]",
    searchButton: '#searchVin, button[data-action="search-vin"]',
    ymmPicker: ".vehicle-result-row, .ymm-select-item",
  },
  wiring: {
    navElectrical: 'a[href*="electrical"], nav >> text=Electrical',
    navWiring: 'a[href*="wiring"], nav >> text=Wiring',
    systemTab: (system: WiringSystem) =>
      `[data-wiring-system="${system}"], button:has-text("${WIRING_SYSTEM_LABELS[system]}")`,
    exportPdf: '#exportPdf, button[data-action="download-pdf"]',
  },
} as const;

function parseCredentials(envKey: string | null): { username: string; password: string } | null {
  if (!envKey?.trim()) return null;
  const raw = process.env[envKey.trim()];
  if (!raw?.trim()) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  return {
    username: raw.slice(0, idx).trim(),
    password: raw.slice(idx + 1).trim(),
  };
}

function stubPdf(request: WiringDownloadRequest): WiringDownloadResult {
  const label = WIRING_SYSTEM_LABELS[request.wiringSystem];
  const ymm = [request.vehicle.year, request.vehicle.make, request.vehicle.model]
    .filter(Boolean)
    .join(" ");
  const text = `%PDF-1.4 stub wiring diagram\n% ShopRally dev stub — not for redistribution\n% ${ymm} · ${label}\n%%EOF`;
  return {
    buffer: Buffer.from(text, "utf8"),
    mimeType: "application/pdf",
    fileName: `${request.brand}-${request.wiringSystem.toLowerCase()}-stub.pdf`,
    pageCount: 1,
  };
}

function useStubMode(credentials: { username: string; password: string } | null): boolean {
  const forced = process.env.WIRING_DIAGRAMS_STUB?.trim().toLowerCase();
  if (forced === "true" || forced === "1" || forced === "yes") return true;
  if (!credentials) return true;
  return process.env.WIRING_PLAYWRIGHT_ENABLED?.trim().toLowerCase() !== "true";
}

async function livePlaywrightDownload(
  request: WiringDownloadRequest,
  credentials: { username: string; password: string },
): Promise<WiringDownloadResult> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new WiringProviderError(
      "Playwright is not installed or failed to load.",
      "config",
    );
  }

  const headless = process.env.WIRING_PLAYWRIGHT_HEADLESS?.trim().toLowerCase() !== "false";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(HONDA_PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const { login, session, vehicle, wiring } = HONDA_TECHINFO_SELECTORS;

    await page.fill(login.username, credentials.username);
    await page.fill(login.password, credentials.password);
    await page.click(login.submit);

    if (await page.locator(session.expiredBanner).isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new WiringProviderError("Honda TechInfo session expired at login.", "session");
    }

    if (!request.vehicle.vin?.trim()) {
      throw new WiringProviderError("VIN is required for Honda wiring diagram lookup.", "not_found");
    }

    await page.fill(vehicle.vinInput, request.vehicle.vin.trim());
    await page.click(vehicle.searchButton);
    await page.locator(vehicle.ymmPicker).first().click({ timeout: 30_000 });

    await page.click(wiring.navElectrical);
    await page.click(wiring.navWiring);
    await page.click(wiring.systemTab(request.wiringSystem));

    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await page.click(wiring.exportPdf);
    const download = await downloadPromise;
    const path = await download.path();
    if (!path) {
      throw new WiringProviderError("Honda portal did not produce a download.", "portal");
    }

    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(path);
    const suggested = download.suggestedFilename() || `${request.brand}-wiring.pdf`;

    return {
      buffer,
      mimeType: suggested.endsWith(".png") ? "image/png" : "application/pdf",
      fileName: suggested,
      pageCount: undefined,
    };
  } catch (e) {
    if (e instanceof WiringProviderError) throw e;
    const msg = e instanceof Error ? e.message : "Honda portal download failed.";
    if (/timeout/i.test(msg)) {
      throw new WiringProviderError(msg, "portal");
    }
    throw new WiringProviderError(msg, "portal");
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export class HondaTechInfoProvider implements WiringDiagramProvider {
  readonly brand = "honda";
  readonly mode: "live" | "stub";

  constructor(mode: "live" | "stub" = "stub") {
    this.mode = mode;
  }

  async download(request: WiringDownloadRequest): Promise<WiringDownloadResult> {
    const credentials = parseCredentials(request.credentialsEnvKey);
    if (useStubMode(credentials)) {
      return stubPdf(request);
    }
    if (!credentials) {
      throw new WiringProviderError(
        "Honda TechInfo credentials not configured. Set credentialsEnvKey on WiringDiagramSource and the matching env var (user:pass).",
        "config",
      );
    }
    return livePlaywrightDownload(request, credentials);
  }
}

export const hondaTechInfoProvider = new HondaTechInfoProvider(
  process.env.WIRING_PLAYWRIGHT_ENABLED?.trim().toLowerCase() === "true" ? "live" : "stub",
);
