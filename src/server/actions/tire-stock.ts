"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { parseTireStockCsv, type ParsedTireStockCsvRow } from "@/lib/tire-stock-csv";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

const TireInput = z.object({
  stockNumber: z.string().trim().min(1).max(64),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  size: z.string().trim().min(1).max(32),
  width: z.coerce.number().int().min(1).max(999).optional(),
  aspectRatio: z.coerce.number().int().min(1).max(99).optional(),
  rimDiameter: z.coerce.number().int().min(1).max(99).optional(),
  loadSpeed: z.string().trim().max(16).optional(),
  seasonality: z.enum(["SUMMER", "WINTER", "ALL_SEASON", "ALL_WEATHER"]).optional(),
  condition: z.enum(["NEW", "USED"]),
  quantityOnHand: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  reorderQty: z.coerce.number().int().min(0).optional(),
  costCents: z.coerce.number().int().min(0),
  retailCents: z.coerce.number().int().min(0),
  binLocation: z.string().trim().max(40).optional(),
  dotCode: z.string().trim().max(16).optional(),
  treadDepth32nds: z.coerce.number().int().min(0).max(32).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateTireStockInput = z.infer<typeof TireInput>;
export type TireStockActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type TireStockImportResult =
  | { ok: true; created: number; skipped: number; rowErrors?: { row: number; message: string }[] }
  | { ok: false; error: string; rowErrors?: { row: number; message: string }[] };

async function createTireFromParsed(
  shopId: string,
  data: ParsedTireStockCsvRow,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await prisma.tireStock.findUnique({
    where: { shopId_stockNumber: { shopId, stockNumber: data.stockNumber } },
    select: { id: true, active: true },
  });
  if (existing?.active) {
    return { ok: false, error: `Stock # ${data.stockNumber} already exists.` };
  }

  const tire = await prisma.tireStock.create({
    data: {
      shopId,
      stockNumber: data.stockNumber,
      brand: data.brand,
      model: data.model,
      size: data.size,
      width: data.width ?? null,
      aspectRatio: data.aspectRatio ?? null,
      rimDiameter: data.rimDiameter ?? null,
      loadSpeed: data.loadSpeed || null,
      seasonality: data.seasonality ?? null,
      condition: data.condition,
      quantityOnHand: data.quantityOnHand,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
      costCents: data.costCents,
      retailCents: data.retailCents,
      binLocation: data.binLocation || null,
      dotCode: data.dotCode || null,
      treadDepth32nds: data.treadDepth32nds ?? null,
      notes: data.notes || null,
    },
    select: { id: true },
  });

  if (data.quantityOnHand > 0) {
    await prisma.tireStockAdjustment.create({
      data: {
        shopId,
        tireId: tire.id,
        delta: data.quantityOnHand,
        reason: "Initial stock",
      },
    });
  }

  return { ok: true, id: tire.id };
}

export async function createTireStock(
  raw: CreateTireStockInput,
): Promise<TireStockActionResult> {
  const parsed = TireInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const result = await createTireFromParsed(shopId, parsed.data);
  if (!result.ok) return result;

  revalidatePath("/tires");
  return result;
}

const UpdateTireInput = TireInput.extend({ id: z.string().min(1) });
export type UpdateTireStockInput = z.infer<typeof UpdateTireInput>;

export async function updateTireStock(
  raw: UpdateTireStockInput,
): Promise<TireStockActionResult> {
  const parsed = UpdateTireInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const tire = await prisma.tireStock.findFirst({
    where: { id: data.id, shopId, active: true },
    select: { id: true, stockNumber: true },
  });
  if (!tire) return { ok: false, error: "Tire not found." };

  if (data.stockNumber !== tire.stockNumber) {
    const dup = await prisma.tireStock.findUnique({
      where: { shopId_stockNumber: { shopId, stockNumber: data.stockNumber } },
      select: { id: true, active: true },
    });
    if (dup?.active && dup.id !== data.id) {
      return { ok: false, error: "A tire with this stock number already exists." };
    }
  }

  await prisma.tireStock.update({
    where: { id: data.id },
    data: {
      stockNumber: data.stockNumber,
      brand: data.brand,
      model: data.model,
      size: data.size,
      width: data.width ?? null,
      aspectRatio: data.aspectRatio ?? null,
      rimDiameter: data.rimDiameter ?? null,
      loadSpeed: data.loadSpeed || null,
      seasonality: data.seasonality ?? null,
      condition: data.condition,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
      costCents: data.costCents,
      retailCents: data.retailCents,
      binLocation: data.binLocation || null,
      dotCode: data.dotCode || null,
      treadDepth32nds: data.treadDepth32nds ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/tires");
  revalidatePath(`/tires/${data.id}`);
  return { ok: true, id: data.id };
}

const AdjustInput = z.object({
  tireId: z.string().min(1),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Adjustment cannot be zero."),
  reason: z.string().trim().min(1).max(200),
});

export async function adjustTireQuantity(
  raw: z.infer<typeof AdjustInput>,
): Promise<TireStockActionResult> {
  const parsed = AdjustInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  }
  const { tireId, delta, reason } = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const tire = await prisma.tireStock.findFirst({
    where: { id: tireId, shopId, active: true },
    select: { id: true, quantityOnHand: true },
  });
  if (!tire) return { ok: false, error: "Tire not found." };

  const nextQty = tire.quantityOnHand + delta;
  if (nextQty < 0) {
    return { ok: false, error: "Quantity cannot go below zero." };
  }

  await prisma.$transaction([
    prisma.tireStock.update({
      where: { id: tireId },
      data: { quantityOnHand: nextQty },
    }),
    prisma.tireStockAdjustment.create({
      data: { shopId, tireId, delta, reason },
    }),
  ]);

  revalidatePath("/tires");
  revalidatePath(`/tires/${tireId}`);
  return { ok: true, id: tireId };
}

export async function deactivateTireStock(id: string): Promise<TireStockActionResult> {
  const shopId = await getShopId();
  const denied = await gates.inventoryDelete(shopId);
  if (denied) return { ok: false, error: denied.error };

  const tire = await prisma.tireStock.findFirst({
    where: { id, shopId, active: true },
    select: { id: true },
  });
  if (!tire) return { ok: false, error: "Tire not found." };

  await prisma.tireStock.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/tires");
  return { ok: true, id };
}

export async function importTireStockCsv(csvText: string): Promise<TireStockImportResult> {
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const { rows, errors } = parseTireStockCsv(csvText);
  if (errors.length > 0 && rows.length === 0) {
    return { ok: false, error: "Fix CSV errors and try again.", rowErrors: errors };
  }

  let created = 0;
  let skipped = 0;
  const rowErrors = [...errors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await createTireFromParsed(shopId, row);
    if (result.ok) {
      created++;
    } else {
      skipped++;
      rowErrors.push({ row: i + 2, message: result.error });
    }
  }

  if (created === 0) {
    return {
      ok: false,
      error: rowErrors.length ? "No rows imported." : "No data rows found.",
      rowErrors,
    };
  }

  revalidatePath("/tires");
  if (rowErrors.length > 0) {
    return { ok: true, created, skipped, rowErrors };
  }
  return { ok: true, created, skipped };
}
