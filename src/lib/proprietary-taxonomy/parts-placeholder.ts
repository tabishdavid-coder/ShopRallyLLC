/**
 * P1 generic-category placeholder map — operation leaf → scrape key.
 * Deterministic application constants; never inferred by the LLM for pricing.
 */

export type PartsPlaceholder = {
  genericCategoryKey: string;
  defaultQuantity: number;
};

function positionToken(hints: string[]): string {
  const upper = hints.map((h) => h.toUpperCase());
  if (upper.includes("FRONT")) return "FRONT";
  if (upper.includes("REAR")) return "REAR";
  return "ALL";
}

function materialToken(flags: string[]): string {
  const set = new Set(flags.map((f) => f.toLowerCase()));
  if (set.has("ceramic")) return "CERAMIC";
  if (set.has("semi_metallic") || set.has("semi-metallic")) return "SEMI_METALLIC";
  if (set.has("organic")) return "ORGANIC";
  return "STANDARD";
}

function tierToken(flags: string[]): string {
  const set = new Set(flags.map((f) => f.toLowerCase()));
  if (set.has("premium")) return "PREMIUM";
  if (set.has("economy")) return "ECONOMY";
  if (set.has("oem")) return "OEM";
  return "STANDARD";
}

/**
 * Map a billable operation key + variant/position hints to a generic category
 * used to trigger low-cost supplier scrapers / account catalog sweeps.
 */
export function resolvePartsPlaceholder(
  operationKey: string,
  variantFlags: string[] = [],
  positionHints: string[] = [],
): PartsPlaceholder | null {
  const key = operationKey.toUpperCase();
  const pos = positionToken(positionHints);
  const material = materialToken(variantFlags);
  const tier = tierToken(variantFlags);

  if (/\.PADS\.R_AND_R$/.test(key) || key.endsWith(".PADS.R_AND_R")) {
    return {
      genericCategoryKey: `BRAKE_PAD_${pos}_${material}_${tier}`,
      defaultQuantity: 1,
    };
  }
  if (/\.ROTORS\.R_AND_R$/.test(key)) {
    return {
      genericCategoryKey: `BRAKE_ROTOR_${pos}_${tier}`,
      defaultQuantity: 2,
    };
  }
  if (key.includes("ENGINE.OIL.FILTER") || /\.OIL\.FILTER\./.test(key)) {
    return {
      genericCategoryKey: `OIL_FILTER_${tier}`,
      defaultQuantity: 1,
    };
  }

  // Fallback: last two segments of the operation key as a category stub.
  const parts = key.split(".");
  if (parts.length >= 2) {
    return {
      genericCategoryKey: `${parts[parts.length - 2]}_${parts[parts.length - 1]}_${tier}`,
      defaultQuantity: 1,
    };
  }
  return null;
}
