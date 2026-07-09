/** Data governance constants for ShopRally CRM (not legal advice). */

import { Prisma } from "@/generated/prisma";

export const DATA_TIERS = {
  PUBLIC: "T0",
  PII: "T1",
  VEHICLE_ID: "T2",
  FINANCIAL: "T3",
  CARDHOLDER: "T4",
  COMMS: "T5",
  CONSENT: "T6",
  AUDIT: "T7",
  AI_CACHE: "T8",
} as const;

export const DEFAULT_RETENTION_DAYS = {
  roClosed: 2555,
  audit: 2555,
  messages: 1095,
  consent: 1460,
  publicToken: 90,
  anonymizeGrace: 30,
} as const;

export const PII_FIELDS = [
  "firstName",
  "lastName",
  "company",
  "email",
  "phone",
  "altPhone",
  "address",
  "city",
  "state",
  "zip",
  "notes",
] as const;

export const FORBIDDEN_LOG_FIELDS = [
  "pan",
  "cardNumber",
  "card_number",
  "cvv",
  "cvc",
  "trackData",
  "track_data",
  "magstripe",
] as const;

export const CONSENT_DISCLOSURE_VERSION = "2026-07-v1";

/** Disclosure language shown beside consent checkboxes (TCPA / CAN-SPAM). */
export const CONSENT_COPY = {
  transactionalSms:
    "Receive service-related texts (appointment reminders, repair status). Message and data rates may apply. Reply STOP to opt out.",
  marketingSms:
    "Receive promotional texts (offers, reminders). Consent is not required for service. Reply STOP to opt out.",
  marketingEmail: "Receive promotional emails. Unsubscribe anytime.",
} as const;

/** Short checkbox labels; full disclosure in tooltip / title. */
export const CONSENT_SHORT_LABELS = {
  transactionalSms: "Service texts",
  marketingSms: "Promo texts",
  marketingEmail: "Promo emails",
} as const;

export const CONSENT_PURPOSES = {
  TRANSACTIONAL_SMS: "transactional_sms",
  MARKETING_SMS: "marketing_sms",
  MARKETING_EMAIL: "marketing_email",
} as const;

export type ConsentCustomer = {
  phone?: string | null;
  email?: string | null;
  marketingOptIn?: boolean;
  transactionalSmsConsent?: boolean;
  marketingEmailConsent?: boolean;
  deletedAt?: Date | null;
  anonymizedAt?: Date | null;
};

export type ConsentShop = {
  smsEnabled?: boolean;
};

export function canSendTransactionalSms(
  customer: ConsentCustomer,
  _shop?: ConsentShop,
): boolean {
  if (customer.deletedAt || customer.anonymizedAt) return false;
  if (!customer.phone?.trim()) return false;
  return customer.transactionalSmsConsent === true;
}

export function canSendMarketingSms(
  customer: ConsentCustomer,
  _shop?: ConsentShop,
): boolean {
  if (!canSendTransactionalSms(customer) && !customer.phone?.trim()) return false;
  if (customer.deletedAt || customer.anonymizedAt) return false;
  return customer.marketingOptIn === true;
}

export function canSendMarketingEmail(customer: ConsentCustomer): boolean {
  if (customer.deletedAt || customer.anonymizedAt) return false;
  if (!customer.email?.trim()) return false;
  return customer.marketingEmailConsent === true || customer.marketingOptIn === true;
}

/** Prisma filter — active profiles only (not scheduled for removal or anonymized). */
export function activeCustomerWhere(shopId: string) {
  return {
    shopId,
    deletedAt: null,
    anonymizedAt: null,
  } as const;
}

/** PII fields cleared when a soft-deleted customer passes the grace period. */
export function buildCustomerAnonymizationData(now = new Date()) {
  return {
    firstName: "Removed",
    lastName: "Customer",
    company: null,
    email: null,
    phone: null,
    altPhone: null,
    phoneDigits: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    notes: null,
    tags: [] as string[],
    marketingOptIn: false,
    transactionalSmsConsent: false,
    marketingEmailConsent: false,
    aiInsightsCache: Prisma.JsonNull,
    anonymizedAt: now,
  };
}

const FORBIDDEN_KEY_RE =
  /(?:^|_)(pan|cvv|cvc|cardNumber|card_number|trackData|track_data|magstripe)(?:$|_)/i;

/** Strip sensitive payment fields before persisting audit metadata. */
export function redactAuditMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEY_RE.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactAuditMetadata(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Field names changed on a customer record (values omitted for PII safety). */
export function diffPiiFieldNames(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const field of PII_FIELDS) {
    if (before[field] !== after[field]) changed.push(field);
  }
  return changed;
}
