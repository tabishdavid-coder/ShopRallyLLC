"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { approveAndStartWork } from "@/server/approval";
import { hashAgreementContent } from "@/lib/agreement-hash";
import { resolveShopEstimateTerms } from "@/lib/estimate-terms-default";
import { ROStatus } from "@/generated/prisma";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type ApproveResult =
  | { ok: true; alreadyApproved: boolean }
  | { ok: false; error: string };

const submitApprovalSchema = z.object({
  approvedJobIds: z.array(z.string()).min(1, "Select at least one job to approve."),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png", "Signature must be a PNG image.")
    .max(500_000, "Signature image is too large."),
  signatureWidth: z.number().int().positive().optional(),
  signatureHeight: z.number().int().positive().optional(),
  signerName: z.string().trim().min(1, "Enter your name.").max(200),
  consent: z.literal(true, { message: "You must authorize the selected work." }),
});

export type SubmitCustomerApprovalInput = z.infer<typeof submitApprovalSchema>;

/**
 * Public customer approval with partial job selection and signature capture.
 * Scoped only by the unguessable token (no shop auth).
 */
export async function submitCustomerApproval(
  token: string,
  input: SubmitCustomerApprovalInput,
): Promise<ApproveResult> {
  if (!token) return { ok: false, error: "Missing approval token." };

  const parsed = submitApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid approval data." };
  }

  const ro = await prisma.repairOrder.findUnique({
    where: { approvalToken: token },
    select: {
      id: true,
      shopId: true,
      status: true,
      jobs: { select: { id: true } },
      shop: {
        select: {
          estimateTermsHtml: true,
          estimateTermsVersion: true,
        },
      },
    },
  });
  if (!ro) return { ok: false, error: "This approval link is invalid or has expired." };

  if (ro.status !== ROStatus.ESTIMATE && ro.status !== ROStatus.APPROVED) {
    return { ok: true, alreadyApproved: true };
  }

  const jobIdSet = new Set(ro.jobs.map((j) => j.id));
  const approvedJobIds = parsed.data.approvedJobIds.filter((id) => jobIdSet.has(id));
  if (approvedJobIds.length === 0) {
    return { ok: false, error: "Select at least one valid job to approve." };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    null;
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  const signedAt = new Date();
  const signatureJson = {
    imageDataUrl: parsed.data.signatureDataUrl,
    width: parsed.data.signatureWidth ?? 0,
    height: parsed.data.signatureHeight ?? 0,
    ip,
    userAgent,
  };

  const terms = resolveShopEstimateTerms(ro.shop);
  const termsHash = hashAgreementContent(terms.html);

  await prisma.repairOrder.update({
    where: { id: ro.id },
    data: {
      approvalSignerName: parsed.data.signerName,
      approvalSignedAt: signedAt,
      approvalSignatureJson: signatureJson,
      estimateTermsVersion: terms.version,
      estimateTermsHash: termsHash,
    },
  });

  await approveAndStartWork(
    ro.id,
    ro.shopId,
    "CUSTOMER",
    parsed.data.signerName,
    { approvedJobIds },
  );

  await recordShopAuditEventSafe({
    shopId: ro.shopId,
    repairOrderId: ro.id,
    eventType: ShopAuditEventType.ESTIMATE_APPROVED_BY_CUSTOMER,
    summary: `Customer approved ${approvedJobIds.length} job(s) via approval link`,
    actor: null,
    metadata: {
      actorType: "customer",
      signerName: parsed.data.signerName,
      approvedJobIds,
      ip,
      userAgent,
      termsVersion: terms.version,
      termsHash,
    },
  });

  revalidatePath("/job-board");
  revalidatePath(`/repair-orders/${ro.id}`);
  revalidatePath(`/repair-orders/${ro.id}/estimate`);
  revalidatePath(`/repair-orders/${ro.id}/work-in-progress`);
  revalidatePath(`/approve/${token}`);
  return { ok: true, alreadyApproved: false };
}

/** @deprecated Use submitCustomerApproval — kept for backwards compatibility. */
export async function approveByToken(
  token: string,
  customerName?: string,
): Promise<ApproveResult> {
  if (!token) return { ok: false, error: "Missing approval token." };

  const ro = await prisma.repairOrder.findUnique({
    where: { approvalToken: token },
    select: { id: true, shopId: true, status: true, jobs: { select: { id: true } } },
  });
  if (!ro) return { ok: false, error: "This approval link is invalid or has expired." };

  if (ro.status !== ROStatus.ESTIMATE && ro.status !== ROStatus.APPROVED) {
    return { ok: true, alreadyApproved: true };
  }

  await approveAndStartWork(
    ro.id,
    ro.shopId,
    "CUSTOMER",
    customerName?.trim() || "Customer",
    { approvedJobIds: ro.jobs.map((j) => j.id) },
  );
  revalidatePath("/job-board");
  revalidatePath(`/repair-orders/${ro.id}`);
  revalidatePath(`/repair-orders/${ro.id}/estimate`);
  revalidatePath(`/repair-orders/${ro.id}/work-in-progress`);
  return { ok: true, alreadyApproved: false };
}
