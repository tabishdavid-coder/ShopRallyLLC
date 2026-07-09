"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { phoneDigitsKey } from "@/lib/phone";
import { diffPiiFieldNames } from "@/lib/data-compliance";
import { gates } from "@/server/permission-gates";
import {
  recordInitialCustomerConsents,
  syncCustomerConsentRecords,
} from "@/server/consent-records";
import { requireShopLegalCompliance } from "@/server/compliance-gates";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { sendShopEmail } from "@/server/services/shop-email";

const CreateCustomerInput = z.object({
  type: z.enum(["person", "business"]),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(160).optional(),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
  zip: z.string().trim().max(20).optional(),
  marketingOptIn: z.boolean().optional(),
  transactionalSmsConsent: z.boolean().optional(),
  marketingEmailConsent: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().max(40)).max(50).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerInput>;
export type CreateCustomerResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createCustomer(
  raw: CreateCustomerInput,
): Promise<CreateCustomerResult> {
  const parsed = CreateCustomerInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;

  // Required-field rules for the customer create/edit modal.
  if (data.type === "person" && (!data.firstName || !data.lastName)) {
    return { ok: false, error: "First and last name are required." };
  }
  if (data.type === "business" && !data.company) {
    return { ok: false, error: "Business name is required." };
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const legal = await requireShopLegalCompliance(shopId);
  if (legal) return legal;

  const consent = {
    transactionalSmsConsent: data.transactionalSmsConsent ?? false,
    marketingOptIn: data.marketingOptIn ?? false,
    marketingEmailConsent: data.marketingEmailConsent ?? false,
  };

  const customer = await prisma.customer.create({
    data: {
      shopId,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      company: data.company?.trim() || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      marketingOptIn: consent.marketingOptIn,
      transactionalSmsConsent: consent.transactionalSmsConsent,
      marketingEmailConsent: consent.marketingEmailConsent,
      notes: data.notes || null,
      tags: data.tags?.filter(Boolean) ?? [],
      phoneDigits: phoneDigitsKey(data.phone),
    },
    select: { id: true, firstName: true, lastName: true },
  });

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.CUSTOMER_CREATED,
    summary: `Created customer ${customer.firstName} ${customer.lastName}`.trim(),
    metadata: { customerId: customer.id },
  });

  if (
    consent.transactionalSmsConsent ||
    consent.marketingOptIn ||
    consent.marketingEmailConsent
  ) {
    await recordInitialCustomerConsents(shopId, customer.id, consent, "customer_dialog");
  }

  revalidatePath("/customers");
  return { ok: true, id: customer.id };
}

