/** URL-driven job board filters — shared by toolbar + server query. */

export const JOB_BOARD_VISIBILITY = ["active", "archived", "all"] as const;
export type JobBoardVisibility = (typeof JOB_BOARD_VISIBILITY)[number];

export const JOB_BOARD_PAYMENT = ["paid", "balance", "unpaid"] as const;
export type JobBoardPaymentFilter = (typeof JOB_BOARD_PAYMENT)[number];

export const JOB_BOARD_APPROVAL = ["needs", "sent", "approved"] as const;
export type JobBoardApprovalFilter = (typeof JOB_BOARD_APPROVAL)[number];

export const JOB_BOARD_VISIBILITY_LABELS: Record<JobBoardVisibility, string> = {
  active: "Active",
  archived: "Archived",
  all: "All tickets",
};

export const JOB_BOARD_PAYMENT_LABELS: Record<JobBoardPaymentFilter, string> = {
  paid: "Paid in full",
  balance: "Balance due",
  unpaid: "Unpaid",
};

export const JOB_BOARD_APPROVAL_LABELS: Record<JobBoardApprovalFilter, string> = {
  needs: "Needs approval",
  sent: "Estimate sent",
  approved: "Approved",
};

export function parseJobBoardVisibility(raw: string | undefined): JobBoardVisibility {
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}

export function parseJobBoardPayment(raw: string | undefined): JobBoardPaymentFilter | null {
  if (raw === "paid" || raw === "balance" || raw === "unpaid") return raw;
  return null;
}

export function parseJobBoardApproval(raw: string | undefined): JobBoardApprovalFilter | null {
  if (raw === "needs" || raw === "sent" || raw === "approved") return raw;
  return null;
}

export const JOB_BOARD_VIEW = ["board", "list"] as const;
export type JobBoardView = (typeof JOB_BOARD_VIEW)[number];

export const JOB_BOARD_SORT = ["number", "created", "total", "stage"] as const;
export type JobBoardSort = (typeof JOB_BOARD_SORT)[number];

export const JOB_BOARD_SORT_LABELS: Record<JobBoardSort, string> = {
  number: "RO #",
  created: "Newest",
  total: "Total",
  stage: "Stage",
};

export function parseJobBoardView(raw: string | undefined): JobBoardView {
  if (raw === "list") return "list";
  return "board";
}

export function parseJobBoardSort(raw: string | undefined): JobBoardSort {
  if (raw === "created" || raw === "total" || raw === "stage") return raw;
  return "number";
}
