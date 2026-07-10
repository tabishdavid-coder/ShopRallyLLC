"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  GitBranch,
  LayoutGrid,
  Receipt,
  RotateCcw,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { COLUMN_OF, type BoardColumn } from "@/lib/job-board";
import { roEstimateActionHref } from "@/lib/ro-context-actions";
import { RO_STATUS_LABEL } from "@/lib/ro-status";
import { cn } from "@/lib/utils";
import {
  archiveRepairOrder,
  moveRepairOrderToCoreColumn,
} from "@/server/actions/job-board";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";
import type { ROStatus } from "@/generated/prisma";

const RAIL_PERFORMANCE_TRIGGER_CLASS =
  "group h-auto min-h-10 gap-2 rounded-none border border-brand-navy/35 bg-white px-2.5 py-1.5 text-brand-navy shadow-sm transition-colors hover:border-brand-navy/45 hover:bg-brand-navy/5 active:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-light/55 focus-visible:ring-offset-1 disabled:opacity-50 [&_svg]:text-brand-navy";

const RAIL_CHIP_TRIGGER_CLASS =
  "group h-auto min-h-0 gap-1 rounded-none border border-[var(--jb-line,#dde5ef)] bg-[var(--jb-surface,#f0f3f8)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--jb-ink,#0b1f3b)] shadow-none hover:border-[var(--jb-hover-line,#b9c8dc)] hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--jb-azure,#1e7fe0)]/40 focus-visible:ring-offset-1 disabled:opacity-50";

function currentColumn(status: ROStatus): BoardColumn {
  return COLUMN_OF[status];
}

export function RoWorkflowDropdown({
  roId,
  roNumber,
  roStatus,
  customerName,
  phone,
  canArchive = false,
  className,
  triggerVariant = "default",
}: {
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  customerName: string;
  phone: string | null;
  canArchive?: boolean;
  className?: string;
  /** `railChip` = compact STATUS card header chip (Palette C). */
  triggerVariant?: "default" | "rail" | "railChip";
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const phase = RO_STATUS_LABEL[roStatus];
  const column = currentColumn(roStatus);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast("success", success);
        router.refresh();
      } else {
        toast("error", res.error ?? "Action failed");
      }
    });
  }

  const canRevertToEstimate = roStatus !== "ESTIMATE";
  const canStartWork = roStatus === "ESTIMATE" || roStatus === "APPROVED";
  const canComplete =
    roStatus === "APPROVED" || roStatus === "IN_PROGRESS";
  const canCollectPayment =
    roStatus === "COMPLETED" || roStatus === "INVOICED";

  const isRailTrigger = triggerVariant === "rail";
  const isRailChip = triggerVariant === "railChip";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className={cn(
            isRailChip
              ? RAIL_CHIP_TRIGGER_CLASS
              : isRailTrigger
                ? RAIL_PERFORMANCE_TRIGGER_CLASS
                : "h-8 gap-1 border-brand-navy/25 px-2 text-[11px] font-semibold text-brand-navy",
            className,
          )}
          aria-label={`Workflow — ${phase}`}
        >
          {isRailChip ? (
            <>
              <span className="max-w-[9rem] truncate">{phase}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </>
          ) : isRailTrigger ? (
            <>
              <span className="flex min-w-0 items-center gap-2 text-left">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-none border border-brand-navy/20 bg-slate-50 text-brand-navy shadow-sm transition-colors group-hover:border-brand-navy/30 group-hover:bg-white">
                  <GitBranch className="size-3.5" aria-hidden />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-brand-navy/75">
                    Workflow
                  </span>
                  <span className="max-w-full truncate rounded-none border border-brand-navy/15 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-brand-navy shadow-[inset_0_1px_0_rgb(255_255_255_/_0.75)]">
                    {phase}
                  </span>
                </span>
              </span>
              <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-none border border-brand-navy/15 bg-slate-50 text-brand-navy transition-colors group-hover:border-brand-navy/25 group-hover:bg-white">
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </span>
            </>
          ) : (
            <>
              <span className="flex min-w-0 items-center gap-1 truncate">
                <GitBranch className="size-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Workflow</span>
                <span className="truncate font-normal text-muted-foreground">· {phase}</span>
              </span>
              <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Move phase
        </DropdownMenuLabel>
        {canRevertToEstimate ? (
          <DropdownMenuItem
            disabled={pending || column === "estimates"}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "estimates"),
                "Moved to estimate",
              )
            }
          >
            <RotateCcw className="size-4" />
            Move to estimate
          </DropdownMenuItem>
        ) : null}
        {canStartWork ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => setAuthorizeOpen(true)}
          >
            <CheckCircle2 className="size-4" />
            Approve & start work
          </DropdownMenuItem>
        ) : null}
        {canComplete ? (
          <DropdownMenuItem
            disabled={pending || column === "completed"}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "completed"),
                "Marked complete",
              )
            }
          >
            <CheckCircle2 className="size-4" />
            Mark complete
          </DropdownMenuItem>
        ) : null}
        {canStartWork && column !== "workInProgress" ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(
                () => moveRepairOrderToCoreColumn(roId, "workInProgress"),
                "Moved to work in progress",
              )
            }
          >
            <Wrench className="size-4" />
            Move to work in progress
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Open tab
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}`}>
            <ClipboardList className="size-4" />
            Overview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}/estimate`}>
            <Receipt className="size-4" />
            Estimate
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/repair-orders/${roId}/work-in-progress`}>
            <Wrench className="size-4" />
            Work in progress
          </Link>
        </DropdownMenuItem>
        {canCollectPayment ? (
          <DropdownMenuItem asChild>
            <Link href={roEstimateActionHref(roId, "payment")}>
              <Receipt className="size-4" />
              Payment & invoice
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/workflow?ro=${roId}`}>
            <LayoutGrid className="size-4" />
            View on job board
          </Link>
        </DropdownMenuItem>
        {canArchive ? (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              run(() => archiveRepairOrder(roId), "Repair order archived")
            }
            className="font-medium text-emerald-800 focus:text-emerald-800"
          >
            <Archive className="size-4" />
            Archive RO
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
    <AuthorizeEstimateDialog
      open={authorizeOpen}
      onOpenChange={setAuthorizeOpen}
      roId={roId}
      roNumber={roNumber}
      customerName={customerName}
      phone={phone}
    />
    </>
  );
}
