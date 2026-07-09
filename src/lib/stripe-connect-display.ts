import type { StripeConnectStatus } from "@/generated/prisma";

/** Shared Connect status labels + pill styles (shop settings + Master CRM tables). */
export const STRIPE_CONNECT_STATUS_DISPLAY: Record<
  StripeConnectStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: { label: "Not started", className: "bg-slate-100 text-slate-700" },
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  RESTRICTED: { label: "Restricted", className: "bg-orange-100 text-orange-800" },
  DISABLED: { label: "Disabled", className: "bg-red-100 text-red-800" },
};

export function stripeConnectStatusLabel(status: StripeConnectStatus): string {
  return STRIPE_CONNECT_STATUS_DISPLAY[status]?.label ?? status;
}
