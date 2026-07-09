/** Default customer estimate authorization terms when a shop has not configured custom text. */
export const DEFAULT_ESTIMATE_TERMS_HTML = `
<h3>Authorization to Perform Repairs</h3>
<p>
  By signing below, you authorize the shop to perform the repair work described in this estimate
  at the prices shown. You understand that additional work may be required if hidden damage or
  related issues are discovered during the repair, and the shop will contact you for approval
  before performing any work not listed on this estimate.
</p>
<h3>Payment &amp; Storage</h3>
<p>
  Payment is due upon completion of authorized work unless other arrangements have been made in
  writing. Vehicles left after notification of completion may be subject to storage fees as
  permitted by applicable law.
</p>
<h3>Warranty Disclaimer</h3>
<p>
  Unless otherwise stated in writing, the shop provides a limited warranty on parts and labor
  as described on your invoice. This estimate is not a guarantee of repair outcome. Used,
  rebuilt, or customer-supplied parts may carry limited or no warranty.
</p>
<p>
  <strong>Limitation:</strong> To the fullest extent permitted by law, the shop is not liable
  for incidental, consequential, or special damages arising from repair services.
</p>
`.trim();

export type ShopEstimateTermsFields = {
  estimateTermsHtml: string | null;
  estimateTermsVersion: string | null;
};

/** Resolved HTML + version shown to customers on the approval link. */
export function resolveShopEstimateTerms(shop: ShopEstimateTermsFields): {
  html: string;
  version: string;
} {
  const html = shop.estimateTermsHtml?.trim() || DEFAULT_ESTIMATE_TERMS_HTML;
  const version = shop.estimateTermsVersion?.trim() || "1.0";
  return { html, version };
}

/** Bump simple semver (1.0 → 1.1) when shop edits estimate terms. */
export function bumpEstimateTermsVersion(current: string | null | undefined): string {
  const raw = current?.trim() || "1.0";
  const parts = raw.split(".").map((p) => parseInt(p, 10));
  if (parts.length >= 2 && !parts.some(Number.isNaN)) {
    return `${parts[0]}.${parts[1] + 1}`;
  }
  return "1.1";
}
