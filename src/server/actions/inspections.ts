"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { appUrl } from "@/lib/app-url";
import { deriveInspectionStatus } from "@/lib/inspection";
import { getInspectionTemplate } from "@/lib/inspection-template";
import { getShopId } from "@/lib/shop";
import { SMS_ENABLED } from "@/lib/features";
import { InspectionItemStatus, InspectionStatus } from "@/generated/prisma";
import { recordOutboundMessage } from "@/server/services/messaging";
import { getSms } from "@/server/services/sms";
import { sendShopEmail } from "@/server/services/shop-email";
import { normalizePhoneE164 } from "@/lib/phone";
import { emitAutomationEvent } from "@/server/services/automation-events";
import { gates } from "@/server/permission-gates";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type LinkResult = { ok: true; url: string } | { ok: false; error: string };
export type ShareResult =
  | { ok: true; mode: "live" | "mock" | "fallback"; fallbackUrl?: string }
  | { ok: false; error: string };

const ItemStatus = z.nativeEnum(InspectionItemStatus);

const UpdateItemInput = z.object({
  inspectionId: z.string().min(1),
  itemId: z.string().min(1),
  status: ItemStatus.optional(),
  note: z.string().trim().max(2000).optional(),
});

function revalidateInspectionPaths(roId: string) {
  revalidatePath("/inspections");
  revalidatePath(`/repair-orders/${roId}`);
  revalidatePath(`/repair-orders/${roId}/inspections`);
}

async function getInspectionForShop(inspectionId: string, shopId: string) {
  return prisma.inspection.findFirst({
    where: { id: inspectionId, shopId },
    select: {
      id: true,
      repairOrderId: true,
      status: true,
      items: { select: { id: true, status: true } },
    },
  });
}

/** Create a new DVI from a shop template on a repair order. */
export async function createInspection(
  repairOrderId: string,
  templateId = "courtesy",
): Promise<{ ok: true; inspectionId: string } | { ok: false; error: string }> {
  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const template = getInspectionTemplate(templateId);
  if (!template) return { ok: false, error: "Inspection template not found." };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: {
      id: true,
      inspections: { select: { templateName: true } },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  if (ro.inspections.some((i) => i.templateName === template.name)) {
    return { ok: false, error: `"${template.name}" is already on this repair order.` };
  }

  const inspection = await prisma.inspection.create({
    data: {
      shopId,
      repairOrderId: ro.id,
      templateName: template.name,
      status: InspectionStatus.NOT_STARTED,
      items: {
        create: template.items.map((item, idx) => ({
          shopId,
          name: item.name,
          category: item.category,
          sortOrder: idx,
        })),
      },
    },
    select: { id: true },
  });

  revalidateInspectionPaths(ro.id);
  return { ok: true, inspectionId: inspection.id };
}

/** Update a single inspection item status or note. */
export async function updateInspectionItem(
  raw: z.infer<typeof UpdateItemInput>,
): Promise<ActionResult> {
  const parsed = UpdateItemInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid inspection item." };

  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return denied;

  const insp = await getInspectionForShop(parsed.data.inspectionId, shopId);
  if (!insp) return { ok: false, error: "Inspection not found." };

  const item = insp.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return { ok: false, error: "Inspection item not found." };

  const data: { status?: InspectionItemStatus; note?: string | null } = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.note !== undefined) data.note = parsed.data.note || null;

  await prisma.inspectionItem.updateMany({
    where: { id: parsed.data.itemId, shopId, inspectionId: parsed.data.inspectionId },
    data,
  });

  const items = insp.items.map((i) =>
    i.id === parsed.data.itemId
      ? {
          ...i,
          status: parsed.data.status ?? i.status,
        }
      : i,
  );

  const nextStatus =
    insp.status === InspectionStatus.COMPLETED
      ? InspectionStatus.COMPLETED
      : deriveInspectionStatus(items);

  await prisma.inspection.updateMany({
    where: { id: parsed.data.inspectionId, shopId },
    data: { status: nextStatus },
  });

  revalidateInspectionPaths(insp.repairOrderId);
  return { ok: true };
}

