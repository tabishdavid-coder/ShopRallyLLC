"use client";

import { Archive, ArrowRight, CheckCircle2, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";

/** Per-card action menu. Handlers live on the board so it owns board state. */
export function JobCardMenu({
  columnId,
  moveTargets,
  isEstimate,
  canArchive = false,
  onMove,
  onAuthorize,
  onArchive,
}: {
  columnId: string;
  moveTargets: { id: string; title: string }[];
  isEstimate: boolean;
  canArchive?: boolean;
  onMove: (toColumnId: string) => void;
  onAuthorize: () => void;
  onArchive?: () => void;
}) {
  const ap3030 = isAutopilot3030Shell();
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onPointerDown={stop}
        onClick={stop}
        aria-label="Repair order actions"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={stop} className="w-52">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight className="size-3.5" /> Move to
        </DropdownMenuLabel>
        {moveTargets.map((target) => (
          <DropdownMenuItem
            key={target.id}
            disabled={target.id === columnId}
            onSelect={() => onMove(target.id)}
          >
            {target.title}
          </DropdownMenuItem>
        ))}

        {isEstimate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onAuthorize} className="font-medium text-brand-navy focus:text-brand-navy">
              <CheckCircle2 className="size-4" />
              {ap3030 ? `Authorize ${AP_TERMS.estimate.toLowerCase()}` : "Authorize estimate"}
            </DropdownMenuItem>
          </>
        ) : null}

        {canArchive && onArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onArchive} className="font-medium text-emerald-800 focus:text-emerald-800">
              <Archive className="size-4" />
              {ap3030 ? `Archive ${AP_TERMS.repairOrder.toLowerCase()}` : "Archive RO"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
