"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { requireAnyPermission } from "@/server/permissions";
import {
  buildRoAttachmentKey,
  getCloudStorage,
  newAttachmentId,
} from "@/server/services/cloud-storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export type RoAttachmentDto = {
  id: string;
  repairOrderId: string;
  inspectionId: string | null;
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  customerVisible: boolean;
  createdAt: string;
};

export type AttachmentActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toDto(row: {
  id: string;
  repairOrderId: string;
  inspectionId: string | null;
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  customerVisible: boolean;
  createdAt: Date;
}): RoAttachmentDto {
  return {
    id: row.id,
    repairOrderId: row.repairOrderId,
    inspectionId: row.inspectionId,
    kind: row.kind,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    // Always serve via id route so public token gate works for local + blob.
    url: `/api/ro-media/${row.id}`,
    customerVisible: row.customerVisible,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertRoInShop(shopId: string, repairOrderId: string) {
  return prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: { id: true, number: true },
  });
}

export async function listRoAttachments(
  repairOrderId: string,
): Promise<AttachmentActionResult<RoAttachmentDto[]>> {
  const shopId = await getShopId();
  const perm = await requireAnyPermission(shopId, ["estimate.view", "estimate.edit", "estimate.approve"]);
  if (!perm.ok) return { ok: false, error: perm.error };

  const ro = await assertRoInShop(shopId, repairOrderId);
  if (!ro) return { ok: false, error: "Repair order not found." };

  const rows = await prisma.roAttachment.findMany({
    where: { shopId, repairOrderId },
    orderBy: { createdAt: "desc" },
  });
  return { ok: true, data: rows.map(toDto) };
}

export async function uploadRoAttachment(formData: FormData): Promise<AttachmentActionResult<RoAttachmentDto>> {
  const shopId = await getShopId();
  const perm = await requireAnyPermission(shopId, ["estimate.edit", "estimate.approve"]);
  if (!perm.ok) return { ok: false, error: perm.error };

  const repairOrderId = String(formData.get("repairOrderId") ?? "").trim();
  const inspectionIdRaw = String(formData.get("inspectionId") ?? "").trim();
  const customerVisibleRaw = String(formData.get("customerVisible") ?? "true");
  const file = formData.get("file");

  if (!repairOrderId) return { ok: false, error: "Missing repair order." };
  if (!(file instanceof File)) return { ok: false, error: "Choose a photo to upload." };

  const ro = await assertRoInShop(shopId, repairOrderId);
  if (!ro) return { ok: false, error: "Repair order not found." };

  let inspectionId: string | null = null;
  if (inspectionIdRaw) {
    const insp = await prisma.inspection.findFirst({
      where: { id: inspectionIdRaw, shopId, repairOrderId },
      select: { id: true },
    });
    if (!insp) return { ok: false, error: "Inspection not found on this repair order." };
    inspectionId = insp.id;
  }

  const contentType = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, GIF, or HEIC photos are supported." };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { ok: false, error: "Photo must be between 1 byte and 8 MB." };
  }

  const attachmentId = newAttachmentId();
  const fileName = (file.name || "photo.jpg").slice(0, 180);
  const storageKey = buildRoAttachmentKey({
    shopId,
    repairOrderId,
    attachmentId,
    fileName,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getCloudStorage();
  let uploaded;
  try {
    uploaded = await storage.upload(storageKey, buffer, contentType);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }

  const user = await getCurrentUser().catch(() => null);
  const row = await prisma.roAttachment.create({
    data: {
      id: attachmentId,
      shopId,
      repairOrderId,
      inspectionId,
      kind: "PHOTO",
      fileName,
      contentType,
      sizeBytes: file.size,
      storageKey: uploaded.key,
      url: uploaded.url,
      customerVisible: customerVisibleRaw !== "false",
      createdById: user?.id ?? null,
    },
  });

  revalidatePath(`/repair-orders/${repairOrderId}`);
  revalidatePath(`/repair-orders/${repairOrderId}/estimate`);
  return { ok: true, data: toDto(row) };
}

export async function setRoAttachmentCustomerVisible(opts: {
  id: string;
  customerVisible: boolean;
}): Promise<AttachmentActionResult<RoAttachmentDto>> {
  const shopId = await getShopId();
  const perm = await requireAnyPermission(shopId, ["estimate.edit", "estimate.approve"]);
  if (!perm.ok) return { ok: false, error: perm.error };

  const existing = await prisma.roAttachment.findFirst({
    where: { id: opts.id, shopId },
  });
  if (!existing) return { ok: false, error: "Attachment not found." };

  const row = await prisma.roAttachment.update({
    where: { id: existing.id },
    data: { customerVisible: opts.customerVisible },
  });

  revalidatePath(`/repair-orders/${row.repairOrderId}`);
  return { ok: true, data: toDto(row) };
}

export async function deleteRoAttachment(
  id: string,
): Promise<AttachmentActionResult> {
  const shopId = await getShopId();
  const perm = await requireAnyPermission(shopId, ["estimate.edit", "estimate.approve"]);
  if (!perm.ok) return { ok: false, error: perm.error };

  const existing = await prisma.roAttachment.findFirst({
    where: { id, shopId },
  });
  if (!existing) return { ok: false, error: "Attachment not found." };

  await prisma.roAttachment.delete({ where: { id: existing.id } });
  const storage = getCloudStorage();
  await storage.delete?.(existing.storageKey).catch(() => undefined);

  revalidatePath(`/repair-orders/${existing.repairOrderId}`);
  return { ok: true, data: undefined };
}
