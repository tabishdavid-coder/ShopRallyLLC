/** Domain verification helpers for external / custom-domain SEO properties. */

export const SEO_VERIFICATION_META_NAME = "shoprally-site-verification";

/** @deprecated Legacy RepairPilot verification meta name — still accepted when verifying. */
export const LEGACY_SEO_VERIFICATION_META_NAME = "repairpilot-site-verification";

export function seoVerificationTxtValue(token: string): string {
  return `${SEO_VERIFICATION_META_NAME}=${token}`;
}

export function seoVerificationDnsHost(domain: string): string {
  return `_shoprally.${domain}`;
}

export function seoVerificationMetaSnippet(token: string): string {
  return `<meta name="${SEO_VERIFICATION_META_NAME}" content="${token}" />`;
}

export type SeoVerificationInstructions = {
  domain: string;
  token: string;
  txtHost: string;
  txtValue: string;
  metaSnippet: string;
  siteUrl: string;
};

export function buildVerificationInstructions(
  domain: string,
  token: string,
): SeoVerificationInstructions {
  return {
    domain,
    token,
    txtHost: seoVerificationDnsHost(domain),
    txtValue: seoVerificationTxtValue(token),
    metaSnippet: seoVerificationMetaSnippet(token),
    siteUrl: `https://${domain}`,
  };
}