/** Mark inspection complete (all items should be rated first in UI). */
export async function completeInspection(inspectionId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return denied;

  const insp = await prisma.inspection.findFirst({
    where: { id: inspectionId, shopId },
    select: {
      id: true,
      repairOrderId: true,
      items: { select: { status: true } },
      repairOrder: { select: { customerId: true } },
    },
  });
  if (!insp) return { ok: false, error: "Inspection not found." };

  const unrated = insp.items.some((i) => i.status === InspectionItemStatus.NA);
  if (unrated) {
    return { ok: false, error: "Rate every item before marking complete." };
  }

  await prisma.inspection.updateMany({
    where: { id: inspectionId, shopId },
    data: {
      status: InspectionStatus.COMPLETED,
      performedAt: new Date(),
    },
  });

  const hasDeclined = insp.items.some(
    (i) => i.status === InspectionItemStatus.YELLOW || i.status === InspectionItemStatus.RED,
  );
  if (hasDeclined && insp.repairOrder.customerId) {
    await emitAutomationEvent({
      type: "INSPECTION_DECLINED",
      shopId,
      repairOrderId: insp.repairOrderId,
      customerId: insp.repairOrder.customerId,
    });
  }

  revalidateInspectionPaths(insp.repairOrderId);
  return { ok: true };
}

/** Mint (or reuse) the public inspection share link. */
export async function getInspectionShareLink(inspectionId: string): Promise<LinkResult> {
  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const insp = await prisma.inspection.findFirst({
    where: { id: inspectionId, shopId },
    select: { shareToken: true },
  });
  if (!insp) return { ok: false, error: "Inspection not found." };

  const token = insp.shareToken ?? randomBytes(24).toString("base64url");
  if (!insp.shareToken) {
    await prisma.inspection.updateMany({
      where: { id: inspectionId, shopId },
      data: { shareToken: token },
    });
  }

  return { ok: true, url: await appUrl(`/inspection/${token}`) };
}

function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function smsUrl(to: string, body: string): string {
  return `sms:${normalizePhoneE164(to)}?&body=${encodeURIComponent(body)}`;
}

/** Share inspection with customer via SMS or email (dialog flow). */
export async function shareInspection(input: {
  inspectionId: string;
  method: "SMS" | "EMAIL";
  to: string;
  message: string;
}): Promise<ShareResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, error: "Message is empty." };
  if (input.method === "SMS" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return denied;

  const insp = await prisma.inspection.findFirst({
    where: { id: input.inspectionId, shopId },
    select: {
      repairOrderId: true,
      repairOrder: {
        select: { number: true, customerId: true },
      },
    },
  });
  if (!insp) return { ok: false, error: "Inspection not found." };

  const to = input.to.trim();
  if (!to) {
    return {
      ok: false,
      error: input.method === "SMS" ? "Enter a phone number." : "Enter an email address.",
    };
  }

  const ro = insp.repairOrder;
  const channel = input.method === "SMS" ? "sms" : "email";

  if (channel === "sms") {
    const provider = getSms();
    if (provider.mode === "live") {
      try {
        const res = await provider.send(to, message);
        await recordOutboundMessage({
          shopId,
          customerId: ro.customerId,
          body: message,
          status: res.status,
          twilioSid: res.sid,
          repairOrderId: insp.repairOrderId,
        });
        revalidateInspectionPaths(insp.repairOrderId);
        return { ok: true, mode: "live" };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
      }
    }

    try {
      const res = await provider.send(to, message);
      await recordOutboundMessage({
        shopId,
        customerId: ro.customerId,
        body: message,
        status: res.status,
        twilioSid: res.sid,
        repairOrderId: insp.repairOrderId,
      });
    } catch {
      /* mock mode */
    }
    revalidateInspectionPaths(insp.repairOrderId);
    return { ok: true, mode: "mock", fallbackUrl: smsUrl(to, message) };
  }

  try {
    const res = await sendShopEmail({
      shopId,
      to,
      subject: `Your vehicle inspection — RO #${ro.number}`,
      body: message,
    });

    if (res.mode === "live") {
      await recordOutboundMessage({
        shopId,
        customerId: ro.customerId,
        body: `[email → ${to}] ${message}`,
        status: res.status,
        repairOrderId: insp.repairOrderId,
      });
      revalidateInspectionPaths(insp.repairOrderId);
      return { ok: true, mode: "live" };
    }

    await recordOutboundMessage({
      shopId,
      customerId: ro.customerId,
      body: `[email → ${to}] ${message}`,
      status: res.mode === "mock" ? "mock" : "fallback",
      repairOrderId: insp.repairOrderId,
    });
    revalidateInspectionPaths(insp.repairOrderId);
    return {
      ok: true,
      mode: res.mode === "mock" ? "mock" : "fallback",
      fallbackUrl:
        res.fallbackUrl ??
        mailtoUrl(to, `Your vehicle inspection — RO #${ro.number}`, message),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}
