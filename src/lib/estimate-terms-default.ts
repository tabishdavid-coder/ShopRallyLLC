/**
 * Platform default customer terms for estimates vs invoices.
 *
 * Grounded in common shop “backer” practice (ASCCA estimate/RO checklist,
 * BAR-style authorize-before-work / invoice-on-completion norms): estimates
 * authorize listed work and require re-approval for extras; invoices state
 * final charges, payment-on-pickup, and mechanic’s lien. Not legal advice —
 * shops should customize for their state and counsel.
 */

/** Default estimate authorization terms when a shop has not configured custom text. */
export const DEFAULT_ESTIMATE_TERMS_HTML = `
<p>
  <strong>Authorization.</strong> By approving this estimate, you authorize the shop to
  perform the listed repairs and services at the estimated prices shown. This estimate is
  an approximation of cost based on the information available now — it is not a final bill.
</p>
<p>
  <strong>Additional work.</strong> If we find related issues or the cost will exceed this
  estimate, we will contact you for approval before proceeding. Parts availability and
  supplier delays may affect completion time; any promised date is approximate.
</p>
<p>
  <strong>Payment &amp; vehicle.</strong> Payment is due when repairs are complete and you
  pick up the vehicle. The shop may retain a mechanic&rsquo;s lien on the vehicle until
  authorized charges are paid in full. You authorize the shop to operate the vehicle for
  diagnosis, repair, and road testing as needed. Please contact us with any questions.
</p>
`.trim();

/** Default invoice acknowledgment when a shop has not configured custom invoice terms. */
export const DEFAULT_INVOICE_TERMS_HTML = `
<p>
  <strong>Thank you for your business.</strong> This invoice reflects the final charges for
  the authorized work completed on your vehicle. Payment is due upon pickup, before the
  vehicle is released, unless other arrangements have been made in writing.
</p>
<p>
  <strong>Lien &amp; storage.</strong> A mechanic&rsquo;s lien may be placed on the vehicle
  until the balance is paid in full. Storage fees may apply if the vehicle remains after you
  have been notified that repairs are complete, as permitted by applicable law.
</p>
<p>
  <strong>Warranty.</strong> Any warranty on parts or labor is as stated by the shop at the
  time of sale. Ask us if you have questions about coverage, or about anything we did.
</p>
`.trim();

export type ShopEstimateTermsFields = {
  estimateTermsHtml: string | null;
  estimateTermsVersion: string | null;
};

export type ShopInvoiceTermsFields = {
  invoiceTermsHtml: string | null;
};

/** Resolved HTML + version shown to customers on the approval link and estimate print. */
export function resolveShopEstimateTerms(shop: ShopEstimateTermsFields): {
  html: string;
  version: string;
} {
  const html = shop.estimateTermsHtml?.trim() || DEFAULT_ESTIMATE_TERMS_HTML;
  const version = shop.estimateTermsVersion?.trim() || "1.0";
  return { html, version };
}

/** Resolved HTML shown on public invoices and invoice print. */
export function resolveShopInvoiceTerms(shop: ShopInvoiceTermsFields): {
  html: string;
} {
  const html = shop.invoiceTermsHtml?.trim() || DEFAULT_INVOICE_TERMS_HTML;
  return { html };
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
