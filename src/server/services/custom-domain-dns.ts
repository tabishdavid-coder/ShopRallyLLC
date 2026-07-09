import "server-only";

import { promises as dns } from "node:dns";

import { customDomainCnameTarget } from "@/lib/custom-domain";

/** Confirm custom domain CNAME points at the shop sites subdomain. */
export async function verifyCustomDomainCname(
  domain: string,
  slug: string,
): Promise<boolean> {
  const expected = customDomainCnameTarget(slug).toLowerCase().replace(/\.$/, "");
  const hosts = [domain, `www.${domain}`];

  for (const host of hosts) {
    try {
      const records = await dns.resolveCname(host);
      if (
        records.some((r) => r.toLowerCase().replace(/\.$/, "") === expected)
      ) {
        return true;
      }
    } catch {
      // no CNAME on this host
    }
  }
  return false;
}
