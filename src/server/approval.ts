import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { ROStatus, type Prisma } from "@/generated/prisma";
import { hashAgreementContent } from "@/lib/agreement-hash";
import { resolveShopEstimateTerms } from "@/lib/estimate-terms-default";
import { buildServiceAdvisor, type ServiceAdvisorInfo } from "@/lib/service-advisor";
import { ensureAutoApplyFees } from "@/server/ro-fees";
import { sendRoAuthorizationEmail } from "@/server/services/ro-authorization-email";

export type ApproveOptions = {
  /** When set, only these jobs are marked authorized (partial approval). */
  approvedJobIds?: string[];
};

type Tx = Prisma.TransactionClient;

/** Mark jobs (and their labor/part lines) authorized or declined on an RO. */
export async function authorizeJobsForRo(
  tx: Tx,
  roId: string,
  shopId: string,
  approvedJobIds?: string[],
) {
  const now = new Date();
  const jobWhere = { repairOrderId: roId, shopId };

  if (approvedJobIds?.length) {
    const approved = approvedJobIds.filter(Boolean);
    await tx.job.updateMany({
      where: { ...jobWhere, id: { in: approved } },
      data: { authorized: true, approvedAt: now },
    });
    await tx.laborLine.updateMany({
      where: { shopId, job: { repairOrderId: roId, id: { in: approved } } },
      data: { authorized: true },
    });
    await tx.partLine.updateMany({
      where: { shopId, job: { repairOrderId: roId, id: { in: approved } } },
      data: { authorized: true },
    });
    await tx.job.updateMany({
      where: { ...jobWhere, id: { notIn: approved } },
      data: { authorized: false, approvedAt: null },
    });
    await tx.laborLine.updateMany({
      where: { shopId, job: { repairOrderId: roId, id: { notIn: approved } } },
      data: { authorized: false },
    });
    await tx.partLine.updateMany({
      where: { shopId, job: { repairOrderId: roId, id: { notIn: approved } } },
      data: { authorized: false },
    });
    return;
  }

  await tx.job.updateMany({
    where: jobWhere,
    data: { authorized: true, approvedAt: now },
  });
  await tx.laborLine.updateMany({
    where: { shopId, job: { repairOrderId: roId } },
    data: { authorized: true },
  });
  await tx.partLine.updateMany({
    where: { shopId, job: { repairOrderId: roId } },
    data: { authorized: true },
  });
}

/** Clear job/labor/part authorization when an RO is moved back to Estimates. */
export async function deauthorizeJobsForRo(tx: Tx, roId: string, shopId: string) {
  const jobWhere = { repairOrderId: roId, shopId };
  await tx.job.updateMany({
    where: jobWhere,
    data: { authorized: false, approvedAt: null },
  });
  await tx.laborLine.updateMany({
    where: { shopId, job: { repairOrderId: roId } },
    data: { authorized: false },
  });
  await tx.partLine.updateMany({
    where: { shopId, job: { repairOrderId: roId } },
    data: { authorized: false },
  });
}

/**
 * Approve an estimate and move it to Work-In-Progress. Shared by the shop-side
 * "Approve" action and the public customer approval link. Records who approved
 * and via which channel, and floats the card to the top of the WIP column.
 */
export async function approveAndStartWork(
  roId: string,
  shopId: string,
  via: "SHOP" | "CUSTOMER",
  by: string,
  options?: ApproveOptions,
) {
  const approvedJobIds = options?.approvedJobIds?.filter(Boolean);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const agg = await tx.repairOrder.aggregate({
      where: { shopId, status: ROStatus.IN_PROGRESS },
      _min: { boardOrder: true },
    });
    const boardOrder = (agg._min.boardOrder ?? 0) - 1;

    const updated = await tx.repairOrder.updateMany({
      where: {
        id: roId,
        shopId,
        status: { in: [ROStatus.ESTIMATE, ROStatus.APPROVED] },
      },
      data: {
        status: ROStatus.IN_PROGRESS,
        authorizedAt: now,
        authorizedBy: by,
        approvedVia: via,
        boardOrder,
      },
    });

    if (updated.count === 0) {
      const existing = await tx.repairOrder.findFirst({
        where: { id: roId, shopId },
        select: { status: true },
      });
      if (!existing) throw new Error("Repair order not found.");
      if (existing.status !== ROStatus.IN_PROGRESS) {
        throw new Error("This repair order cannot be authorized.");
      }
    }

    await authorizeJobsForRo(tx, roId, shopId, approvedJobIds);
  });

  if (via === "CUSTOMER") {
    // Compute declined jobs for partial approval emails.
    let declinedJobIds: string[] | undefined;
    if (approvedJobIds?.length) {
      const allJobs = await prisma.job.findMany({
        where: { repairOrderId: roId, shopId },
        select: { id: true },
      });
      const approvedSet = new Set(approvedJobIds);
      declinedJobIds = allJobs.map((j) => j.id).filter((id) => !approvedSet.has(id));
    }

    // Shop notification — must not block approval if email fails.
    void sendRoAuthorizationEmail(shopId, roId, {
      approvedJobIds: approvedJobIds?.length ? approvedJobIds : undefined,
      declinedJobIds: declinedJobIds?.length ? declinedJobIds : undefined,
    }).catch((err) => {
      console.error("[approval] RO authorization email failed:", err);
    });
  }
}

