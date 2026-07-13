"use client";

import { ClipboardList, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCorePlanShop, useSmartRoIntakeEnabled } from "@/lib/shop-capabilities";
import { SMART_RO_ADDON_LABEL } from "@/lib/smart-ro-intake-types";
import { cn } from "@/lib/utils";

export function RoIntakeChooserDialog({
  open,
  onOpenChange,
  onSmart,
  onManual,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSmart: () => void;
  onManual: () => void;
}) {
  const isCore = useCorePlanShop();
  const entitled = useSmartRoIntakeEnabled();
  const showSmartOption = isCore;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-navy">Create repair order</DialogTitle>
          <DialogDescription>
            {showSmartOption
              ? "Choose how you want to start this estimate — AI-assisted intake (Core add-on) or the full manual form."
              : "Start a new repair order with the manual intake workflow."}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("grid gap-3", showSmartOption ? "sm:grid-cols-2" : "")}>
          {showSmartOption ? (
            <button
              type="button"
              disabled={!entitled}
              onClick={() => {
                if (!entitled) return;
                onOpenChange(false);
                onSmart();
              }}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                entitled
                  ? "border-brand-navy/20 bg-brand-light/10 hover:border-brand-navy hover:bg-brand-light/20"
                  : "cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/30 opacity-80",
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-orange/15">
                <Sparkles className="size-5 text-brand-orange" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-brand-navy">Smart AI Intake</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Core add-on — paste free-form notes and Gemini extracts customer, vehicle, and labor
                  hours for your review.
                </p>
                {!entitled ? (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Requires AI Plus on Core ({SMART_RO_ADDON_LABEL}). Enable in Settings →
                    Subscription or ask platform admin.
                  </p>
                ) : null}
              </div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onManual();
            }}
            className={cn(
              "group flex flex-col items-start gap-3 rounded-xl border-2 border-border p-4 text-left transition-colors hover:border-brand-navy/40 hover:bg-muted/40",
              !showSmartOption && "sm:col-span-1",
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-navy/10">
              <ClipboardList className="size-5 text-brand-navy" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-brand-navy">Manual creation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search customer &amp; vehicle, concerns, visit details, and create the RO step by
                step.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
