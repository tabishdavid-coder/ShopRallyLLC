import { z } from "zod";

export const CannedJobPartLineTypeSchema = z.enum(["PART", "TIRE", "SUBLET", "OTHER"]);
export type CannedJobPartLineType = z.infer<typeof CannedJobPartLineTypeSchema>;

/** Client-side part line type (lowercase). */
export const CANNED_JOB_PART_LINE_TYPES = ["part", "tire", "sublet", "other"] as const;
export type CannedJobPartLineTypeUi = (typeof CANNED_JOB_PART_LINE_TYPES)[number];

export function partLineTypeToDb(type: CannedJobPartLineTypeUi): CannedJobPartLineType {
  return type.toUpperCase() as CannedJobPartLineType;
}

export function partLineTypeFromDb(type: CannedJobPartLineType | string): CannedJobPartLineTypeUi {
  const upper = type.toUpperCase();
  if (upper === "TIRE") return "tire";
  if (upper === "SUBLET") return "sublet";
  if (upper === "OTHER") return "other";
  return "part";
}

export const CannedJobLaborLineInput = z.object({
  id: z.string().optional(),
  description: z.string().trim().max(300),
  hours: z.number().min(0).max(1000),
  flatAmountCents: z.number().int().min(0).nullable().optional(),
});

export const CannedJobPartLineInput = z.object({
  id: z.string().optional(),
  lineType: CannedJobPartLineTypeSchema.default("PART"),
  brand: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(300),
  partNumber: z.string().trim().max(100).nullable().optional(),
  costCents: z.number().int().min(0),
  quantity: z.number().int().min(1).max(9999),
  inventoryPartId: z.string().nullable().optional(),
  tireStockId: z.string().nullable().optional(),
});

const AdjustMethod = z.enum(["PERCENT", "FIXED"]);
const AdjustBase = z.enum(["LABOR", "PARTS", "LABOR_PARTS"]);

export const CannedJobFeeLineInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  method: AdjustMethod.default("FIXED"),
  base: AdjustBase.default("LABOR_PARTS"),
  amount: z.number().int().min(0),
  capCents: z.number().int().min(0).nullable().optional(),
  taxable: z.boolean().default(false),
});

export const CannedJobDiscountLineInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  method: AdjustMethod.default("FIXED"),
  base: AdjustBase.default("LABOR_PARTS"),
  amount: z.number().int().min(0),
});

export const CannedJobInspectionLineInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(300).nullable().optional(),
  inspectionTemplateId: z.string().nullable().optional(),
  hours: z.number().min(0).max(1000),
  flatAmountCents: z.number().int().min(0).nullable().optional(),
});

export const SaveCannedJobInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Job name is required.").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  isActive: z.boolean().default(true),
  laborLines: z.array(CannedJobLaborLineInput).max(50),
  partLines: z.array(CannedJobPartLineInput).max(100),
  feeLines: z.array(CannedJobFeeLineInput).max(20).default([]),
  discountLines: z.array(CannedJobDiscountLineInput).max(20).default([]),
  inspectionLines: z.array(CannedJobInspectionLineInput).max(20).default([]),
});

export type SaveCannedJobInput = z.infer<typeof SaveCannedJobInput>;
export type CannedJobLaborLineInput = z.infer<typeof CannedJobLaborLineInput>;
export type CannedJobPartLineInput = z.infer<typeof CannedJobPartLineInput>;
export type CannedJobFeeLineInput = z.infer<typeof CannedJobFeeLineInput>;
export type CannedJobDiscountLineInput = z.infer<typeof CannedJobDiscountLineInput>;
export type CannedJobInspectionLineInput = z.infer<typeof CannedJobInspectionLineInput>;

/** Save an estimate job as a canned template (star icon flow). */
export const SaveJobAsCannedJobInput = z.object({
  jobId: z.string().min(1),
  name: z.string().trim().min(1, "Job name is required.").max(200).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export type SaveJobAsCannedJobInput = z.infer<typeof SaveJobAsCannedJobInput>;

/** Preset category options for create/edit select (None = empty string). */
export const CANNED_JOB_CATEGORY_SELECT_OPTIONS = [
  "Brakes",
  "Electrical",
  "Engine",
  "Fluids",
  "Inspection",
  "Maintenance",
  "Other",
  "Suspension",
] as const;

/** Default categories shown in the picker when the shop has none yet. */
export const CANNED_JOB_CATEGORIES = [
  ...CANNED_JOB_CATEGORY_SELECT_OPTIONS,
] as const;

const CANNED_JOB_PRESET_SET = new Set<string>(CANNED_JOB_CATEGORY_SELECT_OPTIONS);

/** Map stored category → select value + optional custom label (edit mode). */
export function deriveCategoryUi(category: string): { select: string; custom: string } {
  if (!category) return { select: "", custom: "" };
  if (CANNED_JOB_PRESET_SET.has(category) && category !== "Other") {
    return { select: category, custom: "" };
  }
  return { select: "Other", custom: category === "Other" ? "" : category };
}

/** Map UI select + custom input → persisted category string. */
export function resolveCategoryFromUi(select: string, custom: string): string {
  if (!select) return "";
  if (select === "Other") return custom.trim();
  return select;
}
