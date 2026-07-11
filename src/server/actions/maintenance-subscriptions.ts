"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { resolvePlanPricing } from "@/lib/maintenance-programs";
import { phoneDigitsKey, formatPhoneInput } from "@/lib/phone";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { getShopByPlansSlug } from "@/server/maintenance-programs";
import {
  completeServiceVisit,
  getSubscriptionServiceProfile,
  startServiceVisit,
  voidServiceVisit,
} from "@/server/maintenance-service-visits";
import {
  createPendingPlanSubscription,
  enrollSubscription,
  findActiveSubscriptionsForVehicle,
  getEnrolledVehicle,
  getRoMaintenancePanelData,
  getSubscriptionByPortalToken,
  getSubscriptionDetail,
  listSubscribers,
  lookupSubscriptionByPhoneOrPlate,
  redeemSubscriptionServices,
} from "@/server/maintenance-subscriptions";
import { checkVehicleGate } from "@/lib/maintenance-gatekeeper";
import { publicUrl } from "@/lib/app-url";
import { SMS_ENABLED } from "@/lib/features";
import { normalizePhoneE164 } from "@/lib/phone";
import { createMaintenancePlanCheckoutSession } from "@/server/services/stripe-maintenance";
import { getCheckoutStripeContext } from "@/server/services/stripe-connect";
import { isStripeEnabled } from "@/lib/stripe";
import { getMarketingMaintenancePrograms } from "@/server/maintenance-programs";
import { getShopEmailStatus, sendShopEmail } from "@/server/services/shop-email";
import {
  assertShopSmsReady,
  getShopSmsStatus,
  recordOutboundMessage,
  sendShopSms,
} from "@/server/services/messaging";
import { appendOptOutFooter, getSms } from "@/server/services/sms";
import { gates } from "@/server/permission-gates";
import type { MaintenanceVehicleClass, SubscriptionPaymentMode } from "@/generated/prisma";

export type MaintenanceSubResult =
  | {
      ok: true;
      subscriptionId?: string;
      memberToken?: string;
      redemptionId?: string;
      checkoutUrl?: string;
    }
  | { ok: false; error: string };

const PublicSignupSchema = z.object({
  shopSlug: z.string().min(1),
  planId: z.string().min(1),
  paymentOption: z.enum(["pay_in_full", "monthly", "annual"]),
  vehicleClass: z
    .enum(["CAR", "SUV_TRUCK", "HEAVY_DUTY", "EV", "LUXURY", "OTHER"])
    .optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(10),
  email: z.string().trim().email().optional().or(z.literal("")),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().trim().min(1),
  vehicleModel: z.string().trim().min(1),
  vehicleVin: z.string().optional(),
  vehiclePlate: z.string().optional(),
  termsAccepted: z.literal(true),
});

const StaffEnrollSchema = z.object({
  planId: z.string().min(1),
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  paymentMode: z.enum(["PAY_IN_FULL", "MONTHLY", "ANNUAL", "MANUAL"]),
  vehicleClass: z
    .enum(["CAR", "SUV_TRUCK", "HEAVY_DUTY", "EV", "LUXURY", "OTHER"])
    .optional(),
});

const RedeemSchema = z.object({
  subscriptionId: z.string().min(1),
  subscriptionEntitlementIds: z.array(z.string()).min(1),
  vehicleId: z.string().optional(),
  repairOrderId: z.string().optional(),
  mileageIn: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  performedByName: z.string().optional(),
  gatekeeperPlate: z.string().optional(),
  gatekeeperVinLast6: z.string().optional(),
  gatekeeperConfirm: z.boolean().optional(),
});

const CompleteVisitSchema = z.object({
  visitId: z.string().min(1),
  subscriptionEntitlementIds: z.array(z.string()).min(1),
  notes: z.string().optional(),
  performedByName: z.string().optional(),
  mileageIn: z.number().int().min(0).optional(),
  gatekeeperPlate: z.string().optional(),
  gatekeeperVinLast6: z.string().optional(),
  gatekeeperConfirm: z.boolean().optional(),
});

