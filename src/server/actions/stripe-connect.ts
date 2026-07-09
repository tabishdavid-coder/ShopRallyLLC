"use server";

import { revalidatePath } from "next/cache";

import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import { AgreementType } from "@/generated/prisma";
import { shopHasCurrentAgreement } from "@/server/legal";
import { getStripeConfigStatus, isStripePlatformFallbackAllowed } from "@/lib/stripe";
import type { PlatformStripeConfig } from "@/lib/stripe-connect-types";
import { updateShopProfile, type ShopProfilePatch } from "@/server/actions/shop";
import {
  createConnectAccountLink,
  createConnectAccountUpdateLink,
  createExpressDashboardLoginLink,
  getShopConnectPrerequisites,
  getStripeDisconnectNotice,
  syncShopFromStripeAccount,
} from "@/server/services/stripe-connect";

export type ConnectActionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type SyncActionResult = { ok: true } | { ok: false; error: string };

export type DisconnectNoticeResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function revalidateConnectPaths() {
  revalidatePath("/marketing/payment-account");
  revalidatePath("/settings/payments");
  revalidatePath("/payments/account");
  revalidatePath("/payments");
  revalidatePath("/settings/integrations");
  revalidatePath("/vendors/integrations");
  revalidatePath("/repair-orders");
}

/** Platform Stripe Connect readiness for settings UI. */
export async function getPlatformStripeConfig(): Promise<PlatformStripeConfig> {
  const shopId = await getShopId();
  const denied = await gates.financeAccount(shopId);
  if (denied) throw new Error(denied.error);
  const cfg = getStripeConfigStatus();
  return {
    enabled: cfg.enabled,
    webhookConfigured: cfg.webhookConfigured,
    publishableKeyConfigured: cfg.publishableKeyConfigured,
    connectReady: cfg.connectPlatformReady && cfg.webhookConfigured,
    mode: cfg.mode,
    platformFallbackAllowed: isStripePlatformFallbackAllowed(),
  };
}

/** Start or resume Stripe Express onboarding for the current shop. */
export async function startStripeConnectOnboarding(): Promise<ConnectActionResult> {
  const shopId = await getShopId();
  const denied = await gates.financeAccount(shopId);
  if (denied) return { ok: false, error: denied.error };

  const paymentAddendumAccepted = await shopHasCurrentAgreement(
    shopId,
    AgreementType.PAYMENT_ADDENDUM,
  );
  if (!paymentAddendumAccepted) {
    return {
      ok: false,
      error: "Accept the Payment Processing Addendum before connecting Stripe.",
    };
  }

  const prereqs = await getShopConnectPrerequisites(shopId);
  if (!prereqs.ready) {
    return {
      ok: false,
      error: "Complete the shop profile checklist (legal name, address, owner email) first.",
    };
  }

  const res = await createConnectAccountLink(shopId);
  if (res.ok) revalidateConnectPaths();
  return res;
}

/** Save shop profile fields then redirect to Stripe onboarding. */
export async function saveProfileAndStartStripeConnect(
  patch: ShopProfilePatch,
): Promise<ConnectActionResult> {
  const shopId = await getShopId();
  const denied = await gates.financeAccount(shopId);
  if (denied) return { ok: false, error: denied.error };

  const saved = await updateShopProfile(patch);
  if (!saved.ok) return saved;

  return startStripeConnectOnboarding();
}

/** Re-open Stripe onboarding when requirements are outstanding. */
export async function resumeStripeConnectOnboarding(): Promise<ConnectActionResult> {
  const shopId = await getShopId();
  const denied = await gates.financeAccount(shopId);
  if (denied) return { ok: false, error: denied.error };

  const res = await createConnectAccountUpdateLink(shopId);
  if (res.ok) revalidateConnectPaths();
  return res;
}

/** Pull Connect account state from Stripe (after return_url redirect). */
export async function syncStripeConnectStatus(): Promise<SyncActionResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.financeAccount(shopId);
    if (denied) return { ok: false, error: denied.error };

    await syncShopFromStripeAccount(shopId);
    revalidateConnectPaths();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync Stripe status.";
    return { ok: false, error: message };
  }
}

/** Open Stripe Express Dashboard (payouts / disputes) for the current shop. */
export async function openStripeExpressDashboard(): Promise<ConnectActionResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.financeAccount(shopId);
    if (denied) return { ok: false, error: denied.error };

    const res = await createExpressDashboardLoginLink(shopId);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open Express Dashboard.";
    return { ok: false, error: message };
  }
}

/** Stub disconnect — Express accounts are platform-managed. */
export async function requestStripeDisconnect(): Promise<DisconnectNoticeResult> {
  const shopId = await getShopId();
  const denied = await gates.financeAccount(shopId);
  if (denied) return { ok: false, error: denied.error };
  return { ok: true, message: getStripeDisconnectNotice() };
}
