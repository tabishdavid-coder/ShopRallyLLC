// Client-safe shared types/constants for RO Settings → Advanced Settings.
// Kept out of the "use server" actions file (which may only export async fns).

export type AdvancedSettings = {
  reqOdometer: boolean;
  reqMarketingSource: boolean;
  reqTechOnLabor: boolean;
  reqJobCategory: boolean;
  reqPoForParts: boolean;
  reqBillingForParts: boolean;
  reqPaymentCardType: boolean;
  reqDotCodes: boolean;
  reqDigitalSignature: boolean;
  reqReturnPartsBeforeSave: boolean;
  techHoursDisplay: "JOB_COMPLETED" | "RO_COMPLETED" | "RO_POSTED";
};

export const ADVANCED_DEFAULTS: AdvancedSettings = {
  reqOdometer: false,
  reqMarketingSource: false,
  reqTechOnLabor: false,
  reqJobCategory: false,
  reqPoForParts: false,
  reqBillingForParts: false,
  reqPaymentCardType: true,
  reqDotCodes: false,
  reqDigitalSignature: false,
  reqReturnPartsBeforeSave: false,
  techHoursDisplay: "RO_COMPLETED",
};

/** Merge stored RO advanced settings over defaults. */
export function resolveAdvanced(raw: unknown): AdvancedSettings {
  return { ...ADVANCED_DEFAULTS, ...((raw as Partial<AdvancedSettings>) ?? {}) };
}
