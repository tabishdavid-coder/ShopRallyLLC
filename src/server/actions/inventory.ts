"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import {
  parseInventoryPartCsv,
  type ParsedInventoryPartCsvRow,
} from "@/lib/inventory-part-csv";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

const PartInput = z.object({
  partNumber: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  vendorName: z.string().trim().max(120).optional(),
  vendorPartNumber: z.string().trim().max(64).optional(),
  quantityOnHand: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  reorderQty: z.coerce.number().int().min(0).optional(),
  costCents: z.coerce.number().int().min(0),
  retailCents: z.coerce.number().int().min(0),
  binLocation: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateInventoryPartInput = z.infer<typeof PartInput>;
export type InventoryActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type InventoryPartImportResult =
  | { ok: true; created: number; skipped: number; rowErrors?: { row: number; message: string }[] }
  | { ok: false; error: string; rowErrors?: { row: number; message: string }[] };

async function createPartFromParsed(
  shopId: string,
  data: ParsedInventoryPartCsvRow,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await prisma.inventoryPart.findUnique({
    where: { shopId_partNumber: { shopId, partNumber: data.partNumber } },
    select: { id: true, active: true },
  });
  if (existing?.active) {
    return { ok: false, error: `Part # ${data.partNumber} already exists.` };
  }

  const part = await prisma.inventoryPart.create({
    data: {
      shopId,
      partNumber: data.partNumber,
      description: data.description,
      brand: data.brand || null,
      category: data.category || null,
      vendorName: data.vendorName || null,
      vendorPartNumber: data.vendorPartNumber || null,
      quantityOnHand: data.quantityOnHand,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
      costCents: data.costCents,
      retailCents: data.retailCents,
      binLocation: data.binLocation || null,
      notes: data.notes || null,
    },
    select: { id: true },
  });

  if (data.quantityOnHand > 0) {
    await prisma.inventoryAdjustment.create({
      data: {
        shopId,
        partId: part.id,
        delta: data.quantityOnHand,
        reason: "Initial stock",
      },
    });
  }

  return { ok: true, id: part.id };
}

export async function createInventoryPart(
  raw: CreateInventoryPartInput,
): Promise<InventoryActionResult> {
  const parsed = PartInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.inventoryPart.findUnique({
    where: { shopId_partNumber: { shopId, partNumber: data.partNumber } },
    select: { id: true, active: true },
  });
  if (existing?.active) {
    return { ok: false, error: "A part with this part number already exists." };
  }

  const part = await prisma.inventoryPart.create({
    data: {
      shopId,
      partNumber: data.partNumber,
      description: data.description,
      brand: data.brand || null,
      category: data.category || null,
      vendorName: data.vendorName || null,
      vendorPartNumber: data.vendorPartNumber || null,
      quantityOnHand: data.quantityOnHand,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
      costCents: data.costCents,
      retailCents: data.retailCents,
      binLocation: data.binLocation || null,
      notes: data.notes || null,
    },
    select: { id: true },
  });

  if (data.quantityOnHand > 0) {
    await prisma.inventoryAdjustment.create({
      data: {
        shopId,
        partId: part.id,
        delta: data.quantityOnHand,
        reason: "Initial stock",
      },
    });
  }

  revalidatePath("/inventory");
  return { ok: true, id: part.id };
}

const UpdatePartInput = PartInput.extend({ id: z.string().min(1) });
export type UpdateInventoryPartInput = z.infer<typeof UpdatePartInput>;

export async function updateInventoryPart(
  raw: UpdateInventoryPartInput,
): Promise<InventoryActionResult> {
  const parsed = UpdatePartInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const part = await prisma.inventoryPart.findFirst({
    where: { id: data.id, shopId, active: true },
    select: { id: true, partNumber: true },
  });
  if (!part) return { ok: false, error: "Part not found." };

  if (data.partNumber !== part.partNumber) {
    const dup = await prisma.inventoryPart.findUnique({
      where: { shopId_partNumber: { shopId, partNumber: data.partNumber } },
      select: { id: true, active: true },
    });
    if (dup?.active && dup.id !== data.id) {
      return { ok: false, error: "A part with this part number already exists." };
    }
  }

  await prisma.inventoryPart.update({
    where: { id: data.id },
    data: {
      partNumber: data.partNumber,
      description: data.description,
      brand: data.brand || null,
      category: data.category || null,
      vendorName: data.vendorName || null,
      vendorPartNumber: data.vendorPartNumber || null,
      reorderPoint: data.reorderPoint ?? 0,
      reorderQty: data.reorderQty ?? 0,
      costCents: data.costCents,
      retailCents: data.retailCents,
      binLocation: data.binLocation || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${data.id}`);
  return { ok: true, id: data.id };
}

const AdjustInput = z.object({
  partId: z.string().min(1),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Adjustment cannot be zero."),
  reason: z.string().trim().min(1).max(200),
});

export async function adjustInventoryQuantity(
  raw: z.infer<typeof AdjustInput>,
): Promise<InventoryActionResult> {
  const parsed = AdjustInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
  }
  const { partId, delta, reason } = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const part = await prisma.inventoryPart.findFirst({
    where: { id: partId, shopId, active: true },
    select: { id: true, quantityOnHand: true },
  });
  if (!part) return { ok: false, error: "Part not found." };

  const nextQty = part.quantityOnHand + delta;
  if (nextQty < 0) {
    return { ok: false, error: "Quantity cannot go below zero." };
  }

  await prisma.$transaction([
    prisma.inventoryPart.update({
      where: { id: partId },
      data: { quantityOnHand: nextQty },
    }),
    prisma.inventoryAdjustment.create({
      data: { shopId, partId, delta, reason },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${partId}`);
  return { ok: true, id: partId };
}

export async function deactivateInventoryPart(id: string): Promise<InventoryActionResult> {
  const shopId = await getShopId();
  const denied = await gates.inventoryDelete(shopId);
  if (denied) return { ok: false, error: denied.error };

  const part = await prisma.inventoryPart.findFirst({
    where: { id, shopId, active: true },
    select: { id: true },
  });
  if (!part) return { ok: false, error: "Part not found." };

  await prisma.inventoryPart.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/inventory");
  return { ok: true, id };
}

export async function importInventoryPartsCsv(csvText: string): Promise<InventoryPartImportResult> {
  const shopId = await getShopId();
  const denied = await gates.inventoryEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const { rows, errors } = parseInventoryPartCsv(csvText);
  if (errors.length > 0 && rows.length === 0) {
    return { ok: false, error: "Fix CSV errors and try again.", rowErrors: errors };
  }

  let created = 0;
  let skipped = 0;
  const rowErrors = [...errors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await createPartFromParsed(shopId, row);
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

  revalidatePath("/inventory");
  if (rowErrors.length > 0) {
    return { ok: true, created, skipped, rowErrors };
  }
  return { ok: true, created, skipped };
}
