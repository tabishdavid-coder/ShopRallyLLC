/** Shared types for Freeform RO intake (client + server). */

export type FreeformVehicleDraft = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
  mileage: number | null;
};

export type FreeformCustomerHint = {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
};

export type FreeformJobDraft = {
  jobName: string;
  repairRequest: string;
  laborHours: number;
  laborDescription: string;
  laborOperations: string[];
  confidenceScore: number;
  notes: string;
  resolution: string;
};

/** Parts vendor / description hints extracted from freeform text (not committed by intake). */
export type FreeformPartHint = {
  description: string;
  vendor: string | null;
  vendorPhone: string | null;
  partNumber: string | null;
  /** Best-effort link to a repair request or job name. */
  relatedRepair: string | null;
};

export type FreeformRoDraft = {
  rawText: string;
  vehicle: FreeformVehicleDraft;
  customerHint: FreeformCustomerHint | null;
  concerns: string[];
  notes: string | null;
  jobs: FreeformJobDraft[];
  partHints: FreeformPartHint[];
  /** Suggested customer matches from CRM (server-populated). */
  suggestedCustomerIds: string[];
};

export const FREEFORM_RO_ADDON_LABEL = "$20/mo add-on";
