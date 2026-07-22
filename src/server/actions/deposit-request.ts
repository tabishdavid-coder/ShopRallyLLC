"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import {
  DepositRequestStatus,
  PaymentMethod,
  ShopAuditEventType,
} from "@/generated/prisma";
import { SMS_ENABLED } from "@/lib/features";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { appUrl } from "@/lib/app-url";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { rateLimitAction } from "@/lib/rate-limit";
import { releasedFeatureDenied } from "@/lib/subscription";
import { requirePermission } from "@/server/permissions";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { mintDepositShareToken } from "@/server/deposit-request";
import { applyDepositTowardInvoice } from "@/server/services/deposit-payments";
import { createDepositCheckoutSession } from "@/server/services/stripe-deposit";
import { isStripeEnabled } from "@/lib/stripe";
import type { ShareResult, SendChannel } from "@/server/actions/share";

export type DepositActionResult = { ok: true } | { ok: false; error: string };

export type DepositLinkResult =
  | { ok: true; url: string; depositRequestId: string }
  | { ok: false; error: string };

export type DepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const CreateDepositInput = z.object({
  repairOrderId: z.string().min(1),
  amountCents: z.number().int().positive("Deposit must be greater than zero."),
  note: z.string().trim().max(500).optional().nullable(),
});

const RecordManualDepositInput = z.object({
  depositRequestId: z.string().min(1),
  method: z.enum(["CASH", "CHECK", "CARD", "OTHER"]),
  reference: z.string().trim().max(120).optional().nullable(),
});

function revalidateDepositPaths(repairOrderId: string) {
  for (const path of revalidateEstimatePaths(repairOrderId)) {
    revalidatePath(path);
  }
}

/** Create or refresh a pending deposit request for an estimate RO. */
export async function createDepositRequest(
  raw: z.input<typeof CreateDepositInput>,
): Promise<DepositLinkResult> {
  const parsed = CreateDepositInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid deposit." };
  }

  const shopId = await getShopId();
  const user = await getCurrentUser();
  const limited = rateLimitAction("create-deposit-request", user.id, 15, 60_000);
  if (!limited.ok) return { ok: false, error: "Too many requests. Try again shortly." };

  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const { repairOrderId, amountCents, note } = parsed.data;

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: { id: true, totalCents: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (amountCents > ro.totalCents && ro.totalCents > 0) {
    return { ok: false, error: "Deposit cannot exceed the estimate total." };
  }

  await prisma.depositRequest.updateMany({
    where: { shopId, repairOrderId, status: DepositRequestStatus.PENDING },
    data: { status: DepositRequestStatus.CANCELLED },
  });

  const shareToken = mintDepositShareToken();
  const dep = await prisma.depositRequest.create({
    data: {
      shopId,
      repairOrderId,
      amountCents,
      note: note?.trim() || null,
      shareToken,
    },
    select: { id: true, shareToken: true },
  });

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId,
    eventType: ShopAuditEventType.DEPOSIT_REQUEST_CREATED,
    summary: `Deposit request created (${formatUsd(amountCents)})`,
    metadata: { depositRequestId: dep.id, amountCents },
    actor: { userId: user.id, email: user.email },
  });

  revalidateDepositPaths(repairOrderId);

  return {
    ok: true,
    url: await appUrl(`/deposit/${dep.shareToken}`),
    depositRequestId: dep.id,
  };
}

