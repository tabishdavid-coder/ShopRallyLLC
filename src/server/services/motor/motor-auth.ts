import "server-only";

import { createHmac } from "node:crypto";

/**
 * MOTOR DaaS Shared-scheme request signing.
 * @see MOTOR DaaS Development Handbook — Signing a Request
 */
export function motorAuthorizationHeader(
  publicKey: string,
  privateKey: string,
  method: string,
  uriPath: string,
  epochSeconds: number,
): { authorization: string; xDate: string } {
  const pathOnly = uriPath.split("?")[0] ?? uriPath;
  const signatureData = [publicKey, method.toUpperCase(), String(epochSeconds), pathOnly].join("\n");
  const signature = createHmac("sha256", privateKey).update(signatureData).digest("base64");
  return {
    authorization: `Shared ${publicKey}:${signature}`,
    xDate: String(epochSeconds),
  };
}
