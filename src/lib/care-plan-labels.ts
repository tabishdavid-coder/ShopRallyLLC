/** Customer maintenance subscription — display labels. */
export const MEMBERSHIP_TAB_LABEL = "Membership";
export const MEMBERSHIP_TAB_SHORT = "Member";

/** @deprecated Use MEMBERSHIP_TAB_LABEL */
export const CARE_PLAN_TAB_LABEL = MEMBERSHIP_TAB_LABEL;
/** @deprecated Use MEMBERSHIP_TAB_SHORT */
export const CARE_PLAN_TAB_SHORT = MEMBERSHIP_TAB_SHORT;

export function membershipHeading(planName: string) {
  return `${planName} · membership`;
}

export function membershipFallbackHeading() {
  return "Membership";
}

/** @deprecated Use membershipHeading */
export const carePlanHeading = membershipHeading;
/** @deprecated Use membershipFallbackHeading */
export const carePlanFallbackHeading = membershipFallbackHeading;
