import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Selected chip / toggle — soft ShopRally orange wash (not full fill). */
export const CRM_CHIP_ACTIVE =
  "border border-brand-red/40 bg-brand-red/10 text-brand-navy shadow-none";

/** Default chip — neutral until selected. */
export const CRM_CHIP_INACTIVE =
  "border border-border bg-white text-muted-foreground hover:border-brand-light hover:bg-brand-light/20 hover:text-brand-navy";

/** Dense uppercase section label with tiny orange accent bar. */
export function FormStripLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-center gap-1.5", className)}>
      <span
        className="h-3 w-0.5 shrink-0 rounded-full bg-brand-red/70"
        aria-hidden
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
