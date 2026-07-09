import { z } from "zod";

import type { LaborGuideVehicle } from "@/server/actions/labor-guide";

export const QuickLaborVehicleSchema = z
  .object({
    vin: z.string().trim().max(17).optional().nullable(),
    year: z.number().int().optional().nullable(),
    make: z.string().trim().max(60).optional().nullable(),
    model: z.string().trim().max(60).optional().nullable(),
    trim: z.string().trim().max(60).optional().nullable(),
    engine: z.string().trim().max(80).optional().nullable(),
    drivetrain: z.string().trim().max(40).optional().nullable(),
    plate: z.string().trim().max(20).optional().nullable(),
    plateState: z.string().trim().max(4).optional().nullable(),
  })
  .refine(
    (v) => Boolean(v.vin?.trim()) || (v.year && v.make?.trim() && v.model?.trim()),
    { message: "Decode a VIN or plate, or enter year, make, and model." },
  );

export type QuickLaborVehicle = z.infer<typeof QuickLaborVehicleSchema>;

export function quickLaborVehicleLabel(v: QuickLaborVehicle): string {
  const ymm = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  if (ymm) return ymm;
  if (v.vin) return v.vin;
  if (v.plate) return [v.plate, v.plateState].filter(Boolean).join(" · ");
  return "Vehicle";
}

export function quickLaborSpecLine(v: QuickLaborVehicle): string {
  return [v.engine, v.drivetrain].filter(Boolean).join(" · ");
}

export function toLaborGuideVehicle(v: QuickLaborVehicle): LaborGuideVehicle {
  return {
    vin: v.vin ?? null,
    year: v.year ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    trim: v.trim ?? null,
    engine: v.engine ?? null,
    drivetrain: v.drivetrain ?? null,
  };
}
