import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Object storage for RO photos, inspection media, and documents.
 *
 * - Local/dev (default): writes under `.data/uploads/` (gitignored), served via `/api/ro-media`.
 * - Production: set `BLOB_READ_WRITE_TOKEN` and install `@vercel/blob`, then wire put() below.
 *
 * Cost rule: uploads only run on explicit staff action — never on page load.
 */

export type UploadResult = {
  /** Tenant-scoped object key. */
  key: string;
  /** Absolute Blob URL, or app-relative path marker for local serving. */
  url: string;
};

export interface CloudStorageProvider {
  upload(key: string, buffer: Buffer, contentType?: string): Promise<UploadResult>;
  /** Read bytes for local/dev serving. Blob CDN urls return null. */
  read?(key: string): Promise<Buffer | null>;
  delete?(key: string): Promise<void>;
}

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || !normalized.startsWith("shops/")) {
    throw new Error("Invalid storage key.");
  }
  return normalized;
}

class LocalDevStorageProvider implements CloudStorageProvider {
  async upload(key: string, buffer: Buffer, _contentType?: string): Promise<UploadResult> {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_UPLOADS) {
      console.warn(
        "[cloud-storage] LocalDevStorageProvider active in production — set BLOB_READ_WRITE_TOKEN",
      );
    }
    const safeKey = assertSafeKey(key);
    const fullPath = path.join(LOCAL_ROOT, ...safeKey.split("/"));
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return { key: safeKey, url: `local://${safeKey}` };
  }

  async read(key: string): Promise<Buffer | null> {
    const safeKey = assertSafeKey(key);
    const fullPath = path.join(LOCAL_ROOT, ...safeKey.split("/"));
    try {
      return await readFile(fullPath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const safeKey = assertSafeKey(key);
    const fullPath = path.join(LOCAL_ROOT, ...safeKey.split("/"));
    try {
      await unlink(fullPath);
    } catch {
      // ignore missing
    }
  }
}

/**
 * Placeholder until `@vercel/blob` is installed.
 * When ready: `npm i @vercel/blob` and implement put/del with BLOB_READ_WRITE_TOKEN.
 */
class VercelBlobStorageProvider implements CloudStorageProvider {
  async upload(_key: string, _buffer: Buffer, _contentType?: string): Promise<UploadResult> {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is set but @vercel/blob is not wired yet. Unset the token for local uploads, or install @vercel/blob and implement put() in cloud-storage.ts.",
    );
  }
}

let cached: CloudStorageProvider | null = null;

export function getCloudStorage(): CloudStorageProvider {
  if (cached) return cached;
  cached = process.env.BLOB_READ_WRITE_TOKEN?.trim()
    ? new VercelBlobStorageProvider()
    : new LocalDevStorageProvider();
  return cached;
}

/** Build a tenant-scoped storage key for an RO attachment. */
export function buildRoAttachmentKey(opts: {
  shopId: string;
  repairOrderId: string;
  attachmentId: string;
  fileName: string;
}): string {
  const ext = path.extname(opts.fileName).toLowerCase().replace(/[^\w.]/g, "") || ".bin";
  return `shops/${opts.shopId}/ros/${opts.repairOrderId}/${opts.attachmentId}${ext}`;
}

export function newAttachmentId(): string {
  return createHash("sha256").update(randomBytes(24)).digest("hex").slice(0, 24);
}

export function newWiringDiagramId(): string {
  return createHash("sha256").update(randomBytes(24)).digest("hex").slice(0, 24);
}

/** Tenant-scoped key for cached OEM wiring diagrams (shop-licensed — do not redistribute). */
export function buildWiringDiagramKey(opts: {
  shopId: string;
  vehicleId: string;
  diagramId: string;
  wiringSystem: string;
  ext: string;
}): string {
  const ext = opts.ext.startsWith(".") ? opts.ext.toLowerCase().replace(/[^\w.]/g, "") : `.${opts.ext.toLowerCase().replace(/[^\w.]/g, "")}`;
  const safeSystem = opts.wiringSystem.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `shops/${opts.shopId}/wiring/${opts.vehicleId}/${safeSystem}/${opts.diagramId}${ext}`;
}
