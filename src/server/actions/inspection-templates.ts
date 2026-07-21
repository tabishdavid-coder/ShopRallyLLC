"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import {
  SaveInspectionTemplateInput,
  type InspectionTemplatePickerRow,
} from "@/lib/inspection-template-schemas";
import {
  isReservedInspectionTemplateName,
  listInspectionTemplatesForPicker,
} from "@/server/inspection-templates";
import { createInspectionFromTemplate } from "@/server/actions/inspections";
import { gates } from "@/server/permission-gates";

export type InspectionTemplateActionResult =
  | { ok: true; templateId: string; inspectionId?: string }
  | { ok: false; error: string };

export type InspectionTemplatePickerResult =
  | { ok: true; templates: InspectionTemplatePickerRow[] }
  | { ok: false; error: string };

/** Load built-in + shop templates for the Add Inspection picker. */
export async function fetchInspectionTemplatePicker(): Promise<InspectionTemplatePickerResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.inspectionsManage(shopId);
    if (denied) return { ok: false, error: denied.error };

    const templates = await listInspectionTemplatesForPicker(shopId);
    return { ok: true, templates };
  } catch (err) {
    console.error("[fetchInspectionTemplatePicker]", err);
    return { ok: false, error: "Could not load inspection templates." };
  }
}

/** Create a shop-scoped inspection template; optionally attach to a repair order. */
export async function createShopInspectionTemplate(
  raw: unknown,
): Promise<InspectionTemplateActionResult> {
  const parsed = SaveInspectionTemplateInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid template." };
  }

  const shopId = await getShopId();
  const denied = await gates.inspectionsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const data = parsed.data;
  if (isReservedInspectionTemplateName(data.name)) {
    return {
      ok: false,
      error: "That name matches a built-in template. Choose a different name.",
    };
  }

  const existing = await prisma.shopInspectionTemplate.findFirst({
    where: { shopId, name: data.name },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "A template with this name already exists." };
  }

  if (data.attachToRepairOrderId) {
    const ro = await prisma.repairOrder.findFirst({
      where: { id: data.attachToRepairOrderId, shopId },
      select: {
        id: true,
        inspections: { select: { templateName: true } },
      },
    });
    if (!ro) return { ok: false, error: "Repair order not found." };
    if (ro.inspections.some((i) => i.templateName === data.name)) {
      return {
        ok: false,
        error: `"${data.name}" is already on this repair order.`,
      };
    }
  }

  const template = await prisma.shopInspectionTemplate.create({
    data: {
      shopId,
      name: data.name,
      description: data.description ?? null,
      items: {
        create: data.items.map((item, idx) => ({
          shopId,
          name: item.name,
          category: item.category,
          sortOrder: idx,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/inspections");
  revalidatePath("/repair-orders");

  let inspectionId: string | undefined;
  if (data.attachToRepairOrderId) {
    const attach = await createInspectionFromTemplate(data.attachToRepairOrderId, template.id);
    if (!attach.ok) return { ok: false, error: attach.error };
    inspectionId = attach.inspectionId;
  }

  return { ok: true, templateId: template.id, inspectionId };
}