const GatekeeperVerifySchema = z.object({
  subscriptionId: z.string().min(1),
  plate: z.string().optional(),
  vinLast6: z.string().optional(),
  confirmCheckbox: z.boolean().optional(),
  visitId: z.string().optional(),
});

const VoidVisitSchema = z.object({
  visitId: z.string().min(1),
  reason: z.string().min(1),
});

function computeAmountCents(
  plan: {
    payInFullCents: number | null;
    monthlyCents: number | null;
    annualCents: number | null;
    useClassPricing: boolean;
    classPrices: {
      vehicleClass: MaintenanceVehicleClass;
      payInFullCents: number | null;
      monthlyCents: number | null;
      annualCents: number | null;
      surchargeCents: number | null;
    }[];
  },
  paymentOption: "pay_in_full" | "monthly" | "annual",
  vehicleClass?: MaintenanceVehicleClass,
): number {
  const p = resolvePlanPricing(plan, vehicleClass ?? null);
  if (paymentOption === "pay_in_full") return p.payInFullCents ?? 0;
  if (paymentOption === "monthly") return p.monthlyCents ?? 0;
  return p.annualCents ?? p.payInFullCents ?? 0;
}

function paymentModeFromOption(opt: string): SubscriptionPaymentMode {
  if (opt === "monthly") return "MONTHLY";
  if (opt === "annual") return "ANNUAL";
  return "PAY_IN_FULL";
}

/** Public customer signup — Stripe Checkout when Connect is ready, mock fallback in dev. */
export async function submitPublicPlanSignup(
  input: z.infer<typeof PublicSignupSchema>,
): Promise<MaintenanceSubResult> {
  const parsed = PublicSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid signup." };
  }

  const shopData = await getShopByPlansSlug(parsed.data.shopSlug);
  if (!shopData?.settings.enabled) {
    return { ok: false, error: "Plans page is not available." };
  }

  const plan = shopData.plans.find((p) => p.id === parsed.data.planId);
  if (!plan) return { ok: false, error: "Plan not found." };

  const shopId = shopData.settings.shopId;
  const phone = formatPhoneInput(parsed.data.phone);
  const amountCents = computeAmountCents(
    plan,
    parsed.data.paymentOption,
    parsed.data.vehicleClass,
  );
  if (amountCents <= 0) {
    return { ok: false, error: "This plan has no price configured for that payment option." };
  }

  let customer = await prisma.customer.findFirst({
    where: { shopId, phone },
    select: { id: true },
  });

  if (!customer) {
    const created = await prisma.customer.create({
      data: {
        shopId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        phoneDigits: phoneDigitsKey(phone),
        email: parsed.data.email?.trim() || null,
        marketingOptIn: true,
        leadSource: "Maintenance Plans",
      },
      select: { id: true },
    });
    customer = created;
  }

  const year = parsed.data.vehicleYear ? parseInt(parsed.data.vehicleYear, 10) : null;
  const vehicle = await prisma.vehicle.create({
    data: {
      shopId,
      customerId: customer.id,
      year: Number.isFinite(year!) ? year : null,
      make: parsed.data.vehicleMake,
      model: parsed.data.vehicleModel,
      vin: parsed.data.vehicleVin?.trim() || null,
      plate: parsed.data.vehiclePlate?.trim() || null,
    },
    select: { id: true },
  });

  try {
    const paymentMode = paymentModeFromOption(parsed.data.paymentOption);
    const mockAllowed =
      process.env.MAINTENANCE_MOCK_PAYMENTS === "true" ||
      process.env.NODE_ENV === "development";

    const checkoutCtx =
      isStripeEnabled() ? await getCheckoutStripeContext(shopId) : null;
    const useStripe = checkoutCtx?.canCheckout === true;

    if (useStripe) {
      const pending = await createPendingPlanSubscription({
        shopId,
        planId: plan.id,
        customerId: customer.id,
        vehicleIds: [vehicle.id],
        paymentMode,
        vehicleClass: parsed.data.vehicleClass ?? null,
      });

      const vehicleLabel = [
        parsed.data.vehicleYear,
        parsed.data.vehicleMake,
        parsed.data.vehicleModel,
      ]
        .filter(Boolean)
        .join(" ");

      const checkout = await createMaintenancePlanCheckoutSession({
        subscriptionId: pending.id,
        shopId,
        shopSlug: parsed.data.shopSlug,
        planName: plan.name,
        vehicleLabel,
        customerEmail: parsed.data.email?.trim() || null,
        paymentMode,
        amountCents,
        monthlyTermMonths: plan.monthlyTermMonths,
      });

      if (checkout.ok) {
        revalidatePath(`/plans/${parsed.data.shopSlug}`);
        return { ok: true, subscriptionId: pending.id, checkoutUrl: checkout.url };
      }

      await prisma.planSubscription.delete({ where: { id: pending.id } }).catch(() => {});

      if (!mockAllowed) {
        return { ok: false, error: checkout.error };
      }
    } else if (!mockAllowed) {
      return {
        ok: false,
        error: "Online payment is not available. Please call the shop to enroll.",
      };
    }

    const sub = await enrollSubscription({
      shopId,
      planId: plan.id,
      customerId: customer.id,
      vehicleIds: [vehicle.id],
      paymentMode,
      vehicleClass: parsed.data.vehicleClass ?? null,
      amountCents,
      paymentSource: "mock",
    });

    revalidatePath(`/plans/${parsed.data.shopSlug}`);
    return { ok: true, subscriptionId: sub.id, memberToken: sub.memberPortalToken };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enrollment failed." };
  }
}

