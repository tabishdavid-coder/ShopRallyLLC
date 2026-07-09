"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { hashAgreementContent } from "@/lib/agreement-hash";
import { getCurrentUser, isPlatformAdmin } from "@/lib/platform";
import { gates } from "@/server/permission-gates";
import { AgreementType, type Prisma } from "@/generated/prisma";

export type CustomMsaActionResult = { ok: true } | { ok: false; error: string };

const UpsertCustomMsaInput = z.object({
  shopId: z.string().min(1),
  legalEntityName: z.string().trim().min(1).max(200),
  version: z.string().trim().min(1).max(40),
  effectiveDate: z.string().min(1),
  contentHtml: z.string().trim().min(1).max(200_000),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s?.length ? s : null)),
  adminAttestation: z.literal(true, {
    message: "Confirm the shop owner signed this MSA offline.",
  }),
  signerName: z.string().trim().min(1).max(120),
  signerEmail: z.string().trim().email().max(160),
});

export type UpsertCustomMsaInput = z.infer<typeof UpsertCustomMsaInput>;

/** Platform admin: attach or replace a shop's enterprise custom MSA. */
export async function upsertShopCustomMsa(
  raw: Omit<UpsertCustomMsaInput, "adminAttestation"> & { adminAttestation: boolean },
): Promise<CustomMsaActionResult> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = UpsertCustomMsaInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const effectiveDate = new Date(parsed.data.effectiveDate);
  if (Number.isNaN(effectiveDate.getTime())) {
    return { ok: false, error: "Enter a valid effective date." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: parsed.data.shopId },
    select: { id: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  const admin = await getCurrentUser();
  const contentHash = hashAgreementContent(parsed.data.contentHtml);

  await prisma.$transaction(async (tx) => {
    await tx.shopCustomAgreement.upsert({
      where: { shopId: parsed.data.shopId },
      create: {
        shopId: parsed.data.shopId,
        legalEntityName: parsed.data.legalEntityName,
        version: parsed.data.version,
        contentHtml: parsed.data.contentHtml,
        contentHash,
        effectiveDate,
        notes: parsed.data.notes,
        uploadedById: admin.id,
      },
      update: {
        legalEntityName: parsed.data.legalEntityName,
        version: parsed.data.version,
        contentHtml: parsed.data.contentHtml,
        contentHash,
        effectiveDate,
        notes: parsed.data.notes,
        uploadedById: admin.id,
        uploadedAt: new Date(),
      },
    });

    await tx.shop.update({
      where: { id: parsed.data.shopId },
      data: {
        legalEntityName: parsed.data.legalEntityName,
      },
    });

    await tx.legalAcceptance.create({
      data: {
        shopId: parsed.data.shopId,
        userId: admin.id,
        agreementType: AgreementType.CUSTOM_MSA,
        agreementVersion: parsed.data.version,
        contentHash,
        signerName: parsed.data.signerName,
        signerTitle: "Owner",
        signerEmail: parsed.data.signerEmail,
        acceptanceMethod: "admin_attestation",
        metadata: {
          legalEntityName: parsed.data.legalEntityName,
          effectiveDate: effectiveDate.toISOString(),
          notes: parsed.data.notes,
          attestedByAdminId: admin.id,
        } satisfies Record<string, unknown> as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath("/platform/legal");
  revalidatePath(`/platform/shops/${parsed.data.shopId}`);
  revalidatePath(`/platform/shops/${parsed.data.shopId}/legal`);
  revalidatePath("/settings/legal");
  return { ok: true };
}

const EstimateTermsInput = z.object({
  estimateTermsHtml: z.string().trim().min(1, "Estimate terms are required.").max(100_000),
  invoiceTermsHtml: z
    .string()
    .trim()
    .max(100_000)
    .optional()
    .transform((s) => (s?.length ? s : null)),
});

export type EstimateTermsInput = z.infer<typeof EstimateTermsInput>;

export type EstimateTermsActionResult = { ok: true } | { ok: false; error: string };

/** Save shop customer-facing estimate/invoice terms (Settings → Estimate Terms). */
export async function updateEstimateTerms(
  raw: EstimateTermsInput,
): Promise<EstimateTermsActionResult> {
  const parsed = EstimateTermsInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { getShopId } = await import("@/lib/shop");
  const { bumpEstimateTermsVersion } = await import("@/lib/estimate-terms-default");

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const existing = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { estimateTermsHtml: true, estimateTermsVersion: true },
  });
  if (!existing) return { ok: false, error: "Shop not found." };

  const contentChanged =
    existing.estimateTermsHtml?.trim() !== parsed.data.estimateTermsHtml.trim();
  const nextVersion = contentChanged
    ? bumpEstimateTermsVersion(existing.estimateTermsVersion)
    : existing.estimateTermsVersion ?? "1.0";

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      estimateTermsHtml: parsed.data.estimateTermsHtml,
      invoiceTermsHtml: parsed.data.invoiceTermsHtml,
      estimateTermsVersion: nextVersion,
      estimateTermsUpdatedAt: contentChanged ? new Date() : undefined,
    },
  });

  revalidatePath("/settings/estimates");
  revalidatePath("/settings/ro-settings");
  revalidatePath("/approve", "layout");
  return { ok: true };
}
