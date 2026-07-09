import "server-only";

/**
 * Object storage for inspection photos, documents, and other uploads.
 * Production must use Vercel Blob, S3, or R2 — never the local filesystem.
 */

export interface CloudStorageProvider {
  /** Upload bytes and return a public or signed URL. */
  upload(key: string, buffer: Buffer, contentType?: string): Promise<string>;
  delete?(key: string): Promise<void>;
}

class LocalDevStorageProvider implements CloudStorageProvider {
  async upload(key: string, _buffer: Buffer, _contentType?: string): Promise<string> {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[cloud-storage] LocalDevStorageProvider active in production — set BLOB_READ_WRITE_TOKEN",
      );
    }
    // Dev stub: no filesystem write (stateless / cloud-safe).
    return `local://${key}`;
  }
}

class VercelBlobStorageProvider implements CloudStorageProvider {
  async upload(_key: string, _buffer: Buffer, _contentType?: string): Promise<string> {
    // TODO: install @vercel/blob and call put() when inspection uploads ship.
    throw new Error(
      "Vercel Blob provider not wired yet. Install @vercel/blob and implement put().",
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
