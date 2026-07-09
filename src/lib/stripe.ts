import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export type StripeConfigStatus = {
  enabled: boolean;
  webhookConfigured: boolean;
  publishableKeyConfigured: boolean;
  /** Platform account has secret key — minimum to create Connect Express accounts. */
  connectPlatformReady: boolean;
  mode: "live" | "test" | "none";
};

function stripeKeyMode(key: string | undefined): "live" | "test" | "none" {
  if (!key?.trim()) return "none";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "test";
}

/** Dev-only: Checkout on platform account when shop Connect is incomplete. */
export function isStripePlatformFallbackAllowed(): boolean {
  if (process.env.STRIPE_CONNECT_ALLOW_PLATFORM_FALLBACK === "true") return true;
  if (process.env.STRIPE_CONNECT_REQUIRE_ACTIVE === "true") return false;
  return process.env.NODE_ENV === "development";
}

/** Server-side Stripe env status for settings UI and graceful degradation. */
export function getStripeConfigStatus(): StripeConfigStatus {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const enabled = Boolean(key);
  return {
    enabled,
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    publishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()),
    connectPlatformReady: enabled,
    mode: stripeKeyMode(key),
  };
}

/** Lazily construct the Stripe SDK client (server-only). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!client) {
    client = new Stripe(key, {
      typescript: true,
    });
  }
  return client;
}

/** Brand colors for hosted Checkout (ShopRally official palette). */
export const STRIPE_CHECKOUT_BRANDING = {
  primary: "#1E3A56",
  accent: "#F4581C",
} as const;
