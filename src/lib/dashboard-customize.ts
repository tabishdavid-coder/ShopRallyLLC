import type { SnapshotSummaryFilter } from "@/lib/daily-snapshot";

/** Global fallback when shop id is unavailable. */
export const DASHBOARD_CUSTOMIZE_STORAGE_KEY = "shoprally.dashboard.customize";

export type DashboardSectionKey =
  | "kpiRow"
  | "timeline"
  | "quickActions"
  | "overdueFollowUps"
  | "estimateStatus"
  | "topServices";

export type DashboardCustomizePrefs = {
  sections: Record<DashboardSectionKey, boolean>;
  kpis: Record<SnapshotSummaryFilter, boolean>;
};

export const DASHBOARD_SECTION_META: {
  key: DashboardSectionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "kpiRow",
    label: "KPI cards",
    description: "Collected, ROs opened, appointments, and other summary tiles",
  },
  {
    key: "timeline",
    label: "Today's timeline",
    description: "Activity feed for payments, ROs, SMS, and notes",
  },
  {
    key: "quickActions",
    label: "Quick actions",
    description: "Shortcuts for estimate, appointment, customer, and more",
  },
  {
    key: "overdueFollowUps",
    label: "Overdue follow ups",
    description: "Customers who need a follow-up call or message",
  },
  {
    key: "estimateStatus",
    label: "Open estimates by status",
    description: "Pending, approved, and declined estimate counts",
  },
  {
    key: "topServices",
    label: "Top performing services",
    description: "Highest-revenue services this month",
  },
];

export const DASHBOARD_KPI_META: {
  key: SnapshotSummaryFilter;
  label: string;
}[] = [
  { key: "collected", label: "Collected" },
  { key: "ros_opened", label: "ROs Opened" },
  { key: "ros_completed", label: "ROs Completed" },
  { key: "appointments", label: "Appointments" },
  { key: "messages", label: "Messages" },
  { key: "activity", label: "Activity" },
];

export const DEFAULT_DASHBOARD_CUSTOMIZE: DashboardCustomizePrefs = {
  sections: {
    kpiRow: true,
    timeline: true,
    quickActions: true,
    overdueFollowUps: true,
    estimateStatus: true,
    topServices: true,
  },
  kpis: {
    collected: true,
    ros_opened: true,
    ros_completed: true,
    appointments: true,
    messages: true,
    activity: true,
  },
};

export function dashboardCustomizeStorageKey(shopId?: string | null): string {
  const id = shopId?.trim();
  return id ? `${DASHBOARD_CUSTOMIZE_STORAGE_KEY}.${id}` : DASHBOARD_CUSTOMIZE_STORAGE_KEY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeDashboardCustomize(
  raw: unknown,
): DashboardCustomizePrefs {
  const base: DashboardCustomizePrefs = {
    sections: { ...DEFAULT_DASHBOARD_CUSTOMIZE.sections },
    kpis: { ...DEFAULT_DASHBOARD_CUSTOMIZE.kpis },
  };
  if (!isRecord(raw)) return base;

  if (isRecord(raw.sections)) {
    for (const { key } of DASHBOARD_SECTION_META) {
      if (typeof raw.sections[key] === "boolean") {
        base.sections[key] = raw.sections[key];
      }
    }
  }
  if (isRecord(raw.kpis)) {
    for (const { key } of DASHBOARD_KPI_META) {
      if (typeof raw.kpis[key] === "boolean") {
        base.kpis[key] = raw.kpis[key];
      }
    }
  }
  return base;
}

export function loadDashboardCustomize(shopId?: string | null): DashboardCustomizePrefs {
  if (typeof window === "undefined") return { ...DEFAULT_DASHBOARD_CUSTOMIZE, sections: { ...DEFAULT_DASHBOARD_CUSTOMIZE.sections }, kpis: { ...DEFAULT_DASHBOARD_CUSTOMIZE.kpis } };
  try {
    const raw = window.localStorage.getItem(dashboardCustomizeStorageKey(shopId));
    if (!raw) return normalizeDashboardCustomize(null);
    return normalizeDashboardCustomize(JSON.parse(raw) as unknown);
  } catch {
    return normalizeDashboardCustomize(null);
  }
}

export function saveDashboardCustomize(
  prefs: DashboardCustomizePrefs,
  shopId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      dashboardCustomizeStorageKey(shopId),
      JSON.stringify(normalizeDashboardCustomize(prefs)),
    );
  } catch {
    // Ignore quota / private-mode failures — UI still applies in-session.
  }
}

export function cloneDashboardCustomize(
  prefs: DashboardCustomizePrefs,
): DashboardCustomizePrefs {
  return {
    sections: { ...prefs.sections },
    kpis: { ...prefs.kpis },
  };
}
