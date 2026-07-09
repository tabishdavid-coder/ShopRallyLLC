import "server-only";

import { prisma } from "@/db/client";
import { Role } from "@/generated/prisma";
import { buildRoAuthorizationEmail } from "@/lib/email-templates/ro-authorization";
import { customerDisplayName } from "@/lib/format";
import { getEmail } from "@/server/services/email";

export type RoAuthorizationEmailResult =
  | { ok: true; to: string; mode: "live" | "mock" }
  | { ok: false; error: string };

export type RoAuthorizationJobSelection = {
  approvedJobIds?: string[];
  declinedJobIds?: string[];
};

/** Resolve who receives the shop's RO authorization notification. */
async function resolveAuthorizationRecipient(
  shopId: string,
  serviceWriterId: string | null,
): Promise<string | null> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      authorizationNotifyEmail: true,
      email: true,
      memberships: {
        where: { active: true, role: Role.OWNER },
        take: 1,
        select: { user: { select: { email: true } } },
      },
    },
  });
  if (!shop) return null;

  const dedicated = shop.authorizationNotifyEmail?.trim();
  if (dedicated) return dedicated;

  const shopEmail = shop.email?.trim();
  if (shopEmail) return shopEmail;

  if (serviceWriterId) {
    const writer = await prisma.user.findUnique({
      where: { id: serviceWriterId },
      select: { email: true },
    });
    const writerEmail = writer?.email?.trim();
    if (writerEmail) return writerEmail;
  }

  const ownerEmail = shop.memberships[0]?.user.email?.trim();
  if (ownerEmail) return ownerEmail;

  return process.env.PLATFORM_ADMIN_EMAIL?.trim() || "platform@repairpilot.com";
}

/**
 * Notify the shop that a customer authorized jobs on an estimate.
 * Uses mock console logging when Resend is not configured.
 */
export async function sendRoAuthorizationEmail(
  shopId: string,
  repairOrderId: string,
  selection?: RoAuthorizationJobSelection,
): Promise<RoAuthorizationEmailResult> {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: {
      id: true,
      number: true,
      serviceWriterId: true,
      authorizedBy: true,
      approvalSignerName: true,
      approvalSignedAt: true,
      shop: { select: { state: true } },
      customer: {
        select: { firstName: true, lastName: true, company: true },
      },
      vehicle: { select: { year: true, make: true, model: true, trim: true } },
      jobs: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, authorized: true, approvedAt: true },
      },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const approvedIds = new Set(selection?.approvedJobIds ?? []);
  const declinedIds = new Set(selection?.declinedJobIds ?? []);
  const hasSelection = approvedIds.size > 0 || declinedIds.size > 0;

  const approvedJobs = ro.jobs
    .filter((j) => (hasSelection ? approvedIds.has(j.id) : j.authorized))
    .map((j) => ({
      name: j.name,
      approvedAt: j.approvedAt ?? new Date(),
    }));

  const declinedJobNames = ro.jobs
    .filter((j) => (hasSelection ? declinedIds.has(j.id) : !j.authorized))
    .map((j) => j.name);

  const customerName =
    customerDisplayName(ro.customer) || ro.authorizedBy?.trim() || "Customer";
  const vehicleLabel =
    [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model, ro.vehicle?.trim]
      .filter(Boolean)
      .join(" ") || "Vehicle";

  const { subject, body } = buildRoAuthorizationEmail({
    roNumber: ro.number,
    roId: ro.id,
    customerName,
    vehicleLabel,
    shopState: ro.shop.state,
    approvedJobs,
    declinedJobNames,
    signatureCaptured: Boolean(ro.approvalSignedAt),
    signerName: ro.approvalSignerName ?? ro.authorizedBy,
  });

  const to = await resolveAuthorizationRecipient(shopId, ro.serviceWriterId);
  if (!to) return { ok: false, error: "No authorization notification email configured." };

  try {
    const provider = getEmail();
    await provider.send(to, subject, body);
    return { ok: true, to, mode: provider.mode };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send authorization email.",
    };
  }
}
