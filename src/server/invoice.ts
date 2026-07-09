import "server-only";

import { randomBytes } from "crypto";

import { prisma } from "@/db/client";
import { appUrl } from "@/lib/app-url";
import { InvoiceStatus, ROStatus } from "@/generated/prisma";
import { resolveShopInvoiceTerms } from "@/lib/estimate-terms-default";
import { buildServiceAdvisor, type ServiceAdvisorInfo } from "@/lib/service-advisor";
import { ensureAutoApplyFees } from "@/server/ro-fees";

/** Create an invoice for a completed repair order if one does not exist yet. */
export async function ensureInvoiceForRepairOrder(roId: string, shopId: string) {
  const existing = await prisma.invoice.findFirst({ where: { repairOrderId: roId, shopId } });
  if (existing) return existing;

  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: {
      status: true,
      laborSubtotalCents: true,
      partsSubtotalCents: true,
      shopSuppliesCents: true,
      feesSubtotalCents: true,
      discountCents: true,
      taxCents: true,
      totalCents: true,
      invoice: { select: { id: true } },
    },
  });
  if (!ro || ro.invoice) return null;
  if (ro.status !== ROStatus.COMPLETED && ro.status !== ROStatus.INVOICED) return null;

  const agg = await prisma.invoice.aggregate({ where: { shopId }, _max: { number: true } });
  const nextNumber = (agg._max.number ?? 5000) + 1;
  const subtotal =
    ro.laborSubtotalCents +
    ro.partsSubtotalCents +
    ro.shopSuppliesCents +
    ro.feesSubtotalCents -
    ro.discountCents;

  return prisma.invoice.create({
    data: {
      shopId,
      repairOrderId: roId,
      number: nextNumber,
      status: InvoiceStatus.SENT,
      subtotalCents: subtotal,
      taxCents: ro.taxCents,
      totalCents: ro.totalCents,
      balanceCents: ro.totalCents,
      issuedAt: new Date(),
      shareToken: randomBytes(24).toString("base64url"),
    },
  });
}

export type LinkResult = { ok: true; url: string; invoiceId: string } | { ok: false; error: string };

/** Mint (or reuse) the public invoice share link. Creates an invoice if needed. */
export async function getInvoiceShareLink(
  opts: { shopId: string; invoiceId?: string; repairOrderId?: string },
): Promise<LinkResult> {
  let invoice = opts.invoiceId
    ? await prisma.invoice.findFirst({
        where: { id: opts.invoiceId, shopId: opts.shopId },
        select: { id: true, shareToken: true },
      })
    : opts.repairOrderId
      ? await prisma.invoice.findFirst({
          where: { repairOrderId: opts.repairOrderId, shopId: opts.shopId },
          select: { id: true, shareToken: true },
        })
      : null;

  if (!invoice && opts.repairOrderId) {
    const created = await ensureInvoiceForRepairOrder(opts.repairOrderId, opts.shopId);
    if (created) invoice = { id: created.id, shareToken: created.shareToken };
  }

  if (!invoice) return { ok: false, error: "Invoice not found." };

  const token = invoice.shareToken ?? randomBytes(24).toString("base64url");
  if (!invoice.shareToken) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { shareToken: token, shareSentAt: new Date() },
    });
  }

  return { ok: true, url: await appUrl(`/invoice/${token}`), invoiceId: invoice.id };
}

export type InvoiceView = {
  id: string;
  shopId: string;
  number: number;
  status: InvoiceStatus;
  shopName: string;
  customerName: string;
  vehicleLabel: string;
  mileageIn: number | null;
  odometerNotWorking: boolean;
  roNumber: number;
  laborSubtotalCents: number;
  partsSubtotalCents: number;
  shopSuppliesCents: number;
  feesSubtotalCents: number;
  discountCents: number;
  taxCents: number;
  subtotalCents: number;
  totalCents: number;
  balanceCents: number;
  issuedAt: Date | null;
  serviceAdvisor: ServiceAdvisorInfo;
  jobs: {
    id: string;
    name: string;
    laborHours: number;
    laborCents: number;
    partsCents: number;
    totalCents: number;
  }[];
  payments: { amountCents: number; method: string; paidAt: Date }[];
  invoiceTerms: { html: string };
};

