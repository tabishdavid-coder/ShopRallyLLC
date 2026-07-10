// Client-safe Job Board types & column constants. No prisma runtime import here
// (only a type-only import, which is erased) so this can be used in client
// components. The server query lives in `@/server/job-board`.
import type { ROStatus } from "@/generated/prisma";
import type { PipelineColumn } from "@/lib/job-board-pipeline";

/** RO status string values (mirrors the Prisma ROStatus enum, client-safe). */
export const RO_STATUS = {
  ESTIMATE: "ESTIMATE",
  APPROVED: "APPROVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  INVOICED: "INVOICED",
} as const satisfies Record<string, ROStatus>;

export type JobCard = {
  id: string;
  number: number;
  status: ROStatus;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    phone: string | null;
    marketingOptIn: boolean;
  };
  vehicle: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    plateState: string | null;
  } | null;
  totalCents: number;
  /** ISO string after RSC → client serialization; use `new Date()` before formatting. */
  createdAt: Date | string;
  /** Best-effort when the RO entered its current board stage (no dedicated column-enter field). */
  stageEnteredAt: Date | string;
  hasInspection: boolean;
  invoiceBalanceCents: number | null;
  authorizedAt: Date | string | null;
  approvedVia: string | null;
  approvalSentAt: Date | string | null;
  estimateViewedAt: Date | string | null;
  /** Latest payment on the RO invoice, when fully paid. */
  lastPaymentMethod: string | null;
  lastPaymentAt: Date | string | null;
  paymentPosted: boolean;
  /** Unread inbound SMS for this customer (shop inbox). */
  unreadSmsCount: number;
  canArchive: boolean;
};

/** Format elapsed time in the current board stage (e.g. "10h in stage", "15d in stage"). */
export function formatTimeInStage(stageEnteredAt: Date | string, now = new Date()): string {
  const start = stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
  if (Number.isNaN(start.getTime())) return "";
  const ms = Math.max(0, now.getTime() - start.getTime());
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "<1h in stage";
  if (hours < 24) return `${hours}h in stage`;
  const days = Math.floor(hours / 24);
  return `${days}d in stage`;
}

/**
 * AgeDot tone from days in stage (mock Palette C):
 * fresh (<3d) grey · amber (3–9d) · stale/red (10+d).
 */
export function jobCardStatusBarTone(card: {
  stageEnteredAt: Date | string;
  paymentPosted?: boolean;
  invoiceBalanceCents?: number | null;
  status?: ROStatus;
  column?: BoardColumn;
}): "fresh" | "amber" | "stale" {
  const start =
    card.stageEnteredAt instanceof Date
      ? card.stageEnteredAt
      : new Date(card.stageEnteredAt);
  const days = Number.isNaN(start.getTime())
    ? 0
    : Math.floor(Math.max(0, Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 10) return "stale";
  if (days >= 3) return "amber";
  return "fresh";
}

export type JobBoard = {
  columns: PipelineColumn[];
  cardsByColumnId: Record<string, JobCard[]>;
  /** Core columns — dashboard widgets & legacy callers. */
  estimates: JobCard[];
  workInProgress: JobCard[];
  completed: JobCard[];
};

export type BoardColumn = "estimates" | "workInProgress" | "completed";

/** Which column an RO status belongs to. */
export const COLUMN_OF: Record<ROStatus, BoardColumn> = {
  ESTIMATE: "estimates",
  APPROVED: "workInProgress",
  IN_PROGRESS: "workInProgress",
  COMPLETED: "completed",
  INVOICED: "completed",
};

/** Canonical RO status to set when a card is dropped into a column. */
export const COLUMN_STATUS: Record<BoardColumn, ROStatus> = {
  estimates: "ESTIMATE",
  workInProgress: "IN_PROGRESS",
  completed: "COMPLETED",
};
