"use client";

import { Printer } from "lucide-react";

/** Floating Print button on the print preview (hidden when actually printing). */
export function AutoPrint() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed right-4 top-4 z-10 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow print:hidden"
    >
      <Printer className="size-4" /> Print
    </button>
  );
}