export async function enrollSubscriberInShop(
  input: z.infer<typeof StaffEnrollSchema>,
): Promise<MaintenanceSubResult> {
  const parsed = StaffEnrollSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const allowed = await canUseReleasedFeature(shopId, "maintenance_programs");
  if (!allowed) return { ok: false, error: "Upgrade to Professional to enroll subscribers." };

  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: parsed.data.planId, shopId, active: true },
    include: { classPrices: true },
  });
  if (!plan) return { ok: false, error: "Plan not found." };

  const mode = parsed.data.paymentMode;
  const amountCents =
    mode === "MONTHLY"
      ? (resolvePlanPricing(plan, parsed.data.vehicleClass ?? null).monthlyCents ?? 0)
      : mode === "ANNUAL"
        ? (resolvePlanPricing(plan, parsed.data.vehicleClass ?? null).annualCents ??
          plan.payInFullCents ??
          0)
        : (resolvePlanPricing(plan, parsed.data.vehicleClass ?? null).payInFullCents ?? 0);

  try {
    const sub = await enrollSubscription({
      shopId,
      planId: plan.id,
      customerId: parsed.data.customerId,
      vehicleIds: [parsed.data.vehicleId],
      paymentMode: mode,
      vehicleClass: parsed.data.vehicleClass ?? null,
      amountCents: mode === "MANUAL" ? 0 : amountCents,
      paymentSource: mode === "MANUAL" ? "manual" : "mock",
    });

    revalidatePath("/maintenance-programs/subscribers");
    revalidatePath(`/maintenance-programs/subscribers/${sub.id}`);
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, subscriptionId: sub.id, memberToken: sub.memberPortalToken };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enrollment failed." };
  }
}

export type PlansShareContext = {
  plansUrl: string;
  shopName: string;
  slug: string;
};

