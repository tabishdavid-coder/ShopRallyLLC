import { IntegrationsPanel, type IntegrationStatus, type IntegrationState } from "@/components/settings/integrations-panel";
import { getStripeConfigStatus } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]?.trim());

export default function IntegrationsSettingsPage() {
  const twilioPlatform = has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN");
  const twilioAny = has("TWILIO_ACCOUNT_SID") || has("TWILIO_AUTH_TOKEN");
  const carfaxOn = has("CARFAX_PRODUCT_DATA_ID") && has("CARFAX_LOCATION_ID");
  const partstechOn = has("PARTSTECH_PARTNER_ID");
  const partstechAny = has("PARTSTECH_API_KEY") || has("PARTSTECH_USERNAME") || has("PARTSTECH_USER");
  const autodevOn = has("AUTODEV_API_KEY");
  const stripe = getStripeConfigStatus();

  const pick = (on: boolean, any = false): IntegrationState => (on ? "connected" : any ? "mock" : "inactive");

  const statuses: IntegrationStatus[] = [
    {
      name: "Auto.dev",
      category: "VIN decode + license-plate lookup",
      state: autodevOn ? "connected" : "mock",
      detail: autodevOn
        ? "Live VIN decode and US plate→VIN."
        : "Falls back to free NHTSA VIN decode; plate lookup disabled until a key is set.",
      env: ["AUTODEV_API_KEY"],
    },
    {
      name: "NHTSA vPIC",
      category: "Vehicle catalog (year/make/model)",
      state: "connected",
      detail: "Free government data — powers the year-accurate make/model picker. No key required.",
      env: [],
    },
    {
      name: "Carfax",
      category: "Service history import",
      state: carfaxOn ? "connected" : "mock",
      detail: carfaxOn
        ? "Live Service History Check on the RO."
        : "Showing sample service history until a Carfax agreement provides credentials.",
      env: ["CARFAX_PRODUCT_DATA_ID", "CARFAX_LOCATION_ID"],
      docsHref: "/vendors/integrations/carfax",
    },
    {
      name: "PartsTech",
      category: "Parts catalog & ordering",
      state: pick(partstechOn, partstechAny),
      detail: partstechOn
        ? "Live parts catalog + punchout."
        : partstechAny
          ? "Shop credentials present, but a Partner ID is required for live catalog/punchout."
          : "Not configured — runs against a mock catalog.",
      env: ["PARTSTECH_PARTNER_ID", "PARTSTECH_API_KEY"],
      docsHref: "/vendors/integrations/partstech",
    },
    {
      name: "Twilio SMS",
      category: "Communications — 2-way texting",
      state: twilioPlatform ? "connected" : twilioAny ? "mock" : "inactive",
      detail: twilioPlatform
        ? "Platform account connected. Each shop uses its own number via Settings → Phone & SMS. Inbound: /api/webhooks/twilio/sms"
        : "Messages stored in mock mode until platform TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN are set.",
      env: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID", "APP_URL"],
    },
    {
      name: "Stripe",
      category: "Payments (Connect Express per shop)",
      state: stripe.enabled ? (stripe.webhookConfigured ? "connected" : "mock") : "inactive",
      detail: stripe.enabled
        ? stripe.webhookConfigured
          ? "Platform Connect ready — each shop onboards at Shop Growth → Payment account."
          : "Platform key set — add STRIPE_WEBHOOK_SECRET; shops onboard at Shop Growth → Payment account."
        : "Platform Stripe not configured — shops cannot connect until STRIPE_SECRET_KEY is set.",
      env: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "APP_URL",
      ],
      docsHref: "/marketing/payment-account",
    },
    {
      name: "Clerk",
      category: "Auth & multi-tenancy",
      state: pick(has("CLERK_SECRET_KEY")),
      detail: has("CLERK_SECRET_KEY")
        ? "Organizations-based auth active. Post-auth landing: /home (role routing server-side)."
        : "Stub auth until keys are set. Configure NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home when enabling Clerk.",
      env: [
        "CLERK_SECRET_KEY",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
        "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
      ],
      reviewMarkerId: "CLERK-03",
    },
  ];

  return <IntegrationsPanel statuses={statuses} />;
}
