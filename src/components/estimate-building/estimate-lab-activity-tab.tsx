"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AddActivityDialog } from "@/components/repair-order/add-activity-dialog";
import { Button } from "@/components/ui/button";
import { RoActivityType } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<RoActivityType, string> = {
  NOTE: "Note",
  PHONE_CALL: "Phone call",
  EMAIL: "Email",
  OTHER: "Other",
};

type ActivityRow = {
  id: string;
  type: RoActivityType;
  description: string;
  createdAt: Date;
};

export function EstimateLabActivityTab({
  roId,
  activities,
}: {
  roId: string;
  activities: ActivityRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-brand-navy">Activity</h3>
          <p className="text-xs text-muted-foreground">Calls, notes, and updates on this repair order</p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-brand-navy text-xs hover:bg-brand-navy/90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-3.5" />
          Add activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log phone calls, emails, or internal notes as you work the estimate.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-md bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy",
                  )}
                >
                  {TYPE_LABEL[a.type]}
                </span>
                <time className="text-[11px] text-muted-foreground">
                  {a.createdAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-foreground">{a.description}</p>
            </li>
          ))}
        </ul>
      )}

      <AddActivityDialog open={addOpen} onOpenChange={setAddOpen} repairOrderId={roId} />
    </div>
  );
}