/** Public maintenance plans URL for the current shop (copy / share flows). */
export async function getShopPlansShareContext(): Promise<PlansShareContext | null> {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return null;
  const data = await getMarketingMaintenancePrograms(shopId);
  if (!data) return null;
  const slug = data.settings.plansSlug ?? data.slug;
  return {
    plansUrl: publicUrl(`/plans/${slug}`),
    shopName: data.shop.name,
    slug,
  };
}

export type SharePlansChannel = "email" | "sms" | "both";

/** @deprecated Use SharePlansChannel — kept for dialog method tabs. */
export type SharePlansMethod = "SMS" | "EMAIL";

export type PlansChannelSendResult = {
  channel: "email" | "sms";
  mode: "live" | "mock" | "fallback";
  fallbackUrl?: string;
  error?: string;
};

export type SharePlansResult =
  | { ok: true; channelResults: PlansChannelSendResult[] }
  | { ok: false; error: string; channelResults?: PlansChannelSendResult[] };

export type PlansShareSendStatus = {
  emailLive: boolean;
  smsEnabled: boolean;
  smsConfigured: boolean;
  smsLive: boolean;
};

function plansMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function plansSmsUrl(to: string, body: string): string {
  return `sms:${normalizePhoneE164(to)}?&body=${encodeURIComponent(body)}`;
}

function buildPlansShareMessage(
  firstName: string | null | undefined,
  shopName: string,
  plansUrl: string,
  custom?: string,
): string {
  if (custom?.trim()) return custom.trim();
  const greeting = firstName?.trim() || "there";
  return [
    `Hello ${greeting},`,
    "",
    `${shopName} invites you to explore our maintenance plans and sign up online.`,
    "",
    `View our maintenance plans: ${plansUrl}`,
  ].join("\n");
}

function plansShareSubject(shopName: string): string {
  return `Maintenance plans — ${shopName}`;
}

/** Whether email/SMS are live or mock for the share dialog warnings. */
export async function getPlansShareSendStatus(): Promise<PlansShareSendStatus> {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) throw new Error(blocked.error);
  const smsStatus = await getShopSmsStatus(shopId);
  const smsConfigured =
    Boolean(smsStatus?.smsEnabled && smsStatus.twilioPhoneNumber?.trim()) ||
    Boolean(smsStatus?.smsEnabled && smsStatus.twilioMessagingServiceSid?.trim());

  let smsLive = false;
  if (smsConfigured && smsStatus) {
    try {
      assertShopSmsReady(smsStatus);
      const provider = getSms({
        twilioPhoneNumber: smsStatus.twilioPhoneNumber,
        twilioMessagingServiceSid: smsStatus.twilioMessagingServiceSid,
      });
      smsLive = provider.mode === "live";
    } catch {
      smsLive = false;
    }
  }

  const emailStatus = await getShopEmailStatus(shopId);

  return {
    emailLive: emailStatus.live,
    smsEnabled: SMS_ENABLED,
    smsConfigured,
    smsLive,
  };
}

async function resolvePlansShareCustomer(
  shopId: string,
  customerId: string | undefined,
  email: string | undefined,
  phone: string | undefined,
) {
  if (customerId?.trim()) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId.trim(), shopId },
      select: { id: true, firstName: true, email: true, phone: true },
    });
    if (customer) return customer;
  }

  const emailTrim = email?.trim();
  const phoneKey = phone?.replace(/\D/g, "").slice(-10);

  if (emailTrim || phoneKey) {
    const found = await prisma.customer.findFirst({
      where: {
        shopId,
        OR: [
          ...(emailTrim ? [{ email: { equals: emailTrim, mode: "insensitive" as const } }] : []),
          ...(phoneKey && phoneKey.length >= 10
            ? [{ phone: { contains: phoneKey } }, { phoneDigits: { contains: phoneKey } }]
            : []),
        ],
      },
      select: { id: true, firstName: true, email: true, phone: true },
    });
    if (found) return found;
  }

  return null;
}