export type ApprovalView = {
  id: string;
  number: number;
  status: ROStatus;
  alreadyApproved: boolean;
  shopName: string;
  customerName: string;
  vehicleLabel: string;
  mileageIn: number | null;
  odometerNotWorking: boolean;
  laborSubtotalCents: number;
  partsSubtotalCents: number;
  shopSuppliesCents: number;
  feesSubtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  serviceAdvisor: ServiceAdvisorInfo;
  jobs: {
    id: string;
    name: string;
    laborHours: number;
    laborCents: number;
    partsCents: number;
    totalCents: number;
    authorized: boolean;
  }[];
  signature: {
    signerName: string | null;
    signedAt: Date;
    imageDataUrl: string | null;
  } | null;
  estimateTerms: {
    html: string;
    version: string;
    hash: string;
  };
};

/** Read an estimate for the public approval page, scoped only by its token. */
export async function getApprovalView(token: string): Promise<ApprovalView | null> {
  const found = await prisma.repairOrder.findUnique({
    where: { approvalToken: token },
    select: { id: true, shopId: true },
  });
  if (!found) return null;

  await ensureAutoApplyFees(found.shopId, found.id);

  const ro = await prisma.repairOrder.findUnique({
    where: { id: found.id },
    select: {
      id: true,
      number: true,
      status: true,
      mileageIn: true,
      odometerNotWorking: true,
      laborSubtotalCents: true,
      partsSubtotalCents: true,
      shopSuppliesCents: true,
      feesSubtotalCents: true,
      discountCents: true,
      taxCents: true,
      totalCents: true,
      serviceWriterId: true,
      approvedVia: true,
      authorizedBy: true,
      approvalSignerName: true,
      approvalSignedAt: true,
      approvalSignatureJson: true,
      estimateTermsVersion: true,
      estimateTermsHash: true,
      shop: {
        select: {
          name: true,
          estimateTermsHtml: true,
          estimateTermsVersion: true,
        },
      },
      customer: { select: { firstName: true, lastName: true, company: true } },
      vehicle: { select: { year: true, make: true, model: true, trim: true } },
      jobs: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          authorized: true,
          laborLines: { select: { hours: true, totalCents: true } },
          partLines: { select: { totalCents: true } },
        },
      },
    },
  });
  if (!ro) return null;

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

  const signatureJson = ro.approvalSignatureJson as {
    imageDataUrl?: string;
  } | null;

  const terms = resolveShopEstimateTerms(ro.shop);
  const termsHash = hashAgreementContent(terms.html);

  return {
    id: ro.id,
    number: ro.number,
    status: ro.status,
    alreadyApproved:
      ro.status !== ROStatus.ESTIMATE && ro.status !== ROStatus.APPROVED,
    shopName: ro.shop.name,
    customerName,
    vehicleLabel,
    mileageIn: ro.mileageIn,
    odometerNotWorking: ro.odometerNotWorking,
    laborSubtotalCents: ro.laborSubtotalCents,
    partsSubtotalCents: ro.partsSubtotalCents,
    shopSuppliesCents: ro.shopSuppliesCents,
    feesSubtotalCents: ro.feesSubtotalCents,
    discountCents: ro.discountCents,
    taxCents: ro.taxCents,
    totalCents: ro.totalCents,
    serviceAdvisor: buildServiceAdvisor(serviceWriter),
    signature: ro.approvalSignedAt
      ? {
          signerName: ro.approvalSignerName ?? ro.authorizedBy,
          signedAt: ro.approvalSignedAt as Date,
          imageDataUrl: signatureJson?.imageDataUrl ?? null,
        }
      : null,
    estimateTerms: {
      html: terms.html,
      version: terms.version,
      hash: termsHash,
    },
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
        authorized: j.authorized,
      };
    }),
  };
}

/** Record the first time a customer opens the public approval link (idempotent). */
export async function recordEstimateViewed(token: string): Promise<{ roId: string; number: number } | null> {
  const ro = await prisma.repairOrder.findUnique({
    where: { approvalToken: token },
    select: { id: true, number: true, estimateViewedAt: true },
  });
  if (!ro) return null;

  if (!ro.estimateViewedAt) {
    await prisma.repairOrder.update({
      where: { id: ro.id },
      data: { estimateViewedAt: new Date() },
    });
    revalidatePath("/job-board");
    revalidatePath("/workflow");
    revalidatePath("/dashboard");
    revalidatePath(`/repair-orders/${ro.id}`);
  }

  return { roId: ro.id, number: ro.number };
}
