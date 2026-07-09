/** Client-safe types for the shop daily snapshot feed. */

export type DailySnapshotEventKind =
  | "ro_opened"
  | "ro_completed"
  | "activity"
  | "payment"
  | "appointment"
  | "message_in"
  | "message_out";

export type DailySnapshotEvent = {
  id: string;
  kind: DailySnapshotEventKind;
  occurredAt: string;
  title: string;
  detail?: string;
  repairOrderId?: string;
  roNumber?: number;
  customerName?: string;
  amountCents?: number;
};

export type DailySnapshotSummary = {
  collectedCents: number;
  paymentCount: number;
  rosOpened: number;
  rosCompleted: number;
  appointments: number;
  messages: number;
  activityNotes: number;
};

export type DailySnapshotData = {
  dayLabel: string;
  dayStart: string;
  dayEnd: string;
  /** Which day tab is active — drives empty-state copy. */
  view: SnapshotDayView;
  summary: DailySnapshotSummary;
  events: DailySnapshotEvent[];
};

export type SnapshotDayView = "today" | "tomorrow";

export const SNAPSHOT_DAY_LABELS: Record<SnapshotDayView, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
};

export function parseSnapshotDay(value: string | null | undefined): SnapshotDayView {
  if (value === "tomorrow") return "tomorrow";
  return "today";
}

/** Calendar date for the selected snapshot tab (local timezone). */
export function snapshotDateForView(view: SnapshotDayView, now = new Date()): Date {
  const d = new Date(now);
  if (view === "tomorrow") d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function snapshotTimelineTitle(view: SnapshotDayView): string {
  return view === "tomorrow" ? "Tomorrow's timeline" : "Today's timeline";
}

export const SNAPSHOT_EVENT_LABELS: Record<DailySnapshotEventKind, string> = {
  ro_opened: "RO opened",
  ro_completed: "RO completed",
  activity: "Activity",
  payment: "Payment",
  appointment: "Appointment",
  message_in: "Inbound SMS",
  message_out: "Outbound SMS",
};

/** Summary tile filter keys — maps to event kinds in the timeline. */
export type SnapshotSummaryFilter =
  | "collected"
  | "ros_opened"
  | "ros_completed"
  | "appointments"
  | "messages"
  | "activity";

export const SNAPSHOT_FILTER_KINDS: Record<SnapshotSummaryFilter, DailySnapshotEventKind[]> = {
  collected: ["payment"],
  ros_opened: ["ro_opened"],
  ros_completed: ["ro_completed"],
  appointments: ["appointment"],
  messages: ["message_in", "message_out"],
  activity: ["activity"],
};

export const SNAPSHOT_FILTER_LABELS: Record<SnapshotSummaryFilter, string> = {
  collected: "Payments",
  ros_opened: "ROs opened",
  ros_completed: "ROs completed",
  appointments: "Appointments",
  messages: "Messages",
  activity: "Activity",
};

/** Optional deep-link when user opens the tile in a new tab (Ctrl/Cmd+click). */
export const SNAPSHOT_FILTER_HREFS: Partial<Record<SnapshotSummaryFilter, string>> = {
  collected: "/payments",
  ros_opened: "/job-board",
  ros_completed: "/job-board",
  appointments: "/appointments",
  messages: "/messages",
};