async function sendPlansShareEmail(opts: {
  shopId: string;
  customerId: string | null;
  to: string;
  subject: string;
  body: string;
}): Promise<PlansChannelSendResult> {
  try {
    const res = await sendShopEmail({
      shopId: opts.shopId,
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
    });

    if (opts.customerId) {
      await recordOutboundMessage({
        shopId: opts.shopId,
        customerId: opts.customerId,
        body: `[email → ${opts.to}] ${opts.body}`,
        status: res.status,
      }).catch(() => {});
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[plans share] email sent (${res.mode}) → ${opts.to}`);
    }

    if (res.mode === "live") {
      return { channel: "email", mode: "live" };
    }
    if (res.mode === "mock") {
      return {
        channel: "email",
        mode: "mock",
        fallbackUrl: res.fallbackUrl ?? plansMailtoUrl(opts.to, opts.subject, opts.body),
      };
    }
    return {
      channel: "email",
      mode: "fallback",
      fallbackUrl: res.fallbackUrl ?? plansMailtoUrl(opts.to, opts.subject, opts.body),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Email send failed.";
    if (opts.customerId) {
      await recordOutboundMessage({
        shopId: opts.shopId,
        customerId: opts.customerId,
        body: `[email → ${opts.to}] ${opts.body}`,
        status: "failed",
      }).catch(() => {});
    }
    return { channel: "email", mode: "live", error: msg };
  }
}

async function sendPlansShareSms(opts: {
  shopId: string;
  customerId: string;
  to: string;
  body: string;
}): Promise<PlansChannelSendResult> {
  try {
    const res = await sendShopSms(opts.shopId, opts.to, opts.body, {
      customerId: opts.customerId,
    });
    if (process.env.NODE_ENV === "development") {
      console.log(`[plans share] SMS sent (${res.mode}) → ${opts.to}`);
    }
    if (res.mode === "live") {
      return { channel: "sms", mode: "live" };
    }
    const shop = await prisma.shop.findFirst({
      where: { id: opts.shopId },
      select: { smsOptOutFooter: true },
    });
    const smsBody = appendOptOutFooter(opts.body, shop?.smsOptOutFooter);
    return {
      channel: "sms",
      mode: "mock",
      fallbackUrl: plansSmsUrl(opts.to, smsBody),
    };
  } catch (e) {
    const shop = await prisma.shop.findFirst({
      where: { id: opts.shopId },
      select: {
        smsEnabled: true,
        twilioPhoneNumber: true,
        twilioMessagingServiceSid: true,
        smsOptOutFooter: true,
      },
    });
    const smsBody = appendOptOutFooter(opts.body, shop?.smsOptOutFooter);
    const notConfigured =
      e instanceof Error &&
      (e.message.includes("not configured") || e.message.includes("disabled"));

    if (notConfigured || !shop?.smsEnabled) {
      try {
        const mock = getSms(null);
        const res = await mock.send(opts.to, smsBody);
        await recordOutboundMessage({
          shopId: opts.shopId,
          customerId: opts.customerId,
          body: smsBody,
          status: res.status,
          twilioSid: res.sid,
        }).catch(() => {});
      } catch {
        await recordOutboundMessage({
          shopId: opts.shopId,
          customerId: opts.customerId,
          body: smsBody,
          status: "failed",
        }).catch(() => {});
      }
      if (process.env.NODE_ENV === "development") {
        console.log(`[plans share] SMS mock (shop SMS not configured) → ${opts.to}`);
      }
      return {
        channel: "sms",
        mode: "mock",
        fallbackUrl: plansSmsUrl(opts.to, smsBody),
      };
    }

    const msg = e instanceof Error ? e.message : "Text send failed.";
    return { channel: "sms", mode: "live", error: msg };
  }
}

/** Send the public plans signup link to a customer via email and/or SMS. */
export async function sharePlansSignupLink(input: {
  customerId?: string;
  email?: string;
  phone?: string;
  channel: SharePlansChannel;
  message?: string;
}): Promise<SharePlansResult> {
  const ctx = await getShopPlansShareContext();
  if (!ctx) return { ok: false, error: "Plans page is not configured." };

  const wantsEmail = input.channel === "email" || input.channel === "both";
  const wantsSms = input.channel === "sms" || input.channel === "both";

  if (wantsSms && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;
  const customer = await resolvePlansShareCustomer(
    shopId,
    input.customerId,
    input.email,
    input.phone,
  );

  const emailTo = (input.email?.trim() || customer?.email?.trim() || "").trim();
  const phoneTo = (input.phone?.trim() || customer?.phone?.trim() || "").trim();

  if (wantsEmail && !emailTo) {
    return {
      ok: false,
      error: customer
        ? "This customer has no email on file. Enter an email address."
        : "Enter an email address.",
    };
  }
  if (wantsEmail && !emailTo.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (wantsSms && !phoneTo) {
    return {
      ok: false,
      error: customer
        ? "This customer has no phone number on file. Enter a phone number."
        : "Enter a phone number.",
    };
  }
  if (wantsSms && phoneTo.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  if (wantsSms && !customer?.id) {
    return {
      ok: false,
      error: "Select a customer to send a text — SMS requires a customer record.",
    };
  }

  const body = buildPlansShareMessage(
    customer?.firstName,
    ctx.shopName,
    ctx.plansUrl,
    input.message,
  );
  const subject = plansShareSubject(ctx.shopName);
  const customerId = customer?.id ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[plans share] channel=${input.channel} customer=${customerId ?? "none"} email=${emailTo || "—"} phone=${phoneTo || "—"}`,
    );
  }

  const channelResults: PlansChannelSendResult[] = [];

  if (wantsEmail) {
    channelResults.push(
      await sendPlansShareEmail({
        shopId,
        customerId,
        to: emailTo,
        subject,
        body,
      }),
    );
  }

  if (wantsSms && customerId) {
    channelResults.push(
      await sendPlansShareSms({
        shopId,
        customerId,
        to: phoneTo,
        body,
      }),
    );
  }

  const failures = channelResults.filter((r) => r.error);
  if (failures.length === channelResults.length) {
    return {
      ok: false,
      error: failures.map((f) => f.error).join(" "),
      channelResults,
    };
  }

  return { ok: true, channelResults };
}

