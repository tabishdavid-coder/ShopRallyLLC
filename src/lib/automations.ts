import type {
  AutomationKey,
  AutomationTriggerTiming,
  AutomationTriggerUnit,
} from "@/generated/prisma";

export type AutomationTemplate = {
  key: AutomationKey;
  name: string;
  description: string;
  triggerTiming: AutomationTriggerTiming;
  triggerAmount?: number;
  triggerUnit?: AutomationTriggerUnit;
  triggerLabel: string;
  defaultSmsMessage: string;
  defaultEmailSubject?: string;
  defaultEmailBody?: string;
  includeBusinessCustomers?: boolean;
  limitOnePerCustomer?: boolean;
  includeBookingLinkCta?: boolean;
  /** Pre-configured with channels enabled for a typical active shop. */
  defaultEmailEnabled?: boolean;
  defaultSmsEnabled?: boolean;
  defaultConfigured?: boolean;
  icon: "calendar-check" | "calendar" | "star" | "alert" | "users" | "clock" | "heart";
};

export const AUTOMATION_MERGE_FIELDS = [
  { key: "first_name", label: "First name", token: "{first_name}" },
  { key: "customer_name", label: "Customer name", token: "{customer_name}" },
  { key: "shop_name", label: "Shop name", token: "{shop_name}" },
  { key: "shop_phone", label: "Shop phone", token: "{shop_phone}" },
  { key: "booking_link", label: "Booking link", token: "{booking_link}" },
  { key: "review_link", label: "Review link", token: "{review_link}" },
  { key: "appointment_date", label: "Appointment date", token: "{appointment_date}" },
  { key: "appointment_time", label: "Appointment time", token: "{appointment_time}" },
  { key: "vehicle_make_model", label: "Vehicle make & model", token: "{vehicle_make_model}" },
] as const;

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "APPOINTMENT_CONFIRMATION",
    name: "Appointment Confirmation",
    description:
      "Instantly send a confirmation message when an appointment is booked, edited or updated.",
    triggerTiming: "INSTANT",
    triggerLabel: "When appointment is booked, edited or updated",
    defaultSmsMessage:
      "Thank you for booking your upcoming service appointment at {shop_name} on {appointment_date} at {appointment_time}. Please let us know if you need to reschedule or cancel by replying to this text or call us directly at {shop_phone}.",
    defaultEmailSubject: "Your appointment at {shop_name} is confirmed",
    defaultEmailBody:
      "Hi {first_name},\n\nThank you for booking your service appointment at {shop_name} on {appointment_date} at {appointment_time}.\n\nPlease reply to this email or call {shop_phone} if you need to reschedule or cancel.",
    defaultEmailEnabled: true,
    defaultSmsEnabled: true,
    defaultConfigured: true,
    icon: "calendar-check",
  },
  {
    key: "APPOINTMENT_REMINDER",
    name: "Appointment Reminder",
    description:
      "Decrease no-shows by automatically reminding customers of their upcoming appointment.",
    triggerTiming: "BEFORE",
    triggerAmount: 1,
    triggerUnit: "DAYS",
    triggerLabel: "Send reminder before appointment",
    defaultSmsMessage:
      "Hi {first_name}, this is {shop_name}. Reminder: you have an appointment tomorrow at {appointment_time}. Reply to confirm or call {shop_phone} to reschedule.",
    defaultEmailSubject: "Appointment reminder — {shop_name}",
    defaultEmailBody:
      "Hi {first_name},\n\nThis is a friendly reminder about your upcoming appointment at {shop_name} on {appointment_date} at {appointment_time}.\n\nReply or call {shop_phone} if you need to make changes.",
    defaultEmailEnabled: true,
    defaultSmsEnabled: true,
    defaultConfigured: true,
    icon: "calendar",
  },
  {
    key: "REVIEW_REQUEST",
    name: "Review Request",
    description:
      "Increase your Google reviews and uncover valuable insights by requesting feedback post-visit.",
    triggerTiming: "AFTER",
    triggerAmount: 1,
    triggerUnit: "DAYS",
    triggerLabel: "Send reminder after RO posts",
    defaultSmsMessage:
      "Hi {first_name}, thanks for visiting {shop_name}! We'd love your feedback: {review_link}",
    defaultEmailSubject: "We'd love your help {first_name}",
    defaultEmailBody:
      "Hi {first_name},\n\nThank you for trusting {shop_name} with your {vehicle_make_model}. We'd really appreciate a quick review of your experience.\n\nLeave feedback: {review_link}",
    limitOnePerCustomer: true,
    defaultEmailEnabled: false,
    defaultSmsEnabled: true,
    defaultConfigured: true,
    icon: "star",
  },
  {
    key: "DECLINED_SERVICE_REMINDER",
    name: "Declined Service Reminder",
    description:
      "Increase sales of previously declined services by reminding customers to reschedule.",
    triggerTiming: "AFTER",
    triggerAmount: 7,
    triggerUnit: "DAYS",
    triggerLabel: "Send reminder after RO posts",
    defaultSmsMessage:
      "Hi {first_name}, {shop_name} here. We noted some recommended services from your last visit. Book when ready: {booking_link}",
    defaultEmailSubject: "Recommended services from your visit",
    defaultEmailBody:
      "Hi {first_name},\n\nDuring your recent visit to {shop_name}, we noted some recommended services. When you're ready, you can schedule online: {booking_link}",
    includeBookingLinkCta: true,
    defaultEmailEnabled: false,
    defaultSmsEnabled: false,
    defaultConfigured: false,
    icon: "alert",
  },
  {
    key: "LOST_CUSTOMER_6MO",
    name: "Lost Customer Follow-Up - 6 Months",
    description:
      "Win back lost customers by sending automated, perfectly-timed follow-up messages.",
    triggerTiming: "AFTER",
    triggerAmount: 6,
    triggerUnit: "MONTHS",
    triggerLabel: "Send reminder after RO posts",
    defaultSmsMessage:
      "Hi {first_name}, we miss you at {shop_name}! Schedule your next service: {booking_link}",
    defaultEmailSubject: "Everything running right with your {vehicle_make_model}?",
    defaultEmailBody:
      "Hey {first_name},\n\nIt's been a while since you visited {shop_name} and I wanted to check in to make sure everything on your car is still working properly.\n\nSchedule now: {booking_link}",
    includeBusinessCustomers: true,
    includeBookingLinkCta: true,
    defaultEmailEnabled: false,
    defaultSmsEnabled: false,
    defaultConfigured: false,
    icon: "users",
  },
  {
    key: "LOST_CUSTOMER_12MO",
    name: "Lost Customer Follow-Up - 12 Months",
    description:
      "Win back lost customers by sending automated, perfectly-timed follow-up messages.",
    triggerTiming: "AFTER",
    triggerAmount: 12,
    triggerUnit: "MONTHS",
    triggerLabel: "Send reminder after RO posts",
    defaultSmsMessage:
      "Hi {first_name}, it's been a year since your last visit to {shop_name}. We'd love to see you again: {booking_link}",
    defaultEmailSubject: "Everything running right with your {vehicle_make_model}?",
    defaultEmailBody:
      "Hey {first_name},\n\nIt's been a while since you visited {shop_name} and I wanted to check in to make sure everything on your car is still working properly.\n\nSchedule now: {booking_link}",
    includeBusinessCustomers: true,
    includeBookingLinkCta: true,
    defaultEmailEnabled: false,
    defaultSmsEnabled: false,
    defaultConfigured: false,
    icon: "users",
  },
  {
    key: "RECENT_SERVICE_FOLLOWUP",
    name: "Recent Service Follow-Up",
    description:
      "Strengthen relationships by checking in with customers shortly after their visit.",
    triggerTiming: "AFTER",
    triggerAmount: 3,
    triggerUnit: "DAYS",
    triggerLabel: "Send reminder after RO posts",
    defaultSmsMessage:
      "Hi {first_name}, {shop_name} checking in — how is your {vehicle_make_model} running after your recent service? Reply or call {shop_phone} if you need anything.",
    defaultEmailSubject: "How is your {vehicle_make_model} running?",
    defaultEmailBody:
      "Hi {first_name},\n\nWe hope your {vehicle_make_model} is running great after your recent visit to {shop_name}. If you have any questions, reply or call us at {shop_phone}.",
    defaultEmailEnabled: false,
    defaultSmsEnabled: false,
    defaultConfigured: false,
    icon: "heart",
  },
];

export function getAutomationTemplate(key: AutomationKey): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.key === key);
}

export const TRIGGER_UNIT_LABEL: Record<AutomationTriggerUnit, string> = {
  HOURS: "hour",
  DAYS: "day",
  MONTHS: "month",
};

export function triggerUnitLabel(unit: AutomationTriggerUnit, amount: number): string {
  const base = TRIGGER_UNIT_LABEL[unit];
  return amount === 1 ? base : `${base}s`;
}

export function applyAutomationMergeFields(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function smsCharacterRemaining(message: string): number {
  return Math.max(0, 320 - message.length);
}
