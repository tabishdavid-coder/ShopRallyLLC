import { NextResponse } from "next/server";

import { tireStockTemplateCsv } from "@/lib/tire-stock-csv";

export async function GET() {
  const csv = tireStockTemplateCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tire-stock-template.csv"',
    },
  });
}
