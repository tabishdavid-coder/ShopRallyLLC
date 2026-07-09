/** Third-party subprocessors referenced in the Privacy Policy and DPA. */
export const SUBPROCESSORS = [
  {
    vendor: "Neon",
    purpose: "Managed PostgreSQL database hosting",
    dataProcessed: "All shop and customer data at rest",
  },
  {
    vendor: "Vercel",
    purpose: "Application hosting and edge delivery",
    dataProcessed: "Request logs, session metadata, uploaded files",
  },
  {
    vendor: "Clerk",
    purpose: "Authentication and organization management",
    dataProcessed: "User identity, email, organization membership",
  },
  {
    vendor: "Twilio",
    purpose: "SMS messaging (inbound and outbound)",
    dataProcessed: "Phone numbers, message content, delivery metadata",
  },
  {
    vendor: "Stripe",
    purpose: "Payment processing via Connect Express",
    dataProcessed: "Payment methods, transaction amounts, payout details",
  },
  {
    vendor: "Resend",
    purpose: "Transactional email delivery",
    dataProcessed: "Email addresses, message content",
  },
  {
    vendor: "Inngest",
    purpose: "Background jobs and workflow automation",
    dataProcessed: "Job payloads containing shop operational data",
  },
  {
    vendor: "PartsTech",
    purpose: "Parts catalog and ordering integration",
    dataProcessed: "Vehicle info, part numbers, order metadata",
  },
] as const;

export const DATA_RETENTION_POLICY =
  "Upon subscription cancellation or account closure, ShopRally retains shop data for 30 days to allow export and dispute resolution. After 30 days, tenant data is permanently deleted from production systems except where longer retention is required by law or for anonymized analytics.";
