import { NextResponse } from "next/server";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const shopId = await getShopId();
  const parts = await prisma.inventoryPart.findMany({
    where: { shopId, active: true },
    orderBy: { partNumber: "asc" },
  });

  const header = [
    "partNumber",
    "description",
    "brand",
    "category",
    "vendorName",
    "vendorPartNumber",
    "quantityOnHand",
    "reorderPoint",
    "reorderQty",
    "costCents",
    "retailCents",
    "binLocation",
    "notes",
  ].join(",");

  const lines = parts.map((p) =>
    [
      p.partNumber,
      p.description,
      p.brand ?? "",
      p.category ?? "",
      p.vendorName ?? "",
      p.vendorPartNumber ?? "",
      String(p.quantityOnHand),
      String(p.reorderPoint),
      String(p.reorderQty),
      String(p.costCents),
      String(p.retailCents),
      p.binLocation ?? "",
      p.notes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header, ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory-parts.csv"',
    },
  });
}
