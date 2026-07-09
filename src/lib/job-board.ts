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
  canArchive: boolean;
};

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
