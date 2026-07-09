"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { hashAgreementContent } from "@/lib/agreement-hash";
import {
  AGREEMENT_SEED_DEFINITIONS,
  buildPlaceholderAgreementHtml,
} from "@/lib/agreement-content";
import { getCurrentUser, isPlatformAdmin } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { AgreementType, type Prisma } from "@/generated/prisma";
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_PUBLIC_PATHS,
  buildShopDataExportSummary,
  bumpAgreementVersion,
  checkShopLegalCompliance,
  getCurrentAgreementDocument,
  getCurrentAgreementDocuments,
  REQUIRED_AGREEMENT_TYPES,
  shopHasCurrentAgreement,
} from "@/server/legal";
import { gates } from "@/server/permission-gates";

const SIGNER_TITLES = ["Owner", "GM", "Authorized Representative"] as const;

const AcceptPlatformAgreementsInput = z.object({
  legalEntityName: z.string().trim().min(1).max(200),
  legalEntityState: z.string().trim().min(2).max(2),
  signerName: z.string().trim().min(1).max(120),
  signerTitle: z.enum(SIGNER_TITLES),
  signerEmail: z.string().trim().email().max(160),
  acceptedAgreements: z.literal(true, {
    message: "You must accept the platform agreements.",
  }),
});

export type AcceptPlatformAgreementsInput = z.infer<
  typeof AcceptPlatformAgreementsInput
>;

export type LegalActionResult = { ok: true } | { ok: false; error: string };

export type ExportShopDataResult =
  | { ok: true; json: string; filename: string }
  | { ok: false; error: string };

