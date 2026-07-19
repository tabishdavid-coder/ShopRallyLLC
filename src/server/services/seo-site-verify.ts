import "server-only";

import { promises as dns } from "node:dns";

import {
  LEGACY_SEO_VERIFICATION_META_NAME,
  SEO_VERIFICATION_META_NAME,
  seoVerificationDnsHost,
  seoVerificationTxtValue,
} from "@/lib/seo-verification";

function legacySeoVerificationDnsHost(domain: string): string {
  return `_repairpilot.${domain}`;
}

function legacySeoVerificationTxtValue(token: string): string {
  return `${LEGACY_SEO_VERIFICATION_META_NAME}=${token}`;
}

function tokenPresentInTxtRecords(records: string[][], token: string): boolean {
  const expected = seoVerificationTxtValue(token);
  const legacyExpected = legacySeoVerificationTxtValue(token);
  const flat = records.flat().map((r) => r.trim());
  return flat.some(
    (r) => r === expected || r === legacyExpected || r.includes(token),
  );
}

async function verifyDnsTxt(domain: string, token: string): Promise<boolean> {
  const hosts = [
    seoVerificationDnsHost(domain),
    legacySeoVerificationDnsHost(domain),
    domain,
  ];
  for (const host of hosts) {
    try {
      const records = await dns.resolveTxt(host);
      if (tokenPresentInTxtRecords(records, token)) return true;
    } catch {
      // Host has no TXT — try next
    }
  }
  return false;
}

async function verifyMetaTag(domain: string, token: string): Promise<boolean> {
  const urls = [`https://${domain}`, `https://www.${domain}`, `http://${domain}`];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "ShopRally-SEO-Verify/1.0" },
      });
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 200_000);
      const metaNames = [SEO_VERIFICATION_META_NAME, LEGACY_SEO_VERIFICATION_META_NAME];
      for (const metaName of metaNames) {
        const metaPattern = new RegExp(
          `<meta[^>]+name=["']${metaName}["'][^>]+content=["']${token}["']`,
          "i",
        );
        const altPattern = new RegExp(
          `<meta[^>]+content=["']${token}["'][^>]+name=["']${metaName}["']`,
          "i",
        );
        if (metaPattern.test(html) || altPattern.test(html)) return true;
      }
    } catch {
      // unreachable — try next URL
    }
  }
  return false;
}

/** Confirm domain ownership via DNS TXT or homepage meta tag. */
export async function verifyDomainOwnership(
  domain: string,
  token: string,
): Promise<{ ok: true; method: "dns" | "meta" } | { ok: false; error: string }> {
  if (await verifyDnsTxt(domain, token)) {
    return { ok: true, method: "dns" };
  }
  if (await verifyMetaTag(domain, token)) {
    return { ok: true, method: "meta" };
  }
  return {
    ok: false,
    error:
      "Verification failed. Add the DNS TXT record or meta tag, wait a few minutes for DNS to propagate, then try again.",
  };
}