export async function cancelPlanSubscription(subscriptionId: string): Promise<MaintenanceSubResult> {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const allowed = await canUseReleasedFeature(shopId, "maintenance_programs");
  if (!allowed) return { ok: false, error: "Upgrade to Professional to manage subscribers." };

  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    select: { id: true, status: true },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };
  if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
    return { ok: false, error: "Subscription is already ended." };
  }

  const updated = await prisma.planSubscription.updateMany({
    where: { id: subscriptionId, shopId },
    data: { status: "CANCELLED", cancelledAt: new Date(), autoRenew: false },
  });
  if (updated.count === 0) return { ok: false, error: "Subscription not found." };

  revalidatePath("/maintenance-programs/subscribers");
  revalidatePath(`/maintenance-programs/subscribers/${subscriptionId}`);
  revalidatePath("/marketing/maintenance-programs");
  return { ok: true, subscriptionId };
}

function staffDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Staff";
}

function revalidateVisitPaths(subscriptionId: string, repairOrderId?: string | null) {
  revalidatePath("/maintenance-programs/subscribers");
  revalidatePath(`/maintenance-programs/subscribers/${subscriptionId}`);
  revalidatePath("/maintenance-programs/redeem");
  revalidatePath("/maintenance-programs/visit");
  revalidatePath("/customers", "layout");
  if (repairOrderId) revalidatePath(`/repair-orders/${repairOrderId}`);
}

async function requireStaffAccess(shopId: string): Promise<{ ok: false; error: string } | null> {
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  return null;
}

