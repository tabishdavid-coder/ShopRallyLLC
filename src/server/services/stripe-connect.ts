import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/client";
import { StripeConnectStatus } from "@/generated/prisma";
import type {
  ConnectPrerequisiteField,
  ConnectPrerequisites,
  ShopConnectProfile,
  ShopStripeStatus,
} from "@/lib/stripe-connect-types";
import { publicUrl } from "@/lib/app-url";
import {
  getStripe,
  getStripeConfigStatus,
  isStripeEnabled,
  isStripePlatformFallbackAllowed,
} from "@/lib/stripe";

export type { ShopStripeStatus, ConnectPrerequisites, ShopConnectProfile };

export type ConnectAccountLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type ExpressDashboardLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const SHOP_PROFILE_SELECT = {
  name: true,
  email: true,
  authorizationNotifyEmail: true,
  taxId: true,
  address: true,
  address2: true,
  city: true,
  state: true,
  zip: true,
  phone: true,
  website: true,
} as const;

const STRIPE_FIELDS = {
  stripeConnectAccountId: true,
  stripeConnectStatus: true,
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
  stripeConnectDetailsSubmitted: true,
  stripeOnboardingCompletedAt: true,
  ...SHOP_PROFILE_SELECT,
} as const;

/** Auto repair shops — Stripe MCC 7538. */
const AUTO_REPAIR_MCC = "7538";

function hasText(v: string | null | undefined): boolean {
  return Boolean(v?.trim());
}

function ownerEmail(shop: {
  email: string | null;
  authorizationNotifyEmail: string | null;
}): string | null {
  return shop.email?.trim() || shop.authorizationNotifyEmail?.trim() || null;
}

export function shopProfileFromRow(
  shop: {
    name: string;
    email: string | null;
    authorizationNotifyEmail: string | null;
    taxId: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    website: string | null;
  },
): ShopConnectProfile {
  return {
    name: shop.name,
    email: ownerEmail(shop),
    taxId: shop.taxId,
    address: shop.address,
    address2: shop.address2,
    city: shop.city,
    state: shop.state,
    zip: shop.zip,
    phone: shop.phone,
    website: shop.website,
  };
}

export function evaluateConnectPrerequisites(profile: ShopConnectProfile): ConnectPrerequisites {
  const missing: ConnectPrerequisiteField[] = [];
  if (!hasText(profile.name)) missing.push("name");
  if (!hasText(profile.email)) missing.push("email");
  if (!hasText(profile.address)) missing.push("address");
  if (!hasText(profile.city)) missing.push("city");
  if (!hasText(profile.state)) missing.push("state");
  if (!hasText(profile.zip)) missing.push("zip");
  return { profile, ready: missing.length === 0, missing };
}

/** Load shop profile fields used before Stripe onboarding. */
export async function getShopConnectPrerequisites(shopId: string): Promise<ConnectPrerequisites> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: SHOP_PROFILE_SELECT,
  });
  if (!shop) {
    return evaluateConnectPrerequisites({
      name: "",
      email: null,
      taxId: null,
      address: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      website: null,
    });
  }
  return evaluateConnectPrerequisites(shopProfileFromRow(shop));
}

function mapAccountToStatus(account: Stripe.Account): {
  connectStatus: StripeConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
} {
  const chargesEnabled = account.charges_enabled === true;
  const payoutsEnabled = account.payouts_enabled === true;
  const detailsSubmitted = account.details_submitted === true;
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const requirementsCurrentlyDue = account.requirements?.currently_due ?? [];
  const requirementsPastDue = account.requirements?.past_due ?? [];

  let connectStatus: StripeConnectStatus = StripeConnectStatus.PENDING;
  if (disabledReason) {
    connectStatus = StripeConnectStatus.DISABLED;
  } else if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
    connectStatus = StripeConnectStatus.ACTIVE;
  } else if (requirementsPastDue.length || requirementsCurrentlyDue.length) {
    connectStatus = StripeConnectStatus.RESTRICTED;
  } else if (detailsSubmitted) {
    connectStatus = StripeConnectStatus.PENDING;
  }

  return {
    connectStatus,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    disabledReason,
    requirementsCurrentlyDue,
    requirementsPastDue,
  };
}

