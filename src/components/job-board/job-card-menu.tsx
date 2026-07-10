"use client";

import Link from "next/link";
import { Archive, ArrowRight, CheckCircle2, ExternalLink, MoreVertical } from "lucide-react";

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
import { defaultRoOpenHref } from "@/lib/ro-workspace";

/** Per-card action menu. Handlers live on the board so it owns board state. */
export function JobCardMenu({
  columnId,
  moveTargets,
  isEstimate,
  canArchive = false,
  roId,
  openHref,
  onMove,
  onAuthorize,
  onArchive,
}: {
  columnId: string;
  moveTargets: { id: string; title: string }[];
  isEstimate: boolean;
  canArchive?: boolean;
  roId: string;
  /** Override for workflow board deep-links; defaults to estimate workspace. */
  openHref?: string;
  onMove: (toColumnId: string) => void;
  onAuthorize: () => void;
  onArchive?: () => void;
}) {
  const ap3030 = isAutopilot3030Shell();
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();
  const href = openHref ?? defaultRoOpenHref(roId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onPointerDown={stop}
        onClick={stop}
        aria-label="Repair order actions"
        className="flex size-8 shrink-0 items-center justify-center rounded-none text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={stop} className="w-52">
        <DropdownMenuItem asChild className="font-medium text-brand-navy focus:text-brand-navy">
          <Link href={href}>
            <ExternalLink className="size-4" />
            {ap3030 ? `Open ${AP_TERMS.repairOrder.toLowerCase()}` : "Open repair order"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

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
