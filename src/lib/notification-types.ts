/** Notification event types for settings + bell items. */
export const NOTIFICATION_TYPES = [
  { key: "INSPECTION_COMPLETED", label: "Inspection completed" },
  { key: "CUSTOMER_VIEWED_INSPECTION", label: "Customer viewed inspection" },
  { key: "CUSTOMER_VIEWED_ESTIMATE", label: "Customer viewed estimate" },
  { key: "RO_CREATED", label: "Repair order created" },
  { key: "RO_AUTHORIZED", label: "Repair order authorized" },
  { key: "RO_STATUS_CHANGED", label: "Repair order status changed" },
  { key: "RO_COMPLETED", label: "Repair order completed" },
  { key: "SMS_RECEIVED", label: "New text message" },
  { key: "TIRE_LOW_STOCK", label: "Tire stock below reorder point" },
  { key: "PAYMENT_RECEIVED", label: "Payment received" },
] as const;

export type NotificationTypeKey = (typeof NOTIFICATION_TYPES)[number]["key"];

export type NotificationScope = "ALL" | "MY_WORK" | "NONE";

export type NotificationPreferences = Partial<Record<NotificationTypeKey, NotificationScope>>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  INSPECTION_COMPLETED: "ALL",
  CUSTOMER_VIEWED_INSPECTION: "ALL",
  CUSTOMER_VIEWED_ESTIMATE: "ALL",
  RO_CREATED: "ALL",
  RO_AUTHORIZED: "ALL",
  RO_STATUS_CHANGED: "ALL",
  RO_COMPLETED: "ALL",
  SMS_RECEIVED: "ALL",
  TIRE_LOW_STOCK: "ALL",
  PAYMENT_RECEIVED: "ALL",
};

export function mergeNotificationPreferences(
  raw: unknown,
): NotificationPreferences {
  const base = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!raw || typeof raw !== "object") return base;
  for (const { key } of NOTIFICATION_TYPES) {
    const v = (raw as Record<string, unknown>)[key];
    if (v === "ALL" || v === "MY_WORK" || v === "NONE") {
      base[key] = v;
    }
  }
  return base;
}