function buildShopStripeStatus(row: {
  stripeConnectAccountId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
  stripeOnboardingCompletedAt: Date | null;
  disabledReason?: string | null;
  requirementsCurrentlyDue?: string[];
  requirementsPastDue?: string[];
}): ShopStripeStatus {
  const platformConfigured = isStripeEnabled();
  const usingConnect =
    Boolean(row.stripeConnectAccountId) &&
    row.stripeConnectStatus === StripeConnectStatus.ACTIVE &&
    row.stripeChargesEnabled;

  const connectReady = usingConnect;
  const platformFallback =
    platformConfigured &&
    isStripePlatformFallbackAllowed() &&
    !row.stripeConnectAccountId;

  const canOpenExpressDashboard =
    Boolean(row.stripeConnectAccountId) &&
    row.stripeConnectStatus === StripeConnectStatus.ACTIVE &&
    row.stripeChargesEnabled;

  return {
    connectStatus: row.stripeConnectAccountId
      ? row.stripeConnectStatus
      : StripeConnectStatus.NOT_STARTED,
    accountId: row.stripeConnectAccountId,
    chargesEnabled: row.stripeChargesEnabled,
    payoutsEnabled: row.stripePayoutsEnabled,
    detailsSubmitted: row.stripeConnectDetailsSubmitted,
    onboardingCompletedAt: row.stripeOnboardingCompletedAt,
    platformConfigured,
    canAcceptPayments: connectReady || platformFallback,
    usingConnect: connectReady,
    canOpenExpressDashboard,
    disabledReason: row.disabledReason ?? null,
    requirementsCurrentlyDue: row.requirementsCurrentlyDue ?? [],
    requirementsPastDue: row.requirementsPastDue ?? [],
  };
}

/** Resolve whether a shop can run Stripe Checkout and which account to charge. */
export async function getShopStripeStatus(shopId: string): Promise<ShopStripeStatus> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: STRIPE_FIELDS,
  });
  if (!shop) {
    return buildShopStripeStatus({
      stripeConnectAccountId: null,
      stripeConnectStatus: StripeConnectStatus.NOT_STARTED,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeConnectDetailsSubmitted: false,
      stripeOnboardingCompletedAt: null,
    });
  }
  return buildShopStripeStatus(shop);
}

/** Whether online invoice pay is available for this shop. */
export async function isShopOnlinePaymentsEnabled(shopId: string): Promise<boolean> {
  const status = await getShopStripeStatus(shopId);
  return status.canAcceptPayments;
}

/** Stripe request options for Checkout — shop Connect account or platform direct (dev fallback). */
export async function getCheckoutStripeContext(shopId: string): Promise<
  | { canCheckout: true; stripeAccount?: string; usingConnect: boolean }
  | { canCheckout: false; error: string }
> {
  const status = await getShopStripeStatus(shopId);
  if (!status.canAcceptPayments) {
    return {
      canCheckout: false,
      error: status.platformConfigured
        ? "This shop has not finished Stripe onboarding. Connect in Payments → Account."
        : "Online payments are not configured for this shop.",
    };
  }
  return {
    canCheckout: true,
    stripeAccount: status.usingConnect ? status.accountId ?? undefined : undefined,
    usingConnect: status.usingConnect,
  };
}

async function persistAccountState(
  shopId: string,
  account: Stripe.Account,
): Promise<ShopStripeStatus> {
  const mapped = mapAccountToStatus(account);
  const isActive = mapped.connectStatus === StripeConnectStatus.ACTIVE;

  const existing = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { stripeOnboardingCompletedAt: true },
  });

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: {
      stripeConnectAccountId: account.id,
      stripeConnectStatus: mapped.connectStatus,
      stripeChargesEnabled: mapped.chargesEnabled,
      stripePayoutsEnabled: mapped.payoutsEnabled,
      stripeConnectDetailsSubmitted: mapped.detailsSubmitted,
      ...(isActive && mapped.detailsSubmitted && !existing?.stripeOnboardingCompletedAt
        ? { stripeOnboardingCompletedAt: new Date() }
        : {}),
    },
    select: STRIPE_FIELDS,
  });

  return buildShopStripeStatus({
    ...shop,
    disabledReason: mapped.disabledReason,
    requirementsCurrentlyDue: mapped.requirementsCurrentlyDue,
    requirementsPastDue: mapped.requirementsPastDue,
  });
}

/** Pull latest Connect account state from Stripe and persist on Shop. */
export async function syncShopFromStripeAccount(shopId: string): Promise<ShopStripeStatus> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: STRIPE_FIELDS,
  });
  if (!shop?.stripeConnectAccountId) {
    return getShopStripeStatus(shopId);
  }
  if (!isStripeEnabled()) {
    return buildShopStripeStatus(shop);
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(shop.stripeConnectAccountId);
  return persistAccountState(shopId, account);
}

function buildAccountCreateParams(
  shopId: string,
  shop: {
    name: string;
    email: string | null;
    authorizationNotifyEmail: string | null;
    taxId: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    website: string | null;
  },
): Stripe.AccountCreateParams {
  const email = ownerEmail(shop);
  const hasAddress =
    hasText(shop.address) && hasText(shop.city) && hasText(shop.state) && hasText(shop.zip);

  return {
    type: "express",
    country: "US",
    email: email ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "company",
    company: {
      name: shop.name,
      ...(shop.taxId?.trim() ? { tax_id: shop.taxId.trim() } : {}),
      ...(hasAddress
        ? {
            address: {
              line1: shop.address!.trim(),
              line2: shop.address2?.trim() || undefined,
              city: shop.city!.trim(),
              state: shop.state!.trim(),
              postal_code: shop.zip!.trim(),
              country: "US",
            },
          }
        : {}),
    },
    business_profile: {
      name: shop.name,
      mcc: AUTO_REPAIR_MCC,
      url: shop.website?.trim() || undefined,
      support_phone: shop.phone?.trim() || undefined,
      product_description: "Auto repair shop services and parts",
    },
    metadata: {
      shopId,
      platform: "repairpilot",
    },
  };
}

