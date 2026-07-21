/** Shared types for Shop Notes → AI apply flow (client + server). */

export type ShopNotesProposalKind =
  | "customer_phone"
  | "customer_email"
  | "customer_name"
  | "vehicle_year"
  | "vehicle_make"
  | "vehicle_model"
  | "vehicle_trim"
  | "concern"
  | "job"
  | "part";

export type ShopNotesProposalMode = "fill" | "update" | "add";

/** create-job — new job card on RO; amend-job — append lines to focusJobId. */
export type CreateJobAiMode = "create-job" | "amend-job";

export type ShopNotesJobPayload = {
  jobName: string;
  repairRequest: string;
  laborHours: number;
  laborDescription: string;
  /** Procedure / advisor detail — stored on job note, not labor grid. */
  jobNotes?: string | null;
  /** When set, apply updates this job instead of creating a new one. */
  targetJobId?: string | null;
  /** Primary labor line to update when amending an existing job. */
  laborLineId?: string | null;
  /** When true with targetJobId, add a new labor line instead of updating the job card. */
  appendLabor?: boolean;
};

export type ShopNotesPartPayload = {
  description: string;
  vendor: string | null;
  vendorPhone: string | null;
  partNumber: string | null;
  relatedJobName: string | null;
  /** Prefer this job when adding parts during an existing-job amend. */
  targetJobId?: string | null;
};

export type ShopNotesProposalItem = {
  id: string;
  kind: ShopNotesProposalKind;
  label: string;
  detail: string | null;
  currentValue: string | null;
  proposedValue: string;
  mode: ShopNotesProposalMode;
  /** Server default — client toggles before apply. */
  defaultAccepted: boolean;
  /** Existing RO job id when mode is update (amend existing job). */
  targetJobId?: string | null;
  job?: ShopNotesJobPayload;
  part?: ShopNotesPartPayload;
};

export type ShopNotesAiProposal = {
  roId: string;
  sourceText: string;
  items: ShopNotesProposalItem[];
};

export type ShopNotesApplyItem = {
  id: string;
  kind: ShopNotesProposalKind;
  job?: ShopNotesJobPayload;
  part?: ShopNotesPartPayload;
  proposedValue?: string;
};

/** Proposal kinds shown when adding jobs to an existing estimate (not customer/vehicle edits). */
export const ESTIMATE_JOB_AI_KINDS = ["concern", "job", "part"] as const satisfies readonly ShopNotesProposalKind[];

export type EstimateJobAiKind = (typeof ESTIMATE_JOB_AI_KINDS)[number];

export function isEstimateJobAiKind(kind: ShopNotesProposalKind): kind is EstimateJobAiKind {
  return (ESTIMATE_JOB_AI_KINDS as readonly ShopNotesProposalKind[]).includes(kind);
}

export function filterEstimateJobAiItems(items: ShopNotesProposalItem[]): ShopNotesProposalItem[] {
  return items.filter((item) => isEstimateJobAiKind(item.kind));
}
