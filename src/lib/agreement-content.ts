/** Placeholder agreement HTML for v1.0.0 seed documents — not legal advice. */
export function buildPlaceholderAgreementHtml(
  title: string,
  sections: string[],
): string {
  const banner =
    '<p><strong>DRAFT — PLACEHOLDER — NOT LEGAL ADVICE</strong></p>' +
    "<p>This document is a placeholder for development and demonstration purposes only. " +
    "It does not constitute legal advice and must be replaced with counsel-reviewed terms before production use.</p>";

  const body = sections
    .map(
      (section, index) =>
        `<h2>${index + 1}. ${section}</h2><p>Placeholder language for ${title}: ${section.toLowerCase()} provisions will be provided in the final agreement.</p>`,
    )
    .join("");

  return `${banner}${body}`;
}

export const AGREEMENT_SEED_VERSION = "1.0.0";

export const AGREEMENT_SEED_EFFECTIVE_AT = new Date("2026-06-29T00:00:00.000Z");

export const AGREEMENT_SEED_DEFINITIONS = [
  {
    type: "PLATFORM_TOS" as const,
    title: "ShopRally Platform Terms of Service",
    sections: [
      "Acceptance of Terms",
      "Description of Service",
      "Account Registration",
      "Subscription and Billing",
      "Acceptable Use",
      "Data and Privacy",
      "Intellectual Property",
      "Disclaimer of Warranties",
      "Limitation of Liability",
      "Termination",
      "Governing Law",
    ],
  },
  {
    type: "PRIVACY_POLICY" as const,
    title: "ShopRally Privacy Policy",
    sections: [
      "Information We Collect",
      "How We Use Information",
      "Shop and Customer Data",
      "Sharing and Processors",
      "Data Retention",
      "Security",
      "Your Rights",
      "Contact",
    ],
  },
  {
    type: "ACCEPTABLE_USE" as const,
    title: "ShopRally Acceptable Use Policy",
    sections: [
      "Permitted Use",
      "Prohibited Conduct",
      "Messaging and TCPA Compliance",
      "Security Requirements",
      "Enforcement",
    ],
  },
  {
    type: "DPA" as const,
    title: "ShopRally Data Processing Agreement",
    sections: [
      "Definitions",
      "Scope and Roles",
      "Processing Instructions",
      "Subprocessors",
      "Security Measures",
      "Data Subject Rights",
      "Breach Notification",
      "Return and Deletion",
      "Audit Rights",
    ],
  },
  {
    type: "PAYMENT_ADDENDUM" as const,
    title: "ShopRally Payment Processing Addendum",
    sections: [
      "Stripe Connect Express",
      "Platform-Managed Accounts",
      "Fees and Settlement",
      "Chargebacks and Disputes",
      "PCI Scope",
      "Prohibited Transactions",
      "Termination",
    ],
  },
  {
    type: "SMS_ADDENDUM" as const,
    title: "ShopRally SMS & Messaging Addendum",
    sections: [
      "TCPA and Consent",
      "Opt-In and Opt-Out",
      "Message Content",
      "A2P 10DLC Registration",
      "Carrier Compliance",
      "Shop Responsibilities",
      "Indemnification",
    ],
  },
] as const;
