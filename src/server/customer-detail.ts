import "server-only";

import type { PaymentMethod } from "@/generated/prisma";
import { prisma } from "@/db/client";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Credit / Debit",
  CHECK: "Check",
  OTHER: "Other",
};

export type CustomerDetailRo = {
  id: string;
  number: number;
  status: string;
  totalCents: number;
  createdAt: Date;
  vehicleId: string | null;
  vehicleLabel: string;
  balanceCents: number | null;
};

export type CustomerDetailVehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
  unitNumber: string | null;
  notes: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  color: string | null;
};

export type CustomerDetail = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tags: string[];
  notes: string | null;
  marketingOptIn: boolean;
  transactionalSmsConsent: boolean;
  marketingEmailConsent: boolean;
  deletedAt: Date | null;
  anonymizedAt: Date | null;
  leadSource: string | null;
  createdAt: Date;
  vehicles: CustomerDetailVehicle[];
  repairOrders: CustomerDetailRo[];
  lifetimeTotalCents: number;
  openBalanceCents: number;
};

export type CustomerPaymentHistoryRow = {
  id: string;
  paidAt: Date;
  amountCents: number;
  method: PaymentMethod;
  methodLabel: string;
  reference: string | null;
  repairOrderId: string;
  repairOrderNumber: number;
  invoiceNumber: number;
};

export type CustomerPaymentSummary = {
  payments: CustomerPaymentHistoryRow[];
  totalPaidCents: number;
  lastPaymentAt: Date | null;
};

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "—";
}

export async function getCustomerDetail(
  shopId: string,
  customerId: string,
): Promise<CustomerDetail | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    include: {
      vehicles: {
        orderBy: [{ year: "desc" }, { make: "asc" }],
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          trim: true,
          vin: true,
          plate: true,
          plateState: true,
          unitNumber: true,
          notes: true,
          engine: true,
          transmission: true,
          drivetrain: true,
          bodyClass: true,
          color: true,
        },
      },
      repairOrders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
          vehicleId: true,
          vehicle: { select: { year: true, make: true, model: true } },
          invoice: { select: { balanceCents: true } },
        },
      },
    },
  });

  if (!customer) return null;

  const repairOrders: CustomerDetailRo[] = customer.repairOrders.map((ro) => ({
    id: ro.id,
    number: ro.number,
    status: ro.status,
    totalCents: ro.totalCents,
    createdAt: ro.createdAt,
    vehicleId: ro.vehicleId,
    vehicleLabel: ro.vehicle ? vehicleLabel(ro.vehicle) : "—",
    balanceCents: ro.invoice?.balanceCents ?? null,
  }));

  const lifetimeTotalCents = repairOrders.reduce((s, ro) => s + ro.totalCents, 0);
  const openBalanceCents = repairOrders.reduce(
    (s, ro) => s + (ro.balanceCents ?? 0),
    0,
  );

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    altPhone: customer.altPhone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    tags: customer.tags,
    notes: customer.notes,
    marketingOptIn: customer.marketingOptIn,
    transactionalSmsConsent: customer.transactionalSmsConsent,
    marketingEmailConsent: customer.marketingEmailConsent,
    deletedAt: customer.deletedAt,
    anonymizedAt: customer.anonymizedAt,
    leadSource: customer.leadSource,
    createdAt: customer.createdAt,
    vehicles: customer.vehicles,
    repairOrders,
    lifetimeTotalCents,
    openBalanceCents,
  };
}

/** All invoice payments for a customer, newest first. Shop-scoped via RO → customer. */
export async function getCustomerPaymentHistory(
  shopId: string,
  customerId: string,
): Promise<CustomerPaymentSummary> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { id: true },
  });
  if (!customer) {
    return { payments: [], totalPaidCents: 0, lastPaymentAt: null };
  }

  const rows = await prisma.payment.findMany({
    where: {
      shopId,
      invoice: {
        repairOrder: { customerId, shopId },
      },
    },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      amountCents: true,
      method: true,
      reference: true,
      paidAt: true,
      invoice: {
        select: {
          number: true,
          repairOrder: { select: { id: true, number: true } },
        },
      },
    },
  });

  const payments: CustomerPaymentHistoryRow[] = rows.map((p) => ({
    id: p.id,
    paidAt: new Date(p.paidAt),
    amountCents: p.amountCents,
    method: p.method,
    methodLabel: PAYMENT_METHOD_LABELS[p.method],
    reference: p.reference,
    repairOrderId: p.invoice.repairOrder.id,
    repairOrderNumber: p.invoice.repairOrder.number,
    invoiceNumber: p.invoice.number,
  }));

  const totalPaidCents = payments.reduce((s, p) => s + p.amountCents, 0);
  const lastPaymentAt = payments[0]?.paidAt ?? null;

  return { payments, totalPaidCents, lastPaymentAt };
}
