import { z } from "zod";

export const SaveShopLaborItemInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  rateCents: z.number().int().min(0).max(999_999_99),
  defaultHours: z.number().min(0).max(99),
  costCents: z.number().int().min(0).max(999_999_99),
  taxable: z.boolean(),
  isActive: z.boolean(),
});

export type SaveShopLaborItemInput = z.infer<typeof SaveShopLaborItemInput>;