/** Send deposit payment link via SMS or email (reuses share dispatch patterns). */
export async function sendDepositRequestLink(
  depositRequestId: string,
  channel: SendChannel,
): Promise<ShareResult> {
  if (channel === "sms" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  if (channel === "sms") {
    const planDenied = await releasedFeatureDenied(shopId, "sms");
    if (planDenied) {
      return {
        ok: false,
        error:
          planDenied === "This feature is not included in your plan."
            ? "Two-way SMS is not available on this shop's plan. Send the deposit link by email, or contact support."
            : planDenied,
      };
    }
  }

  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const dep = await prisma.depositRequest.findFirst({
    where: { id: depositRequestId, shopId, status: DepositRequestStatus.PENDING },
    select: {
      id: true,
      amountCents: true,
      note: true,
      shareToken: true,
      repairOrderId: true,
      repairOrder: {
        select: {
          number: true,
          customerId: true,
          customer: { select: { phone: true, email: true, firstName: true } },
          shop: { select: { name: true } },
        },
      },
    },
  });
  if (!dep) return { ok: false, error: "Deposit request not found or already paid." };

  const url = await appUrl(`/deposit/${dep.shareToken}`);
  const ro = dep.repairOrder;
  const greeting = ro.customer.firstName?.trim() || "there";
  const noteLine = dep.note?.trim() ? ` Note: ${dep.note.trim()}` : "";
  const body = `Hello ${greeting}, ${ro.shop.name} is requesting a ${formatUsd(dep.amountCents)} deposit for RO #${ro.number}.${noteLine} Pay securely here: ${url}`;

  const to =
    channel === "sms"
      ? (ro.customer.phone?.trim() ?? "")
      : (ro.customer.email?.trim() ?? "");

  if (!to) {
    return {
      ok: false,
      error:
        channel === "sms"
          ? "This customer has no phone number on file."
          : "This customer has no email on file.",
    };
  }

  const { dispatchCustomerShare } = await import("@/server/actions/share");
  const res = await dispatchCustomerShare({
    channel,
    to,
    subject: `Deposit request — ${ro.shop.name} RO #${ro.number}`,
    body,
    shopId,
    customerId: ro.customerId,
    repairOrderId: dep.repairOrderId,
  });

  if (res.ok) {
    await prisma.depositRequest.update({
      where: { id: dep.id },
      data: { sentAt: new Date() },
    });
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId: dep.repairOrderId,
      eventType: ShopAuditEventType.DEPOSIT_REQUEST_SENT,
      summary: `Deposit link sent via ${channel === "sms" ? "SMS" : "email"}`,
      metadata: { depositRequestId: dep.id, channel, amountCents: dep.amountCents },
    });
    revalidateDepositPaths(dep.repairOrderId);
  }

  return res;
}

/** Staff records in-shop deposit (cash, check, etc.) against a pending request. */
export async function recordManualDepositPayment(
  raw: z.input<typeof RecordManualDepositInput>,
): Promise<DepositActionResult> {
  const parsed = RecordManualDepositInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  const shopId = await getShopId();
  const user = await getCurrentUser();
  const limited = rateLimitAction("record-manual-deposit", user.id, 20, 60_000);
  if (!limited.ok) return { ok: false, error: "Too many payment attempts. Try again shortly." };

  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const dep = await prisma.depositRequest.findFirst({
    where: {
      id: parsed.data.depositRequestId,
      shopId,
      status: DepositRequestStatus.PENDING,
    },
    select: { id: true, repairOrderId: true, amountCents: true },
  });
  if (!dep) return { ok: false, error: "Deposit request not found or already paid." };

  const method = parsed.data.method as PaymentMethod;

  await prisma.depositRequest.update({
    where: { id: dep.id },
    data: {
      status: DepositRequestStatus.PAID,
      paidAt: new Date(),
      paidMethod: method,
    },
  });

  // Apply toward invoice so MoneyCard paid/due + Activity (PAYMENT_RECORDED) stay in sync.
  const applied = await applyDepositTowardInvoice({
    shopId,
    repairOrderId: dep.repairOrderId,
    amountCents: dep.amountCents,
    method,
    depositRequestId: dep.id,
    reference: parsed.data.reference ?? `Deposit ${dep.id}`,
    auditActor: { userId: user.id, email: user.email },
  });
  if (!applied.ok) {
    console.error("[deposit] apply toward invoice failed", dep.id, applied.error);
  }

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: dep.repairOrderId,
    eventType: ShopAuditEventType.DEPOSIT_PAID,
    summary: `Deposit recorded (${formatUsd(dep.amountCents)}, ${parsed.data.method})`,
    metadata: {
      depositRequestId: dep.id,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
    },
    actor: { userId: user.id, email: user.email },
  });

  revalidateDepositPaths(dep.repairOrderId);
  return { ok: true };
}

/** Public — start Stripe Checkout for a deposit share token. */
export async function startDepositCheckout(shareToken: string): Promise<DepositCheckoutResult> {
  const token = shareToken.trim();
  if (!token) return { ok: false, error: "Invalid deposit link." };
  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: "Online payments are not configured. Contact the shop to pay in person.",
    };
  }
  return createDepositCheckoutSession(token, { auditActor: null });
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
