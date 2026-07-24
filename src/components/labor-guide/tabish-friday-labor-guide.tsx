"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Exact Tabish Friday Labor EWT UI (static lab HTML — pixel-match). */
export const TABISH_FRIDAY_LABOR_SRC = "/lab/tabish-friday-labor.html";

export function TabishFridayLaborEmbed({
  className,
  title = "Tabish Friday Labor — Estimated Work Times",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <iframe
      title={title}
      src={TABISH_FRIDAY_LABOR_SRC}
      className={cn("h-full w-full border-0 bg-[#dce3e8]", className)}
      allow="clipboard-read; clipboard-write"
    />
  );
}

/** Full-bleed Labor Book surface for `/quick-labor` when TFL is released. */
export function TabishFridayLaborPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-[#dce3e8] shadow-sm">
      <TabishFridayLaborEmbed className="min-h-[calc(100svh-8.5rem)]" />
    </section>
  );
}

/** Floating Labor Book dialog — same HTML as the lab, nearly fullscreen. */
export function TabishFridayLaborGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,920px)] w-[min(96vw,1400px)] max-w-none flex-col gap-0 overflow-hidden border-[#0b3d5c]/40 p-0 sm:max-w-none sm:rounded-lg"
      >
        <DialogTitle className="sr-only">Tabish Friday Labor — Estimated Work Times</DialogTitle>
        <TabishFridayLaborEmbed className="min-h-0 flex-1" />
      </DialogContent>
    </Dialog>
  );
}
