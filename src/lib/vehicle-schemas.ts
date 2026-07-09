import { z } from "zod";

export const CreateVehicleInputSchema = z.object({
  customerId: z.string().min(1),
  vin: z.string().trim().max(17).optional(),
  year: z.number().int().optional().nullable(),
  make: z.string().trim().max(60).optional().nullable(),
  model: z.string().trim().max(60).optional().nullable(),
  trim: z.string().trim().max(60).optional().nullable(),
  engine: z.string().trim().max(80).optional().nullable(),
  transmission: z.string().trim().max(80).optional().nullable(),
  drivetrain: z.string().trim().max(40).optional().nullable(),
  bodyClass: z.string().trim().max(60).optional().nullable(),
  plate: z.string().trim().max(20).optional().nullable(),
  plateState: z.string().trim().max(4).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  unitNumber: z.string().trim().max(40).optional().nullable(),
  initialMileage: z.number().int().min(0).optional().nullable(),
  mileageUnits: z.enum(["miles", "km"]).optional().nullable(),
  tireSizeFront: z.string().trim().max(40).optional().nullable(),
  tireSizeRear: z.string().trim().max(40).optional().nullable(),
  decodedData: z.unknown().optional(),
});

export const UpdateVehicleInputSchema = CreateVehicleInputSchema.extend({
  id: z.string().min(1),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleInputSchema>;
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleInputSchema>;

export type CreateVehicleResult =
  | { ok: true; id: string; label: string }
  | { ok: false; error: string };

export type UpdateVehicleResult = CreateVehicleResult;
