"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";

import { CreateInspectionTemplateSheet } from "@/components/inspections/create-inspection-template-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InspectionTemplatePickerRow } from "@/lib/inspection-template-schemas";

/** Admin strip on /inspections — view shop/builtin templates + create new shop templates. */
export function InspectionTemplatesAdmin({
  templates,
}: {
  templates: InspectionTemplatePickerRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const shopTemplates = templates.filter((t) => t.source === "shop");
  const builtinCount = templates.filter((t) => t.source === "builtin").length;

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardCheck className="size-4 text-primary" aria-hidden />
              Inspection templates
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Built-in checklists ({builtinCount}) plus your shop templates. Create a custom
              template here, then attach it from a repair order.
            </p>
          </div>
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New template
          </Button>
        </div>

        {shopTemplates.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {shopTemplates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    Shop
                  </Badge>
                  {t.itemCount} item{t.itemCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No shop templates yet — use New template to build a custom checklist.
          </p>
        )}
      </div>

      <CreateInspectionTemplateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
