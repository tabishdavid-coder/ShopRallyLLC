import { createHash } from "node:crypto";

/** SHA-256 hex digest of agreement HTML for audit / compliance matching. */
export function hashAgreementContent(contentHtml: string): string {
  return createHash("sha256").update(contentHtml, "utf8").digest("hex");
}
