import "server-only";

import { randomBytes } from "crypto";

import { prisma } from "@/db/client";
import { appUrl } from "@/lib/app-url";
import { DepositRequestStatus } from "@/generated/prisma";
import { buildServiceAdvisor, type ServiceAdvisorInfo } from "@/lib/service-advisor";

export type DepositRequestSummary = {
  id: string;
  amountCents: number;
  note: string | null;
  status: DepositRequestStatus;
  sentAt: Date | null;
  paidAt: Date | null;
  paidMethod: string | null;
  shareUrl: string;
};

export type DepositRequestView = {
  id: string;
  shopId: string;
  shopName: string;
  roNumber: number;
  customerName: string;
  vehicleLabel: string;
  amountCents: number;
  note: string | null;
  status: DepositRequestStatus;
  paidAt: Date | null;
  serviceAdvisor: ServiceAdvisorInfo;
};

/** Active or most recent deposit request for an RO (lab + merge path). */
export async function getDepositRequestForRo(
  shopId: string,
  repairOrderId: string,
): Promise<DepositRequestSummary | null> {
  const row = await prisma.depositRequest.findFirst({
    where: {
      shopId,
      repairOrderId,
      status: { in: [DepositRequestStatus.PENDING, DepositRequestStatus.PAID] },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      amountCents: true,
      note: true,
      status: true,
      sentAt: true,
      paidAt: true,
      paidMethod: true,
      shareToken: true,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    amountCents: row.amountCents,
    note: row.note,
    status: row.status,
    sentAt: row.sentAt,
    paidAt: row.paidAt,
    paidMethod: row.paidMethod,
    shareUrl: await appUrl(`/deposit/${row.shareToken}`),
  };
}

/** Public deposit page payload (no auth). */
export async function getDepositRequestView(shareToken: string): Promise<DepositRequestView | null> {
  const row = await prisma.depositRequest.findUnique({
    where: { shareToken },
    select: {
      id: true,
      shopId: true,
      amountCents: true,
      note: true,
      status: true,
      paidAt: true,
      repairOrder: {
        select: {
          number: true,
          serviceWriterId: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          vehicle: { select: { year: true, make: true, model: true, trim: true } },
          shop: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;

  const ro = row.repairOrder;
  const customerName =
    ro.customer.company?.trim() ||
    `${ro.customer.firstName ?? ""} ${ro.customer.lastName ?? ""}`.trim() ||
    "Customer";
  const vehicleLabel =
    [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model, ro.vehicle?.trim]
      .filter(Boolean)
      .join(" ") || "Vehicle";

  const serviceWriter = ro.serviceWriterId
    ? await prisma.user.findFirst({
        where: { id: ro.serviceWriterId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      })
    : null;

  return {
    id: row.id,
    shopId: row.shopId,
    shopName: ro.shop.name,
    roNumber: ro.number,
    customerName,
    vehicleLabel,
    amountCents: row.amountCents,
    note: row.note,
    status: row.status,
    paidAt: row.paidAt,
    serviceAdvisor: buildServiceAdvisor(serviceWriter),
  };
}

export function mintDepositShareToken(): string {
  return randomBytes(24).toString("base64url");
}
