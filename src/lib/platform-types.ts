import type {
  BillingStatus,
  ShopPlan,
  ShopStatus,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/generated/prisma";

/** Client-safe support ticket status values (mirrors Prisma enum). */
export const SUPPORT_TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const satisfies Record<string, SupportTicketStatus>;

/** Client-safe shop lifecycle status values. */
export const SHOP_STATUS = {
  ACTIVE: "ACTIVE",
  TRIAL: "TRIAL",
  SUSPENDED: "SUSPENDED",
  PENDING: "PENDING",
} as const satisfies Record<string, ShopStatus>;

/** Client-safe subscription plan tier values. */
export const SHOP_PLAN = {
  STARTER: "STARTER",
  PROFESSIONAL: "PROFESSIONAL",
  ENTERPRISE: "ENTERPRISE",
} as const satisfies Record<string, ShopPlan>;

/** Client-safe platform billing status values. */
export const BILLING_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const satisfies Record<string, BillingStatus>;

/** Client-safe support ticket category values. */
export const SUPPORT_TICKET_CATEGORY = {
  GENERAL: "GENERAL",
  WEBSITE_BUILD: "WEBSITE_BUILD",
} as const satisfies Record<string, SupportTicketCategory>;

export const SUPPORT_TICKET_CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  GENERAL: "General",
  WEBSITE_BUILD: "Website build",
};
