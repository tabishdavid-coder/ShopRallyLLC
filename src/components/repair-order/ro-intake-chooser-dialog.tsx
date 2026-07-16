"use client";

import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";

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
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-md",
          showSmartOption && "sm:max-w-lg",
        )}
      >
        <div className="border-b border-brand-navy/8 bg-gradient-to-br from-brand-navy/[0.04] via-background to-brand-light/[0.08] px-5 pb-4 pt-5 pr-12">
          <DialogHeader className="gap-1.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/55">
              New repair order
            </p>
            <DialogTitle className="text-xl font-semibold tracking-tight text-brand-navy">
              How do you want to start?
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
              {showSmartOption
                ? "Paste notes for AI to draft the estimate, or build it yourself step by step."
                : "Search the customer and vehicle, add concerns, and create the RO."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className={cn("grid gap-2.5 p-4", showSmartOption && "sm:grid-cols-2 sm:gap-3 sm:p-5")}>
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
                "group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-[border-color,box-shadow,background-color,transform] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2",
                entitled
                  ? "border-brand-orange/35 bg-gradient-to-b from-brand-orange/[0.08] to-brand-light/[0.06] shadow-[0_1px_0_rgba(30,58,86,0.04)] hover:-translate-y-0.5 hover:border-brand-orange/55 hover:shadow-md"
                  : "cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/25 opacity-85",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-white shadow-sm shadow-brand-orange/25">
                  <Sparkles className="size-4.5" aria-hidden />
                </div>
                {entitled ? (
                  <span className="rounded-md bg-brand-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    AI Plus
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-navy">Smart AI Intake</p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  Paste free-form notes — we extract customer, vehicle, and labor for your review.
                </p>
                {!entitled ? (
                  <p className="mt-2 text-xs font-medium leading-snug text-amber-900">
                    Requires {SMART_RO_ADDON_LABEL}. Enable in Settings → Subscription.
                  </p>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange">
                    Start with AI
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                )}
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
              "group flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 text-left transition-[border-color,box-shadow,background-color,transform] duration-150",
              "hover:-translate-y-0.5 hover:border-brand-navy/35 hover:bg-muted/30 hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
              <ClipboardList className="size-4.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-navy">Manual creation</p>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                Search customer &amp; vehicle, add concerns, and build the estimate line by line.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy/70 group-hover:text-brand-navy">
                Open form
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-end border-t border-border/60 bg-muted/20 px-4 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
