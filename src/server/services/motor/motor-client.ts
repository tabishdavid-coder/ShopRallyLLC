import "server-only";

import { motorApiBaseUrl, motorPrivateKey, motorPublicKey } from "@/server/services/motor/motor-config";
import { motorAuthorizationHeader } from "@/server/services/motor/motor-auth";

export type MotorRequestResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; error: string };

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** GET JSON from MOTOR DaaS. Returns null body as failure. */
export async function motorGet<T = unknown>(
  resourcePath: string,
  query: Record<string, string | number | undefined> = {},
): Promise<MotorRequestResult<T>> {
  const publicKey = motorPublicKey();
  const privateKey = motorPrivateKey();
  if (!publicKey || !privateKey) {
    return { ok: false, status: 0, error: "MOTOR keys not configured." };
  }

  const path = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  const queryString = buildQuery(query);
  const uriPath = `/v1${path}${queryString}`;
  const epoch = Math.floor(Date.now() / 1000);
  const { authorization } = motorAuthorizationHeader(
    publicKey,
    privateKey,
    "GET",
    uriPath,
    epoch,
  );

  const url = `${motorApiBaseUrl()}${uriPath}`;
  const dateHeader = new Date(epoch * 1000).toUTCString();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authorization,
        Date: dateHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: text.slice(0, 240) || res.statusText || "MOTOR request failed.",
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "MOTOR network error.",
    };
  }
}