const UpdateCustomerInput = CreateCustomerInput.extend({
  id: z.string().min(1),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInput>;
export type UpdateCustomerResult = CreateCustomerResult;

/** Update an existing customer from the RO sidebar or detail page. */
export async function updateCustomer(
  raw: UpdateCustomerInput,
): Promise<UpdateCustomerResult> {
  const parsed = UpdateCustomerInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;

  if (data.type === "person" && (!data.firstName || !data.lastName)) {
    return { ok: false, error: "First and last name are required." };
  }
  if (data.type === "business" && !data.company) {
    return { ok: false, error: "Business name is required." };
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const existing = await prisma.customer.findFirst({
    where: { id: data.id, shopId },
  });
  if (!existing) return { ok: false, error: "Customer not found." };
  if (existing.deletedAt || existing.anonymizedAt) {
    return { ok: false, error: "This customer profile has been removed." };
  }

  const consent = {
    transactionalSmsConsent: data.transactionalSmsConsent ?? existing.transactionalSmsConsent,
    marketingOptIn: data.marketingOptIn ?? existing.marketingOptIn,
    marketingEmailConsent: data.marketingEmailConsent ?? existing.marketingEmailConsent,
  };

  const updated = await prisma.customer.updateMany({
    where: { id: data.id, shopId },
    data: {
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      company: data.company?.trim() || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      marketingOptIn: consent.marketingOptIn,
      transactionalSmsConsent: consent.transactionalSmsConsent,
      marketingEmailConsent: consent.marketingEmailConsent,
      notes: data.notes || null,
      tags: data.tags?.filter(Boolean) ?? [],
      phoneDigits: phoneDigitsKey(data.phone),
    },
  });
  if (updated.count === 0) return { ok: false, error: "Customer not found." };

  await syncCustomerConsentRecords(
    shopId,
    data.id,
    {
      transactionalSmsConsent: existing.transactionalSmsConsent,
      marketingOptIn: existing.marketingOptIn,
      marketingEmailConsent: existing.marketingEmailConsent,
    },
    consent,
    "customer_dialog",
  );

  const after = {
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    company: data.company?.trim() || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zip: data.zip || null,
    notes: data.notes || null,
    marketingOptIn: data.marketingOptIn ?? false,
  };
  const changedFields = diffPiiFieldNames(existing as Record<string, unknown>, after);

  if (changedFields.length > 0) {
    await recordShopAuditEventSafe({
      shopId,
      eventType: ShopAuditEventType.CUSTOMER_UPDATED,
      summary: `Updated customer profile (${changedFields.join(", ")})`,
      metadata: { customerId: data.id, changedFields },
    });
  }

  if (existing.marketingOptIn !== (data.marketingOptIn ?? false)) {
    await recordShopAuditEventSafe({
      shopId,
      eventType: ShopAuditEventType.MARKETING_OPT_IN_CHANGED,
      summary: data.marketingOptIn
        ? "Customer opted in to marketing"
        : "Customer opted out of marketing",
      metadata: { customerId: data.id, marketingOptIn: data.marketingOptIn ?? false },
    });
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${data.id}`);
  revalidatePath("/repair-orders");
  return { ok: true, id: data.id };
}

const SendCustomerEmailInput = z.object({
  customerId: z.string().min(1),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
});

export type SendCustomerEmailResult =
  | { ok: true; mode: "live" | "mock" | "fallback"; fallbackUrl?: string }
  | { ok: false; error: string };

/** Send a one-off email to a customer from the shop's configured from address. */
export async function sendCustomerEmail(
  raw: z.infer<typeof SendCustomerEmailInput>,
): Promise<SendCustomerEmailResult> {
  const parsed = SendCustomerEmailInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, shopId },
    select: { email: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!customer.email?.trim()) {
    return { ok: false, error: "This customer has no email on file." };
  }

  try {
    const res = await sendShopEmail({
      shopId,
      to: customer.email.trim(),
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    if (res.mode === "live") return { ok: true, mode: "live" };
    if (res.mode === "fallback") {
      return { ok: true, mode: "fallback", fallbackUrl: res.fallbackUrl };
    }
    return { ok: true, mode: "mock", fallbackUrl: res.fallbackUrl };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not send email.",
    };
  }
}

const BulkTagCustomersInput = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(200),
  tag: z.string().trim().min(1).max(40),
});

export type BulkTagCustomersResult = { ok: true; count: number } | { ok: false; error: string };

/** Add a tag to multiple customers (merges with existing tags). */
export async function bulkTagCustomers(
  raw: z.infer<typeof BulkTagCustomersInput>,
): Promise<BulkTagCustomersResult> {
  const parsed = BulkTagCustomersInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid tag selection." };

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const tag = parsed.data.tag.trim();
  const customers = await prisma.customer.findMany({
    where: { shopId, id: { in: parsed.data.customerIds } },
    select: { id: true, tags: true },
  });
  if (customers.length === 0) return { ok: false, error: "No customers found." };

  await prisma.$transaction(
    customers.map((c) =>
      prisma.customer.update({
        where: { id: c.id },
        data: { tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag] },
      }),
    ),
  );

  revalidatePath("/customers");
  return { ok: true, count: customers.length };
}

const BulkUpdateCustomersInput = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(200),
  marketingOptIn: z.boolean().optional(),
  leadSource: z.string().trim().max(60).nullable().optional(),
});

export type BulkUpdateCustomersResult = BulkTagCustomersResult;

/** Bulk-update marketing opt-in and/or lead source for selected customers. */
export async function bulkUpdateCustomers(
  raw: z.infer<typeof BulkUpdateCustomersInput>,
): Promise<BulkUpdateCustomersResult> {
  const parsed = BulkUpdateCustomersInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid bulk edit." };

  const { customerIds, marketingOptIn, leadSource } = parsed.data;
  if (marketingOptIn === undefined && leadSource === undefined) {
    return { ok: false, error: "Choose at least one field to update." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const data: { marketingOptIn?: boolean; leadSource?: string | null } = {};
  if (marketingOptIn !== undefined) data.marketingOptIn = marketingOptIn;
  if (leadSource !== undefined) data.leadSource = leadSource?.trim() || null;

  const updated = await prisma.customer.updateMany({
    where: { shopId, id: { in: customerIds } },
    data,
  });
  if (updated.count === 0) return { ok: false, error: "No customers found." };

  revalidatePath("/customers");
  return { ok: true, count: updated.count };
}
