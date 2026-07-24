/** DB enum values for estimate PartLine.lineType. */
export type PartLineTypeDb = "PART" | "TIRE" | "SUBLET" | "HAZARDOUS" | "OTHER";

/** Client-side part-family line types on estimate job cards. */
export const ESTIMATE_PART_LINE_TYPES = [
  "part",
  "tire",
  "sublet",
  "hazardous",
  "other",
] as const;

export type EstimatePartLineTypeUi = (typeof ESTIMATE_PART_LINE_TYPES)[number];

export function estimatePartLineTypeToDb(type: EstimatePartLineTypeUi): PartLineTypeDb {
  return type.toUpperCase() as PartLineTypeDb;
}

export function estimatePartLineTypeFromDb(
  type: PartLineTypeDb | string | null | undefined,
): EstimatePartLineTypeUi {
  const upper = (type ?? "PART").toUpperCase();
  if (upper === "TIRE") return "tire";
  if (upper === "SUBLET") return "sublet";
  if (upper === "HAZARDOUS") return "hazardous";
  if (upper === "OTHER") return "other";
  return "part";
}
