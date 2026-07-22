import { NextResponse } from "next/server";

import { inventoryPartTemplateCsv } from "@/lib/inventory-part-csv";

export async function GET() {
  const csv = inventoryPartTemplateCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory-parts-template.csv"',
    },
  });
}