/** Read an invoice for the public share page, scoped only by its token. */
export async function getInvoiceView(token: string): Promise<InvoiceView | null> {
  const invRef = await prisma.invoice.findUnique({
    where: { shareToken: token },
    select: { repairOrderId: true, shopId: true },
  });
  if (!invRef) return null;

  await ensureAutoApplyFees(invRef.shopId, invRef.repairOrderId);

  const inv = await prisma.invoice.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      number: true,
      status: true,
      subtotalCents: true,
      taxCents: true,
      totalCents: true,
      balanceCents: true,
      issuedAt: true,
      payments: { select: { amountCents: true, method: true, paidAt: true }, orderBy: { paidAt: "asc" } },
      repairOrder: {
        select: {
          number: true,
          mileageIn: true,
          odometerNotWorking: true,
          laborSubtotalCents: true,
          partsSubtotalCents: true,
          shopSuppliesCents: true,
          feesSubtotalCents: true,
          discountCents: true,
          serviceWriterId: true,
          shop: { select: { name: true, invoiceTermsHtml: true } },
          customer: { select: { firstName: true, lastName: true, company: true } },
          vehicle: { select: { year: true, make: true, model: true, trim: true } },
          jobs: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              laborLines: { select: { hours: true, totalCents: true } },
              partLines: { select: { totalCents: true } },
            },
          },
        },
      },
    },
  });
  if (!inv) return null;

  const ro = inv.repairOrder;
  const serviceWriter = ro.serviceWriterId
    ? await prisma.user.findUnique({
        where: { id: ro.serviceWriterId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      })
    : null;

  const customerName =
    ro.customer.company?.trim() ||
    `${ro.customer.firstName ?? ""} ${ro.customer.lastName ?? ""}`.trim();
  const vehicleLabel =
    [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model, ro.vehicle?.trim]
      .filter(Boolean)
      .join(" ") || "Vehicle";

  const invoiceTerms = resolveShopInvoiceTerms({
    invoiceTermsHtml: ro.shop.invoiceTermsHtml,
  });

  return {
    id: inv.id,
    shopId: invRef.shopId,
    number: inv.number,
    status: inv.status,
    shopName: ro.shop.name,
    customerName,
    vehicleLabel,
    mileageIn: ro.mileageIn,
    odometerNotWorking: ro.odometerNotWorking,
    roNumber: ro.number,
    laborSubtotalCents: ro.laborSubtotalCents,
    partsSubtotalCents: ro.partsSubtotalCents,
    shopSuppliesCents: ro.shopSuppliesCents,
    feesSubtotalCents: ro.feesSubtotalCents,
    discountCents: ro.discountCents,
    taxCents: inv.taxCents,
    subtotalCents: inv.subtotalCents,
    totalCents: inv.totalCents,
    balanceCents: inv.balanceCents,
    issuedAt: inv.issuedAt,
    serviceAdvisor: buildServiceAdvisor(serviceWriter),
    invoiceTerms,
    jobs: ro.jobs.map((j) => {
      const laborHours = j.laborLines.reduce((s, l) => s + l.hours, 0);
      const laborCents = j.laborLines.reduce((s, l) => s + l.totalCents, 0);
      const partsCents = j.partLines.reduce((s, p) => s + p.totalCents, 0);
      return {
        id: j.id,
        name: j.name,
        laborHours,
        laborCents,
        partsCents,
        totalCents: laborCents + partsCents,
      };
    }),
    payments: inv.payments.map((p) => ({
      amountCents: p.amountCents,
      method: p.method,
      paidAt: p.paidAt,
    })),
  };
}
