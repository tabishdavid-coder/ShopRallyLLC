"use client";

import Link from "next/link";
import { Columns3, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import type { Shop } from "@/lib/shop";

export function ShopDayHeader({ shop, todayLabel }: { shop: Shop; todayLabel: string }) {
  const { openIntake, config } = useRoIntakeOptional();

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-light/50 bg-card px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold tracking-tight text-brand-navy">
          {shop.name}
        </h2>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className="h-6 border border-brand-light/60 bg-brand-light/25 px-2 text-[10px] font-medium text-brand-navy"
        >
          {todayLabel}
        </Badge>
        <Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
          <Link href="/job-board">
            <Columns3 className="size-3" />
            Job board
          </Link>
        </Button>
        {config ? (
          <Button
            size="sm"
            className="h-7 gap-1 bg-brand-navy px-2 text-xs hover:bg-brand-navy/90"
            onClick={() => openIntake()}
          >
            <Plus className="size-3" />
            New Repair Order
          </Button>
        ) : (
          <Button asChild size="sm" className="h-7 gap-1 bg-brand-navy px-2 text-xs hover:bg-brand-navy/90">
            <Link href="/repair-orders/new">
              <Plus className="size-3" />
              New Repair Order
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
