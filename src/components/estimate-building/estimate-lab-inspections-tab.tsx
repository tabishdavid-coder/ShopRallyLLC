"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, Plus } from "lucide-react";

import { AddInspectionDialog } from "@/components/inspections/add-inspection-dialog";
import { InspectionWorkflowBadge } from "@/components/inspections/inspection-badges";
import { Button } from "@/components/ui/button";
import {
  inspectionRowActionIsPrimary,
  inspectionRowActionLabel,
  inspectionRowWorkflowBadge,
} from "@/lib/inspection";
import type { InspectionStatus } from "@/generated/prisma";

type InspectionRow = {
  id: string;
  templateName: string;
  status: InspectionStatus;
  performedAt: Date | null;
  itemCount: number;
  ratedCount: number;
};

export function EstimateLabInspectionsTab({
  roId,
  roNumber,
  inspections,
  existingTemplateNames,
}: {
  roId: string;
  roNumber: number;
  inspections: InspectionRow[];
  existingTemplateNames: string[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">Inspections</h3>
          <p className="text-xs text-muted-foreground">
            Multi-point inspections linked to this estimate
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3.5" />
            Add inspection
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={`/repair-orders/${roId}/inspections`}>
              <ExternalLink className="size-3.5" />
              Open full MPI
            </Link>
          </Button>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">No inspections on this order yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a digital MPI or link findings to jobs on the Services tab.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {inspections.map((insp) => {
            const progress =
              insp.itemCount > 0
                ? Math.round((insp.ratedCount / insp.itemCount) * 100)
                : 0;
            const workflowBadge = inspectionRowWorkflowBadge(insp.status, {
              ratedCount: insp.ratedCount,
              itemCount: insp.itemCount,
            });
            return (
              <li
                key={insp.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{insp.templateName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    RO #{roNumber} · {insp.itemCount} items · {progress}% rated
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {workflowBadge ? (
                    <InspectionWorkflowBadge
                      status={workflowBadge.status}
                      label={workflowBadge.label}
                    />
                  ) : null}
                  <Button
                    size="sm"
                    variant={
                      inspectionRowActionIsPrimary(insp.status, {
                        ratedCount: insp.ratedCount,
                      })
                        ? "default"
                        : "ghost"
                    }
                    className="h-8 text-xs"
                    asChild
                  >
                    <Link href={`/repair-orders/${roId}/inspections`}>
                      {inspectionRowActionLabel(insp.status, {
                        ratedCount: insp.ratedCount,
                      })}
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddInspectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roId={roId}
        existingTemplateNames={existingTemplateNames}
      />
    </div>
  );
}