async function ensureExpressAccount(shopId: string): Promise<
  | { ok: true; accountId: string }
  | { ok: false; error: string }
> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: STRIPE_FIELDS,
  });
  if (!shop) return { ok: false, error: "Shop not found." };
  if (shop.stripeConnectAccountId) {
    return { ok: true, accountId: shop.stripeConnectAccountId };
  }

  const prereqs = evaluateConnectPrerequisites(shopProfileFromRow(shop));
  if (!prereqs.ready) {
    return {
      ok: false,
      error: "Complete the shop profile checklist before connecting to Stripe.",
    };
  }

  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: "ShopRally platform Stripe is not configured. Contact your platform administrator.",
    };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create(buildAccountCreateParams(shopId, shop));

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      stripeConnectAccountId: account.id,
      stripeConnectStatus: StripeConnectStatus.PENDING,
    },
  });

  return { ok: true, accountId: account.id };
}

/** Create (or refresh) Stripe Account Link for Express onboarding. */
export async function createConnectAccountLink(shopId: string): Promise<ConnectAccountLinkResult> {
  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: "Stripe Connect requires STRIPE_SECRET_KEY on the ShopRally platform account.",
    };
  }

  const config = getStripeConfigStatus();
  if (!config.connectPlatformReady) {
    return {
      ok: false,
      error: "Platform Stripe is not Connect-ready. Use a Connect-enabled platform secret key.",
    };
  }

  const ensured = await ensureExpressAccount(shopId);
  if (!ensured.ok) return ensured;

  const stripe = getStripe();
  const settingsUrl = publicUrl("/marketing/payment-account");
  const link = await stripe.accountLinks.create({
    account: ensured.accountId,
    refresh_url: `${settingsUrl}?connect=refresh`,
    return_url: `${settingsUrl}?connect=return`,
    type: "account_onboarding",
  });

  if (!link.url) {
    return { ok: false, error: "Could not create Stripe onboarding link." };
  }

  return { ok: true, url: link.url };
}

/** Create Account Link for shops that need to complete outstanding requirements. */
export async function createConnectAccountUpdateLink(
  shopId: string,
): Promise<ConnectAccountLinkResult> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { stripeConnectAccountId: true },
  });
  if (!shop?.stripeConnectAccountId) {
    return createConnectAccountLink(shopId);
  }
  if (!isStripeEnabled()) {
    return { ok: false, error: "Stripe Connect is not configured on the platform." };
  }

  const stripe = getStripe();
  const settingsUrl = publicUrl("/marketing/payment-account");
  const link = await stripe.accountLinks.create({
    account: shop.stripeConnectAccountId,
    refresh_url: `${settingsUrl}?connect=refresh`,
    return_url: `${settingsUrl}?connect=return`,
    type: "account_onboarding",
  });

  if (!link.url) {
    return { ok: false, error: "Could not create Stripe update link." };
  }

  return { ok: true, url: link.url };
}

/** Single-use Express Dashboard login link (payouts & disputes only). */
export async function createExpressDashboardLoginLink(
  shopId: string,
): Promise<ExpressDashboardLinkResult> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { stripeConnectAccountId: true, stripeConnectStatus: true, stripeChargesEnabled: true },
  });
  if (!shop?.stripeConnectAccountId) {
    return { ok: false, error: "No Stripe account connected for this shop." };
  }
  if (!isStripeEnabled()) {
    return { ok: false, error: "Stripe is not configured on the platform." };
  }

  const stripe = getStripe();
  const loginLink = await stripe.accounts.createLoginLink(shop.stripeConnectAccountId);
  if (!loginLink.url) {
    return { ok: false, error: "Could not open Express Dashboard." };
  }
  return { ok: true, url: loginLink.url };
}

/** Webhook handler — account.updated from Stripe Connect. */
export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const shopId = account.metadata?.shopId;
  if (shopId) {
    await persistAccountState(shopId, account);
    return;
  }

  const shop = await prisma.shop.findFirst({
    where: { stripeConnectAccountId: account.id },
    select: { id: true },
  });
  if (shop) {
    await persistAccountState(shop.id, account);
  }
}

/** Webhook handler — shop disconnected Express account from platform. */
export async function handleAccountDeauthorized(accountId: string): Promise<void> {
  const shop = await prisma.shop.findFirst({
    where: { stripeConnectAccountId: accountId },
    select: { id: true },
  });
  if (!shop) return;

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      stripeConnectStatus: StripeConnectStatus.DISABLED,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
    },
  });
}

/** Platform-managed Express accounts cannot be self-disconnected — stub for UI. */
export function getStripeDisconnectNotice(): string {
  return (
    "This Stripe Express account is managed by ShopRally for customer payments only. " +
    "To disconnect, contact ShopRally support — outstanding balances and compliance rules apply."
  );
}
