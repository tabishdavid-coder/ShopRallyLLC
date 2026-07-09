"use client";

import { cn } from "@/lib/utils";

/** Public web footer line — approve links, invoices, shop sites, plan catalog. */
export function PoweredByShopRally({
  className,
  suffix = "Shop Management Software",
}: {
  className?: string;
  suffix?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Powered by{" "}
      <span className="font-semibold text-brand-navy">
        Kar<span className="text-brand-light">vio</span>
      </span>
      {suffix ? <> · {suffix}</> : null}
    </p>
  );
}
