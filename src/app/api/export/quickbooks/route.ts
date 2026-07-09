import { getShopId } from "@/lib/shop";
import { buildQuickBooksInvoiceCsv } from "@/server/quickbooks-export";

export async function GET() {
  const shopId = await getShopId();
  const csv = await buildQuickBooksInvoiceCsv(shopId);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quickbooks-invoices-${date}.csv"`,
    },
  });
}
