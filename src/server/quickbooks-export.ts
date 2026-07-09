import "server-only";

import { prisma } from "@/db/client";
import { toCsv } from "@/lib/csv";

/** QuickBooks-friendly invoice export (CSV stub — full API sync deferred). */
export async function buildQuickBooksInvoiceCsv(shopId: string): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: { shopId, status: { not: "VOID" } },
    orderBy: { issuedAt: "desc" },
    take: 500,
    select: {
      number: true,
      issuedAt: true,
      dueAt: true,
      subtotalCents: true,
      taxCents: true,
      totalCents: true,
      balanceCents: true,
      repairOrder: {
        select: {
          number: true,
          customer: {
            select: { firstName: true, lastName: true, company: true, email: true },
          },
        },
      },
      payments: { select: { amountCents: true, paidAt: true, method: true } },
    },
  });

  const rows = invoices.map((inv) => {
    const c = inv.repairOrder.customer;
    const customerName = c.company?.trim()
      ? c.company.trim()
      : `${c.lastName} ${c.firstName}`.trim();
    const paidCents = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    return {
      InvoiceNumber: inv.number,
      RepairOrderNumber: inv.repairOrder.number,
      CustomerName: customerName,
      CustomerEmail: c.email ?? "",
      IssuedDate: inv.issuedAt?.toISOString().slice(0, 10) ?? "",
      DueDate: inv.dueAt?.toISOString().slice(0, 10) ?? "",
      Subtotal: (inv.subtotalCents / 100).toFixed(2),
      Tax: (inv.taxCents / 100).toFixed(2),
      Total: (inv.totalCents / 100).toFixed(2),
      Paid: (paidCents / 100).toFixed(2),
      Balance: (inv.balanceCents / 100).toFixed(2),
    };
  });

  return toCsv(rows);
}
