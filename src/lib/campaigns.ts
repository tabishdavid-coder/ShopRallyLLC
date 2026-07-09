import type { CampaignChannel, CampaignStatus, CampaignType } from "@/generated/prisma";

/** Audience filter stored as JSON on MarketingCampaign.audienceFilter */
export type AudienceFilter = {
  tags?: string[];
  /** Customers with no RO in the last N days (win-back). */
  lastVisitDaysMin?: number;
  lastVisitDaysMax?: number;
  marketingOptInOnly?: boolean;
  customerType?: "all" | "person" | "business";
  zipCodes?: string[];
  requirePhone?: boolean;
  requireEmail?: boolean;
  /** Customers with yellow/red declined inspection items on a recent RO. */
  hasDeclinedInspection?: boolean;
  /** Optional promo copy stored with win-back campaigns (e.g. "$20 off next visit"). */
  offerText?: string;
};

export const MERGE_FIELDS = [
  { key: "customer_name", label: "Customer name", token: "{customer_name}" },
  { key: "shop_name", label: "Shop name", token: "{shop_name}" },
  { key: "booking_link", label: "Booking link", token: "{booking_link}" },
  { key: "review_link", label: "Review link", token: "{review_link}" },
  { key: "shop_phone", label: "Shop phone", token: "{shop_phone}" },
  { key: "offer", label: "Offer / discount", token: "{offer}" },
  { key: "last_service", label: "Last service", token: "{last_service}" },
] as const;

/** Win-back audience presets (lapsed customer segments). */
export const WINBACK_PRESETS = [
  {
    id: "6mo",
    label: "6 months",
    description: "No visit in 180+ days — recently lapsed",
    days: 180,
  },
  {
    id: "12mo",
    label: "12 months",
    description: "No visit in 365+ days — classic win-back",
    days: 365,
  },
  {
    id: "18mo",
    label: "18+ months",
    description: "No visit in 540+ days — long dormant",
    days: 540,
  },
] as const;

export type WinbackPresetId = (typeof WINBACK_PRESETS)[number]["id"] | "custom";

export type WinbackMessageTemplate = {
  id: string;
  label: string;
  channel: CampaignChannel;
  message: string;
  emailSubject?: string;
};

export const WINBACK_MESSAGE_TEMPLATES: WinbackMessageTemplate[] = [
  {
    id: "miss-you-sms",
    label: "We miss you (SMS)",
    channel: "SMS",
    message:
      "Hi {customer_name}, we miss you at {shop_name}! It's been a while since {last_service}. Book your next visit: {booking_link}{offer_suffix}",
  },
  {
    id: "miss-you-email",
    label: "We miss you (Email)",
    channel: "EMAIL",
    emailSubject: "We miss you at {shop_name}",
    message:
      "Hi {customer_name},\n\nWe noticed it's been a while since your last visit for {last_service}. We'd love to see you again at {shop_name}.\n\nSchedule online: {booking_link}\n{offer_line}\n\nCall us anytime at {shop_phone}.",
  },
  {
    id: "offer-sms",
    label: "Special offer (SMS)",
    channel: "SMS",
    message:
      "Hi {customer_name}! {shop_name} has a welcome-back offer: {offer}. Book now: {booking_link}",
  },
  {
    id: "offer-both",
    label: "Offer + booking (Email & SMS)",
    channel: "BOTH",
    emailSubject: "Welcome back — special offer from {shop_name}",
    message:
      "Hi {customer_name}, we'd love to welcome you back to {shop_name}. {offer_line} Book online: {booking_link} or call {shop_phone}.",
  },
];

/** Expand win-back template placeholders for preview / send. */
export function expandWinbackTemplate(
  template: string,
  opts: { offerText?: string; lastService?: string },
): string {
  const offer = opts.offerText?.trim() ?? "";
  const lastService = opts.lastService?.trim() || "your last visit";
  const offerLine = offer ? `Special offer: ${offer}` : "";
  const offerSuffix = offer ? ` Use code: ${offer}` : "";

  return template
    .replaceAll("{offer}", offer)
    .replaceAll("{offer_line}", offerLine)
    .replaceAll("{offer_suffix}", offerSuffix)
    .replaceAll("{last_service}", lastService);
}

