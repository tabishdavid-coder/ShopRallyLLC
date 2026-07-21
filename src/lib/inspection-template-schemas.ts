import { z } from "zod";

export const InspectionTemplateItemInput = z.object({
  name: z.string().trim().min(1, "Item name is required.").max(200),
  category: z.string().trim().min(1, "Category is required.").max(100),
});

export const SaveInspectionTemplateInput = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
  items: z.array(InspectionTemplateItemInput).min(1, "Add at least one checklist item."),
  attachToRepairOrderId: z.string().min(1).optional(),
});

export type SaveInspectionTemplateInput = z.infer<typeof SaveInspectionTemplateInput>;

export type InspectionTemplatePickerRow = {
  id: string;
  name: string;
  itemCount: number;
  source: "builtin" | "shop";
  description?: string | null;
};
