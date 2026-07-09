import type { StripeConnectStatus } from "@/generated/prisma";

/** Client-safe Stripe Connect status values (mirrors Prisma enum). */
export const STRIPE_CONNECT_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  RESTRICTED: "RESTRICTED",
  DISABLED: "DISABLED",
} as const satisfies Record<string, StripeConnectStatus>;

export type ConnectPrerequisiteField =
  | "name"
  | "email"
  | "address"
  | "city"
  | "state"
  | "zip";

export type ShopConnectProfile = {
  name: string;
  email: string | null;
  taxId: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
};

export type ConnectPrerequisites = {
  profile: ShopConnectProfile;
  ready: boolean;
  missing: ConnectPrerequisiteField[];
};

export type PlatformStripeConfig = {
  enabled: boolean;
  webhookConfigured: boolean;
  publishableKeyConfigured: boolean;
  /** Platform key present + webhook recommended for Connect go-live. */
  connectReady: boolean;
  mode: "live" | "test" | "none";
  /** Dev-only: allow Checkout on platform account when shop Connect is incomplete. */
  platformFallbackAllowed: boolean;
};

export type ShopStripeStatus = {
  connectStatus: StripeConnectStatus;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingCompletedAt: Date | null;
  platformConfigured: boolean;
  canAcceptPayments: boolean;
  usingConnect: boolean;
  /** True when shop can open Express Dashboard via login link (active account). */
  canOpenExpressDashboard: boolean;
  disabledReason: string | null;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
};
