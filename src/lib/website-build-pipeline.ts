import { WebsiteBuildStatus } from "@/generated/prisma";

export const WEBSITE_BUILD_STATUS = WebsiteBuildStatus;

export type WebsiteBuildStatusValue = WebsiteBuildStatus;

export const WEBSITE_BUILD_STATUS_LABEL: Record<WebsiteBuildStatus, string> = {
  NOT_STARTED: "Not started",
  QUOTE_REQUESTED: "Quote requested",
  IN_BUILD: "In build",
  CLIENT_REVIEW: "Client review",
  LAUNCHED: "Launched",
  UPKEEP: "Upkeep",
  PAUSED: "Paused",
};

export const WEBSITE_BUILD_STATUS_STYLES: Record<WebsiteBuildStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  QUOTE_REQUESTED: "bg-sky-100 text-sky-800",
  IN_BUILD: "bg-amber-100 text-amber-900",
  CLIENT_REVIEW: "bg-violet-100 text-violet-800",
  LAUNCHED: "bg-emerald-100 text-emerald-800",
  UPKEEP: "bg-brand-light/40 text-brand-navy",
  PAUSED: "bg-slate-200 text-slate-600",
};

/** Pipeline columns for operator kanban-style grouping. */
export const WEBSITE_PIPELINE_GROUPS = [
  {
    id: "intake",
    label: "Intake",
    statuses: [WebsiteBuildStatus.NOT_STARTED, WebsiteBuildStatus.QUOTE_REQUESTED] as const,
  },
  {
    id: "production",
    label: "Production",
    statuses: [WebsiteBuildStatus.IN_BUILD, WebsiteBuildStatus.CLIENT_REVIEW] as const,
  },
  {
    id: "live",
    label: "Live & upkeep",
    statuses: [WebsiteBuildStatus.LAUNCHED, WebsiteBuildStatus.UPKEEP] as const,
  },
  {
    id: "paused",
    label: "Paused",
    statuses: [WebsiteBuildStatus.PAUSED] as const,
  },
] as const;

export function websiteBuildStatusLabel(status: WebsiteBuildStatus): string {
  return WEBSITE_BUILD_STATUS_LABEL[status];
}

export function effectiveWebsiteBuildStatus(input: {
  buildStatus: WebsiteBuildStatus | null | undefined;
  published: boolean;
  hasOpenBuildTicket: boolean;
}): WebsiteBuildStatus {
  if (input.buildStatus) {
    if (input.published && input.buildStatus === WebsiteBuildStatus.IN_BUILD) {
      return WebsiteBuildStatus.LAUNCHED;
    }
    return input.buildStatus;
  }
  if (input.published) return WebsiteBuildStatus.LAUNCHED;
  if (input.hasOpenBuildTicket) return WebsiteBuildStatus.QUOTE_REQUESTED;
  return WebsiteBuildStatus.NOT_STARTED;
}

export function defaultNextReviewDue(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 90);
  return d;
}

const PIPELINE_STATUSES: WebsiteBuildStatus[] = [
  WebsiteBuildStatus.NOT_STARTED,
  WebsiteBuildStatus.QUOTE_REQUESTED,
  WebsiteBuildStatus.IN_BUILD,
  WebsiteBuildStatus.CLIENT_REVIEW,
];

const LIVE_STATUSES: WebsiteBuildStatus[] = [
  WebsiteBuildStatus.LAUNCHED,
  WebsiteBuildStatus.UPKEEP,
];

export function isPipelineWebsiteStatus(status: WebsiteBuildStatus): boolean {
  return PIPELINE_STATUSES.includes(status);
}

export function isLiveWebsiteStatus(status: WebsiteBuildStatus): boolean {
  return LIVE_STATUSES.includes(status);
}
