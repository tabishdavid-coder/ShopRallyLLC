"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { designModeHref } from "@/lib/design-mode-merged-crm";
import { cn } from "@/lib/utils";
import type { ROStatus } from "@/generated/prisma";

export type EstimateLabRoOption = {
  id: string;
  number: number;
  status: ROStatus;
  customerLabel: string;
  vehicleLabel: string;
  jobCount: number;
};

export function EstimateLabRoPicker({
  ros,
  selectedId,
  selectedNumber,
}: {
  ros: EstimateLabRoOption[];
  selectedId: string | null;
  selectedNumber: number | null;
}) {
  const router = useRouter();

  function selectRo(id: string) {
    router.push(designModeHref("/design-review/estimate-building", { ro: id }));
  }

  const selected = ros.find((r) => r.id === selectedId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 font-semibold text-brand-navy">
            {selectedNumber != null ? `RO #${selectedNumber}` : "Pick repair order"}
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-80 overflow-y-auto">
          {ros.map((ro) => {
            const pill = RO_STATUS_PILL[ro.status];
            return (
              <DropdownMenuItem
                key={ro.id}
                onClick={() => selectRo(ro.id)}
                className={cn("flex flex-col items-start gap-0.5 py-2", ro.id === selectedId && "bg-brand-light/15")}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="font-semibold text-foreground">RO #{ro.number}</span>
                  <Badge variant="outline" className={cn("text-[10px]", pill.className)}>{pill.label}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{ro.jobCount} jobs</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {ro.customerLabel} · {ro.vehicleLabel}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected ? (
        <span className="text-xs text-muted-foreground">
          {selected.customerLabel} · {selected.vehicleLabel}
        </span>
      ) : null}
      {selectedId ? (
        <Link
          href={`/repair-orders/${selectedId}/estimate`}
          className="text-xs font-medium text-brand-navy hover:underline"
        >
          Open main estimate tab →
        </Link>
      ) : null}
    </div>
  );
}
