"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/** Floating Print button; optionally opens the browser print dialog after load. */
export function AutoPrint({
  autoTrigger = false,
  delayMs = 450,
}: {
  /** When true, call `window.print()` shortly after mount (print-target pages). */
  autoTrigger?: boolean;
  delayMs?: number;
}) {
  useEffect(() => {
    if (!autoTrigger) return;
    const t = window.setTimeout(() => {
      window.print();
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [autoTrigger, delayMs]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed right-4 top-4 z-10 inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-md print:hidden hover:bg-brand-navy/90"
    >
      <Printer className="size-4" /> Print
    </button>
  );
}
