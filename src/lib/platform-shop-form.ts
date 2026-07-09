import { z } from "zod";

import { BillingStatus, ShopPlan } from "@/generated/prisma";
import { shopTimezone } from "@/lib/shop-timezone";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
] as const;

/** Common US IANA time zones for shop onboarding selects. */
export const US_TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
] as const;

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const platformShopFormSchema = z.object({
  name: z.string().trim().min(1, "Shop name (DBA) is required.").max(120),
  legalEntityName: z
    .string()
    .trim()
    .min(1, "Legal business name is required.")
    .max(200),
  code: z
    .string()
    .trim()
    .min(1, "Shop code is required.")
    .max(6, "Shop code must be 6 characters or less.")
    .regex(/^[A-Za-z0-9]+$/, "Shop code may only contain letters and numbers."),
  bookingSlug: z
    .string()
    .trim()
    .min(2, "Booking slug is required.")
    .max(80)
    .regex(slugRe, "Use lowercase letters, numbers, and hyphens only.")
    .optional(),
  primaryContactName: z.string().trim().min(1, "Primary contact name is required.").max(120),
  email: z.string().trim().email("Enter a valid contact email."),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
  address: z.string().trim().min(1, "Street address is required.").max(200),
  city: z.string().trim().min(1, "City is required.").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => (US_STATES as readonly string[]).includes(s), "Select a valid US state."),
  zip: z.string().trim().min(5, "ZIP code is required.").max(10),
  plan: z.nativeEnum(ShopPlan),
  billingStatus: z.nativeEnum(BillingStatus).default(BillingStatus.TRIAL),
  trialEndsAt: z.string().trim().optional().nullable(),
  laborRateDollars: z.coerce
    .number()
    .min(1, "Labor rate must be at least $1.")
    .max(9999, "Labor rate is too high."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  shopEmail: z.string().trim().email("Enter a valid shop email for CRM sends."),
});

export type PlatformShopFormValues = z.infer<typeof platformShopFormSchema>;

export type PlatformShopFormState = {
  name: string;
  legalEntityName: string;
  code: string;
  bookingSlug: string;
  primaryContactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  plan: ShopPlan;
  billingStatus: BillingStatus;
  trialEndsAt: string;
  laborRateDollars: string;
  timezone: string;
  shopEmail: string;
};

export function emptyPlatformShopForm(
  overrides?: Partial<PlatformShopFormState>,
): PlatformShopFormState {
  return {
    name: "",
    legalEntityName: "",
    code: "",
    bookingSlug: "",
    primaryContactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    plan: "STARTER",
    billingStatus: "TRIAL",
    trialEndsAt: "",
    laborRateDollars: "125",
    timezone: "America/New_York",
    shopEmail: "",
    ...overrides,
  };
}

/** URL-safe slug from shop name (online booking / public links). */
export function slugifyShopName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Short switcher code from shop name (max 6 chars). */
export function suggestShopCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }
  return name
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
}

export function defaultTimezoneForState(state: string): string {
  return shopTimezone(state);
}

export function parsePlatformShopForm(raw: PlatformShopFormState): {
  ok: true;
  data: PlatformShopFormValues;
} | {
  ok: false;
  error: string;
} {
  const bookingSlug =
    raw.bookingSlug.trim() || slugifyShopName(raw.name) || undefined;
  const timezone =
    raw.timezone.trim() || defaultTimezoneForState(raw.state) || "America/New_York";

  const parsed = platformShopFormSchema.safeParse({
    ...raw,
    bookingSlug,
    timezone,
    trialEndsAt: raw.trialEndsAt.trim() || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid shop details." };
  }
  return { ok: true, data: parsed.data };
}

export function laborRateCentsFromDollars(dollars: number): number {
  return Math.round(dollars * 100);
}

export function dollarsFromLaborRateCents(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