async function captureRequestMeta() {
  const headerStore = await headers();
  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

async function recordAcceptances(
  shopId: string,
  userId: string,
  types: AgreementType[],
  signer: {
    signerName: string;
    signerTitle?: string;
    signerEmail: string;
  },
  method: string,
  metadata?: Record<string, unknown>,
) {
  const currentDocs = await getCurrentAgreementDocuments(types);
  const { ipAddress, userAgent } = await captureRequestMeta();

  await prisma.$transaction(async (tx) => {
    for (const type of types) {
      const doc = currentDocs.get(type);
      if (!doc) continue;
      await tx.legalAcceptance.create({
        data: {
          shopId,
          userId,
          agreementType: type,
          agreementVersion: doc.version,
          contentHash: doc.contentHash,
          signerName: signer.signerName,
          signerTitle: signer.signerTitle,
          signerEmail: signer.signerEmail,
          ipAddress,
          userAgent,
          acceptanceMethod: method,
          metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    }
  });
}

export async function acceptPlatformAgreements(
  raw: Omit<AcceptPlatformAgreementsInput, "acceptedAgreements"> & {
    acceptedAgreements: boolean;
  },
): Promise<LegalActionResult> {
  const parsed = AcceptPlatformAgreementsInput.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    return { ok: false, error: msg ?? "Please check the form and try again." };
  }

  const data = parsed.data;
  const [shopId, user, currentDocs] = await Promise.all([
    getShopId(),
    getCurrentUser(),
    getCurrentAgreementDocuments(),
  ]);
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  for (const type of REQUIRED_AGREEMENT_TYPES) {
    if (!currentDocs.get(type)) {
      return {
        ok: false,
        error: "Platform agreements are not configured. Contact support.",
      };
    }
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      legalEntityName: data.legalEntityName,
      legalEntityState: data.legalEntityState.toUpperCase(),
    },
  });

  await recordAcceptances(
    shopId,
    user.id,
    REQUIRED_AGREEMENT_TYPES,
    {
      signerName: data.signerName,
      signerTitle: data.signerTitle,
      signerEmail: data.signerEmail,
    },
    "clickwrap_checkbox",
    {
      legalEntityName: data.legalEntityName,
      legalEntityState: data.legalEntityState.toUpperCase(),
    },
  );

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

const ReacceptInput = z.object({
  acceptedAgreements: z.literal(true, {
    message: "You must accept the updated agreements.",
  }),
});

/** Lighter re-acceptance for updated platform agreements (existing shops). */
export async function acceptRequiredAgreementsReaccept(
  raw: { acceptedAgreements: boolean },
): Promise<LegalActionResult> {
  const parsed = ReacceptInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const [user, compliance, shop] = await Promise.all([
    getCurrentUser(),
    checkShopLegalCompliance(shopId),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { legalEntityName: true },
    }),
  ]);

  if (compliance.compliant) {
    return { ok: true };
  }

  const typesToAccept = compliance.outdatedTypes.length
    ? compliance.outdatedTypes
    : compliance.missing;

  const signerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  await recordAcceptances(
    shopId,
    user.id,
    typesToAccept,
    {
      signerName,
      signerTitle: "Owner",
      signerEmail: user.email,
    },
    "reaccept_modal",
    { legalEntityName: shop?.legalEntityName ?? undefined },
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

const FeatureAddendumInput = z.object({
  accepted: z.literal(true, { message: "You must accept the addendum." }),
  tcpaAcknowledged: z.boolean().optional(),
});

export async function acceptPaymentAddendum(
  raw: { accepted: boolean },
): Promise<LegalActionResult> {
  const parsed = FeatureAddendumInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const doc = await getCurrentAgreementDocument(AgreementType.PAYMENT_ADDENDUM);
  if (!doc) {
    return { ok: false, error: "Payment addendum is not configured. Contact support." };
  }

  const [shopId, user] = await Promise.all([getShopId(), getCurrentUser()]);
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const has = await shopHasCurrentAgreement(shopId, AgreementType.PAYMENT_ADDENDUM);
  if (has) return { ok: true };

  const signerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  await recordAcceptances(
    shopId,
    user.id,
    [AgreementType.PAYMENT_ADDENDUM],
    { signerName, signerTitle: "Owner", signerEmail: user.email },
    "payment_addendum_gate",
  );

  revalidatePath("/marketing/payment-account");
  revalidatePath("/settings/payments");
  revalidatePath("/payments/account");
  revalidatePath("/payments");
  return { ok: true };
}

export async function acceptSmsAddendum(
  raw: { accepted: boolean; tcpaAcknowledged: boolean },
): Promise<LegalActionResult> {
  const parsed = FeatureAddendumInput.extend({
    tcpaAcknowledged: z.literal(true, {
      message: "You must acknowledge TCPA compliance responsibilities.",
    }),
  }).safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const doc = await getCurrentAgreementDocument(AgreementType.SMS_ADDENDUM);
  if (!doc) {
    return { ok: false, error: "SMS addendum is not configured. Contact support." };
  }

  const [shopId, user] = await Promise.all([getShopId(), getCurrentUser()]);
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const has = await shopHasCurrentAgreement(shopId, AgreementType.SMS_ADDENDUM);
  if (has) return { ok: true };

  const signerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  await recordAcceptances(
    shopId,
    user.id,
    [AgreementType.SMS_ADDENDUM],
    { signerName, signerTitle: "Owner", signerEmail: user.email },
    "sms_addendum_gate",
    { tcpaAcknowledged: true },
  );

  revalidatePath("/settings/communications/phone-sms");
  return { ok: true };
}

const PublishAgreementInput = z.object({
  type: z.nativeEnum(AgreementType),
  versionBump: z.enum(["patch", "minor"]),
  contentHtml: z.string().trim().optional(),
  usePlaceholder: z.boolean().optional(),
});

export async function publishAgreementVersion(
  raw: z.infer<typeof PublishAgreementInput>,
): Promise<LegalActionResult> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = PublishAgreementInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const current = await getCurrentAgreementDocument(parsed.data.type);
  const nextVersion = current
    ? bumpAgreementVersion(current.version, parsed.data.versionBump)
    : "1.0.0";

  const seedDef = AGREEMENT_SEED_DEFINITIONS.find((d) => d.type === parsed.data.type);
  const title =
    seedDef?.title ??
    current?.title ??
    AGREEMENT_TYPE_LABELS[parsed.data.type];

  let contentHtml = parsed.data.contentHtml?.trim();
  if (!contentHtml || parsed.data.usePlaceholder) {
    contentHtml = buildPlaceholderAgreementHtml(
      title,
      seedDef ? [...seedDef.sections] : ["General Provisions"],
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.agreementDocument.updateMany({
      where: { type: parsed.data.type, isCurrent: true },
      data: { isCurrent: false },
    });

    await tx.agreementDocument.create({
      data: {
        type: parsed.data.type,
        version: nextVersion,
        title,
        contentHtml,
        contentHash: hashAgreementContent(contentHtml),
        effectiveAt: new Date(),
        isCurrent: true,
        requiresReaccept: true,
      },
    });
  });

  revalidatePath("/platform/legal");
  revalidatePath("/", "layout");
  for (const path of Object.values(AGREEMENT_PUBLIC_PATHS)) {
    revalidatePath(path);
  }

  return { ok: true };
}

export async function exportShopDataSummary(): Promise<ExportShopDataResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.customersExport(shopId);
    if (denied) return denied;
    const summary = await buildShopDataExportSummary(shopId);
    const json = JSON.stringify(summary, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      json,
      filename: `repairpilot-export-${summary.shop.code ?? shopId}-${date}.json`,
    };
  } catch {
    return { ok: false, error: "Unable to generate export. Try again later." };
  }
}
