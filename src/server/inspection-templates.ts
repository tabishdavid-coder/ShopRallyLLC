import "server-only";

import { prisma } from "@/db/client";
import {
  INSPECTION_TEMPLATES,
  type InspectionTemplate,
  type InspectionTemplateItem,
} from "@/lib/inspection-template";
import type { InspectionTemplatePickerRow } from "@/lib/inspection-template-schemas";

export function builtinInspectionTemplates(): InspectionTemplate[] {
  return INSPECTION_TEMPLATES;
}

export function isBuiltinInspectionTemplateId(id: string): boolean {
  return INSPECTION_TEMPLATES.some((t) => t.id === id);
}

export function getBuiltinInspectionTemplate(id: string): InspectionTemplate | undefined {
  return INSPECTION_TEMPLATES.find((t) => t.id === id);
}

export function isReservedInspectionTemplateName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return INSPECTION_TEMPLATES.some((t) => t.name.trim().toLowerCase() === normalized);
}

export async function listInspectionTemplatesForPicker(
  shopId: string,
): Promise<InspectionTemplatePickerRow[]> {
  const builtinRows: InspectionTemplatePickerRow[] = INSPECTION_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    itemCount: t.items.length,
    source: "builtin",
  }));

  let shopRows: InspectionTemplatePickerRow[] = [];
  try {
    const shopTemplates = await prisma.shopInspectionTemplate.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { items: true } },
      },
    });
    shopRows = shopTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      itemCount: t._count.items,
      source: "shop",
      description: t.description,
    }));
  } catch (err) {
    // Built-ins must always load; shop templates are optional (stale client / migration lag).
    console.warn("[listInspectionTemplatesForPicker] shop templates unavailable", err);
  }

  return [...builtinRows, ...shopRows];
}

export async function resolveInspectionTemplate(
  shopId: string,
  templateId: string,
): Promise<InspectionTemplate | null> {
  const builtin = getBuiltinInspectionTemplate(templateId);
  if (builtin) return builtin;

  const shopTemplate = await prisma.shopInspectionTemplate
    .findFirst({
      where: { id: templateId, shopId, isActive: true },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
    .catch((err) => {
      console.warn("[resolveInspectionTemplate] shop template lookup failed", err);
      return null;
    });
  if (!shopTemplate || shopTemplate.items.length === 0) return null;

  const items: InspectionTemplateItem[] = shopTemplate.items.map((item) => ({
    name: item.name,
    category: item.category?.trim() || "General",
  }));

  return {
    id: shopTemplate.id,
    name: shopTemplate.name,
    items,
  };
}