export function audienceForWinbackPreset(
  presetId: WinbackPresetId,
  customDays?: number,
): AudienceFilter {
  const days =
    presetId === "custom"
      ? Math.max(30, customDays ?? 365)
      : WINBACK_PRESETS.find((p) => p.id === presetId)?.days ?? 365;

  return {
    marketingOptInOnly: true,
    lastVisitDaysMin: days,
    requirePhone: true,
  };
}

export type CampaignTemplate = {
  type: CampaignType;
  name: string;
  description: string;
  channel: CampaignChannel;
  defaultMessage: string;
  defaultEmailSubject?: string;
  defaultAudience: AudienceFilter;
  icon: "star" | "calendar" | "alert" | "gift" | "users" | "droplet" | "megaphone";
  automated?: boolean;
  automationNote?: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    type: "REVIEW_REQUEST",
    name: "Google Review Request",
    description: "Ask happy customers for a Google review after a completed repair.",
    channel: "SMS",
    defaultMessage:
      "Hi {customer_name}, thanks for visiting {shop_name}! We'd love your feedback: {review_link}",
    defaultAudience: { marketingOptInOnly: true, requirePhone: true, lastVisitDaysMax: 14 },
    icon: "star",
    automated: true,
    automationNote: "Also available as a Marketing → Automations workflow after RO completes.",
  },
  {
    type: "APPOINTMENT_REMINDER",
    name: "Appointment Reminder",
    description: "Remind customers 24 hours before their scheduled appointment.",
    channel: "SMS",
    defaultMessage:
      "Hi {customer_name}, this is {shop_name}. Reminder: you have an appointment tomorrow. Reply to confirm or call {shop_phone}.",
    defaultAudience: { marketingOptInOnly: true, requirePhone: true },
    icon: "calendar",
    automated: true,
    automationNote: "Runs automatically via Marketing → Automations (appointment reminder).",
  },
  {
    type: "DECLINED_SERVICE",
    name: "Declined Service Follow-up",
    description: "Follow up on yellow or red inspection items the customer declined.",
    channel: "BOTH",
    defaultMessage:
      "Hi {customer_name}, {shop_name} here. We noted some recommended services from your last visit. Book when ready: {booking_link}",
    defaultEmailSubject: "Recommended services from your visit",
    defaultAudience: { marketingOptInOnly: true, lastVisitDaysMax: 30, hasDeclinedInspection: true },
    icon: "alert",
    automated: true,
    automationNote: "Triggers via Marketing → Automations when inspection has declined items.",
  },
  {
    type: "WIN_BACK",
    name: "Win-back Campaign",
    description: "Re-engage customers who haven't visited in 12+ months.",
    channel: "SMS",
    defaultMessage:
      "Hi {customer_name}, we miss you at {shop_name}! It's been a while since {last_service}. Book your next visit: {booking_link}{offer_suffix}",
    defaultAudience: { marketingOptInOnly: true, lastVisitDaysMin: 365, requirePhone: true },
    icon: "users",
    automated: false,
  },
  {
    type: "PROMO_BLAST",
    name: "Promotional Blast",
    description: "One-time offer to a custom customer segment.",
    channel: "BOTH",
    defaultMessage:
      "Hi {customer_name}! {shop_name} has a special offer this month. Book online: {booking_link}",
    defaultEmailSubject: "Special offer from {shop_name}",
    defaultAudience: { marketingOptInOnly: true },
    icon: "gift",
    automated: false,
  },
  {
    type: "OIL_CHANGE_REMINDER",
    name: "Oil Change Reminder",
    description: "Remind customers based on mileage or time since last oil change.",
    channel: "SMS",
    defaultMessage:
      "Hi {customer_name}, it's time for an oil change at {shop_name}. Book now: {booking_link}",
    defaultAudience: { marketingOptInOnly: true, requirePhone: true, lastVisitDaysMin: 90 },
    icon: "droplet",
    automated: true,
    automationNote: "Mileage/time rules via vehicle service history (coming soon)",
  },
];

export function getCampaignTemplate(type: CampaignType): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.type === type);
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
};

export const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-slate-100 text-slate-700",
};

export const CAMPAIGN_CHANNEL_LABEL: Record<CampaignChannel, string> = {
  SMS: "SMS",
  EMAIL: "Email",
  BOTH: "SMS + Email",
};

export function applyMergeFields(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function parseAudienceFilter(raw: unknown): AudienceFilter {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AudienceFilter;
}
