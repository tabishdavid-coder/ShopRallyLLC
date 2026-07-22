import { NextResponse } from "next/server";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { TIRE_STOCK_CSV_HEADERS } from "@/lib/tire-stock";

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const shopId = await getShopId();
  const tires = await prisma.tireStock.findMany({
    where: { shopId, active: true },
    orderBy: { stockNumber: "asc" },
  });

  const header = TIRE_STOCK_CSV_HEADERS.join(",");

  const lines = tires.map((t) =>
    [
      t.stockNumber,
      t.brand,
      t.model,
      t.size,
      t.loadSpeed ?? "",
      t.condition,
      String(t.quantityOnHand),
      String(t.reorderPoint),
      String(t.reorderQty),
      (t.costCents / 100).toFixed(2),
      (t.retailCents / 100).toFixed(2),
      t.binLocation ?? "",
      t.dotCode ?? "",
      t.treadDepth32nds != null ? String(t.treadDepth32nds) : "",
      t.notes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header, ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tire-stock.csv"',
    },
  });
}
