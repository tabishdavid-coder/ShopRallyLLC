"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Shop } from "@/lib/shop";

export function ShopDayHeader({ shop }: { shop: Shop }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-light/50 bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70">
          Shop landing
        </p>
        <h2 className="truncate text-xl font-bold tracking-tight text-brand-navy">
          {shop.name}
        </h2>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="border border-brand-light/60 bg-brand-light/25 font-medium text-brand-navy"
        >
          {today}
        </Badge>
        <Button asChild size="sm" className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90">
          <Link href="/repair-orders/new">
            <Plus className="size-3.5" />
            New Repair Order
          </Link>
        </Button>
      </div>
    </div>
  );
}