export async function redeemMaintenanceServices(
  input: z.infer<typeof RedeemSchema>,
): Promise<MaintenanceSubResult> {
  const parsed = RedeemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid redemption." };
  }

  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const user = await getCurrentUser();

  try {
    const redemption = await redeemSubscriptionServices({
      shopId,
      subscriptionId: parsed.data.subscriptionId,
      subscriptionEntitlementIds: parsed.data.subscriptionEntitlementIds,
      vehicleId: parsed.data.vehicleId,
      repairOrderId: parsed.data.repairOrderId,
      mileageIn: parsed.data.mileageIn,
      notes: parsed.data.notes,
      redeemedByUserId: user.id !== "stub-platform-admin" ? user.id : null,
      performedByName: parsed.data.performedByName ?? staffDisplayName(user),
      gatekeeper: {
        plate: parsed.data.gatekeeperPlate,
        vinLast6: parsed.data.gatekeeperVinLast6,
        confirmCheckbox: parsed.data.gatekeeperConfirm,
        vehicleId: parsed.data.vehicleId,
      },
    });

    revalidateVisitPaths(parsed.data.subscriptionId, parsed.data.repairOrderId);
    return { ok: true, redemptionId: redemption.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Redemption failed." };
  }
}

export async function startMaintenanceServiceVisit(input: {
  subscriptionId: string;
  vehicleId?: string;
  repairOrderId?: string;
  gatekeeperPlate?: string;
  gatekeeperVinLast6?: string;
  gatekeeperConfirm?: boolean;
}): Promise<MaintenanceSubResult> {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const user = await getCurrentUser();

  try {
    const visit = await startServiceVisit({
      shopId,
      subscriptionId: input.subscriptionId,
      vehicleId: input.vehicleId ?? null,
      repairOrderId: input.repairOrderId ?? null,
      performedByUserId: user.id !== "stub-platform-admin" ? user.id : null,
      performedByName: staffDisplayName(user),
      gatekeeper: {
        plate: input.gatekeeperPlate,
        vinLast6: input.gatekeeperVinLast6,
        confirmCheckbox: input.gatekeeperConfirm,
      },
    });
    return { ok: true, redemptionId: visit.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start visit." };
  }
}

export async function completeMaintenanceServiceVisit(
  input: z.infer<typeof CompleteVisitSchema>,
): Promise<MaintenanceSubResult> {
  const parsed = CompleteVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid visit." };
  }

  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const user = await getCurrentUser();

  try {
    const visit = await completeServiceVisit({
      shopId,
      visitId: parsed.data.visitId,
      subscriptionEntitlementIds: parsed.data.subscriptionEntitlementIds,
      notes: parsed.data.notes,
      performedByName: parsed.data.performedByName ?? staffDisplayName(user),
      performedByUserId: user.id !== "stub-platform-admin" ? user.id : null,
      mileageIn: parsed.data.mileageIn,
      gatekeeper: {
        plate: parsed.data.gatekeeperPlate,
        vinLast6: parsed.data.gatekeeperVinLast6,
        confirmCheckbox: parsed.data.gatekeeperConfirm,
      },
    });

    revalidateVisitPaths(visit.subscriptionId, visit.repairOrderId);
    return { ok: true, redemptionId: visit.id, subscriptionId: visit.subscriptionId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not complete visit." };
  }
}

export async function voidMaintenanceServiceVisit(
  input: z.infer<typeof VoidVisitSchema>,
): Promise<MaintenanceSubResult> {
  const parsed = VoidVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid void request." };
  }

  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;

  try {
    const visit = await voidServiceVisit({
      shopId,
      visitId: parsed.data.visitId,
      reason: parsed.data.reason,
    });

    revalidateVisitPaths(visit.subscriptionId, visit.repairOrderId);
    return { ok: true, redemptionId: visit.id, subscriptionId: visit.subscriptionId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not void visit." };
  }
}

export async function fetchSubscriptionServiceProfile(subscriptionId: string) {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return null;
  return getSubscriptionServiceProfile(shopId, subscriptionId);
}

export async function lookupMemberForRedeem(query: string) {
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return [];
  return lookupSubscriptionByPhoneOrPlate(shopId, query);
}

/** Alias for express visit lookup with vehicle gate metadata. */
export async function lookupMemberForVisit(query: string) {
  return lookupMemberForRedeem(query);
}

export type GatekeeperVerifyResult =
  | { ok: true; verified: true; visitId?: string }
  | { ok: false; error: string; blocked?: boolean };

export async function verifyVehicleGatekeeper(
  input: z.infer<typeof GatekeeperVerifySchema>,
): Promise<GatekeeperVerifyResult> {
  const parsed = GatekeeperVerifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid verification." };
  }

  const data = parsed.data;
  const shopId = await getShopId();
  const blocked = await requireStaffAccess(shopId);
  if (blocked) return blocked;
  const sub = await prisma.planSubscription.findFirst({
    where: { id: data.subscriptionId, shopId },
    include: { vehicles: { include: { vehicle: true } } },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };

  const enrolled = getEnrolledVehicle(sub);
  const hasPlate = Boolean(data.plate?.trim());
  const hasVin = Boolean(data.vinLast6?.trim());

  async function startVerifiedVisit() {
    const user = await getCurrentUser();
    const visit = await startServiceVisit({
      shopId,
      subscriptionId: data.subscriptionId,
      vehicleId: enrolled?.id ?? null,
      performedByUserId: user.id !== "stub-platform-admin" ? user.id : null,
      performedByName: staffDisplayName(user),
      gatekeeper: {
        plate: data.plate,
        vinLast6: data.vinLast6,
        confirmCheckbox: data.confirmCheckbox,
        vehicleId: enrolled?.id ?? null,
      },
    });
    return visit.id;
  }

  if (data.confirmCheckbox && !hasPlate && !hasVin) {
    return { ok: true, verified: true, visitId: await startVerifiedVisit() };
  }

  const gate = checkVehicleGate(enrolled, {
    plate: data.plate,
    vin: data.vinLast6,
    requireExplicitConfirm: !hasPlate && !hasVin,
  });

  const verified =
    gate.status === "verified" ||
    (data.confirmCheckbox && gate.status === "confirm_required");

  if (gate.status === "blocked" && !data.confirmCheckbox) {
    return { ok: false, error: gate.message ?? "Vehicle mismatch.", blocked: true };
  }

  if (!verified) {
    return { ok: false, error: "Confirm the enrolled vehicle or enter a matching plate." };
  }

  if (data.visitId) {
    await prisma.planRedemption.updateMany({
      where: {
        id: data.visitId,
        shopId,
        subscriptionId: data.subscriptionId,
        status: "IN_PROGRESS",
      },
      data: {
        gatekeeperVerified: true,
        gatekeeperVerifiedAt: new Date(),
        gatekeeperPlate: data.plate?.trim().toUpperCase() ?? enrolled?.plate?.trim().toUpperCase() ?? null,
        gatekeeperVinLast6: data.vinLast6?.trim().toUpperCase() ?? null,
        gatekeeperMismatch: false,
      },
    });
    return { ok: true, verified: true, visitId: data.visitId };
  }

  return { ok: true, verified: true, visitId: await startVerifiedVisit() };
}

export async function getRoMaintenanceContext(
  shopId: string,
  vehicleId: string,
  customerId?: string,
) {
  const callerShopId = await getShopId();
  if (callerShopId !== shopId) return null;
  const denied = await gates.estimateView(shopId);
  if (denied) return null;
  return getRoMaintenancePanelData(shopId, vehicleId, customerId);
}

export {
  listSubscribers,
  getSubscriptionDetail,
  getSubscriptionByPortalToken,
  getRoMaintenancePanelData,
};
